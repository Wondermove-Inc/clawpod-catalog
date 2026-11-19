// Fill every reasoning model's thinking profile: the offered levels
// (compat.thinkingLevels, low to high) and the level a new session starts at
// (compat.defaultThinkingLevel). Field names and level spellings are OpenClaw's
// (src/auto-reply/thinking.shared.ts), so the Agent can read them as they are.
//
// Each value comes from the first source that has it:
//   1. supplement `thinking` rules (reviewed against official docs); the first match wins,
//      so list provider-specific rules before `*` rules
//   2. values the upstream OpenClaw row already states
//   3. OpenRouter's reasoning metadata: the OpenRouter model with the same ID,
//      otherwise (off the openrouter provider) the one with the same normalized ID
//   4. models.dev reasoning_options for this provider/model (levels only)
// Anything still missing stays empty and shows up in thinkingCoverage().

export const THINKING_LEVELS = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "adaptive",
  "max",
  "ultra",
];
const RANK = new Map(THINKING_LEVELS.map((level, index) => [level, index]));
// OpenRouter documents a null effort list as "every gateway effort".
const OPENROUTER_ALL_EFFORTS = ["minimal", "low", "medium", "high", "xhigh", "max"];
// OpenClaw reads a binary "on" switch as `low` and labels it "on".
const BINARY_LABELS = { low: "on" };

function ladder(levels) {
  const known = [...new Set(levels.map((level) => (level === "none" ? "off" : level)))].filter(
    (level) => RANK.has(level),
  );
  return known.length ? known.sort((a, b) => RANK.get(a) - RANK.get(b)) : undefined;
}

function fromOpenRouter(reasoning) {
  if (!reasoning || typeof reasoning.mandatory !== "boolean") return undefined;
  const raw = reasoning.supported_efforts;
  const efforts = raw === null ? OPENROUTER_ALL_EFFORTS : Array.isArray(raw) ? raw : undefined;
  if (!efforts?.length) {
    // On/off switch without an effort selector.
    const levels = reasoning.mandatory ? ["low"] : ["off", "low"];
    const enabled = reasoning.mandatory || reasoning.default_enabled;
    return {
      levels,
      labels: BINARY_LABELS,
      default:
        enabled === true ? "low" : reasoning.default_enabled === false ? "off" : undefined,
    };
  }
  const levels = ladder(
    reasoning.mandatory ? efforts.filter((e) => e !== "none") : ["off", ...efforts],
  );
  const effort = ladder([reasoning.default_effort ?? ""])?.[0];
  return {
    levels,
    default: reasoning.mandatory || reasoning.default_enabled !== false ? effort : "off",
  };
}

function fromModelsDev(options) {
  if (!Array.isArray(options) || !options.length) return undefined;
  const effort = options.find((option) => option.type === "effort");
  const toggle = options.some((option) => option.type === "toggle");
  if (effort?.values?.length) {
    return { levels: ladder(toggle ? ["off", ...effort.values] : effort.values) };
  }
  // Budget-only rows have no level ladder to offer.
  return toggle ? { levels: ["off", "low"], labels: BINARY_LABELS } : undefined;
}

// "anthropic/claude-opus-5.5", "us.anthropic.claude-opus-5-5" and "claude-opus-5-5"
// all reduce to "claude-opus-5-5".
export function modelKey(id) {
  return id
    .toLowerCase()
    .replace(/^[^/]*\//, "")
    .replace(/:.*$/, "")
    .replace(/@.*$/, "")
    .replace(/^(global|us|eu|jp|au|apac|in|ca)\./, "")
    .replace(/^[a-z0-9-]+\.(?=[a-z])/, "")
    .replace(/-v\d+$/, "")
    .replace(/[._]/g, "-");
}

function indexOpenRouter(rows = []) {
  const byId = new Map();
  const byKey = new Map();
  for (const row of rows) {
    if (!row?.id || !row.reasoning) continue;
    byId.set(row.id, row.reasoning);
    // Variants (:free, :batch) and ~aliases share a base model; only base IDs are borrowed.
    if (row.id.includes(":") || row.id.startsWith("~")) continue;
    const key = modelKey(row.id);
    byKey.set(key, byKey.has(key) ? null : row.reasoning);
  }
  return { byId, byKey };
}

// A `*` provider rule names the model by its modelKey(), so one rule covers the same
// model on every gateway ("claude-opus-5-5" matches "anthropic/claude-opus-5.5").
function ruleMatches(rule, provider, id) {
  if (rule.provider !== "*" && rule.provider !== provider) return false;
  const target = rule.provider === "*" ? modelKey(id) : id;
  return rule.model.endsWith("*")
    ? target.startsWith(rule.model.slice(0, -1))
    : target === rule.model;
}

/**
 * Returns a copy of `providers` where reasoning rows carry compat.thinkingLevels and
 * compat.defaultThinkingLevel whenever a source provides them.
 */
export function applyThinking(providers, { rules = [], openRouter = [], modelsDev = {} } = {}) {
  const result = structuredClone(providers);
  const router = indexOpenRouter(openRouter);
  for (const [provider, entry] of Object.entries(result)) {
    for (const model of entry.models) {
      if (model.reasoning !== true) continue;
      const rule = rules.find((r) => ruleMatches(r, provider, model.id));
      // Identical OpenRouter IDs (gateways often reuse them) beat a normalized-ID match.
      const routerReasoning =
        router.byId.get(model.id) ??
        (provider === "openrouter" ? undefined : router.byKey.get(modelKey(model.id)) ?? undefined);
      const candidates = [
        rule && { levels: rule.levels, default: rule.default, labels: rule.labels },
        { levels: model.compat?.thinkingLevels, default: model.compat?.defaultThinkingLevel },
        fromOpenRouter(routerReasoning),
        fromModelsDev(modelsDev[provider]?.models?.[model.id]?.reasoning_options),
      ].filter(Boolean);
      const picked = candidates.find((c) => c.levels?.length);
      let levels = picked?.levels;
      // The upstream map marks levels the route cannot take with null.
      if (levels && model.thinkingLevelMap) {
        levels = levels.filter((level) => model.thinkingLevelMap[level] !== null);
      }
      if (!levels?.length) continue;
      const withDefault = candidates.find((c) => c.default && levels.includes(c.default));
      model.compat = {
        ...model.compat,
        thinkingLevels: levels,
        ...(withDefault ? { defaultThinkingLevel: withDefault.default } : {}),
        ...(picked.labels && !model.compat?.thinkingLevelLabels
          ? { thinkingLevelLabels: picked.labels }
          : {}),
      };
      // A stated default outside the chosen ladder is a source conflict, not a value.
      if (!withDefault) delete model.compat.defaultThinkingLevel;
    }
  }
  return result;
}

/** Active reasoning rows still missing levels or a default, for publish logs and tests. */
export function thinkingCoverage(bundle) {
  const missing = [];
  let total = 0;
  for (const [provider, entry] of Object.entries(bundle.providers)) {
    for (const model of entry.models) {
      if (model.reasoning !== true || model.status) continue;
      total++;
      const levels = model.compat?.thinkingLevels;
      const defaultLevel = model.compat?.defaultThinkingLevel;
      if (!levels?.length || !levels.includes(defaultLevel)) missing.push(`${provider}/${model.id}`);
    }
  }
  return { total, complete: total - missing.length, missing };
}
