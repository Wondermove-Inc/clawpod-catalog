// Full audit of the published catalog: structure, required model data, suspicious
// values, thinking profiles, lifecycle links and transport/credential leaks.
// Usage: node scripts/audit-catalog.mjs [models/v1/catalog.json] [--json]
//
// Each finding is classified as `known` (an intended or already-reviewed state, see
// sources/REVIEW.md) or `open` (needs a look). Only `open` findings need action.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isKnownGap, isRouterAlias, ruleMatches, THINKING_LEVELS } from "./thinking.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Subscription / plan providers: no per-token USD price exists, so cost stays omitted.
export const SUBSCRIPTION_PROVIDERS = new Set([
  "openai-codex",
  "codex",
  "minimax-portal",
  "github-copilot",
  "ollama-cloud",
  "kimi",
  "byteplus-plan",
  "volcengine-plan",
  "qwen-token-plan",
  "tencent-tokenplan",
  "stepfun-plan",
  "xiaomi-token-plan",
  "google-gemini-cli",
]);
const FORBIDDEN_KEYS = new Set(["baseUrl", "headers", "apiKey", "auth", "authHeader"]);
const INPUTS = new Set(["text", "image", "video", "document"]);
const RANK = new Map(THINKING_LEVELS.map((level, i) => [level, i]));

export function auditCatalog(catalog, supplement = {}) {
  const findings = [];
  const add = (check, ref, detail = "", known = false) => findings.push({ check, ref, detail, known });
  const overridden = (provider, id, field) =>
    (supplement.overrides ?? []).some((o) => field in o.set && ruleMatches(o, provider, id));
  const known = (check, provider, id) => isKnownGap(supplement.knownGaps, check, provider, id);
  if (catalog.schemaVersion !== 1) add("structure: schemaVersion", "root", String(catalog.schemaVersion));
  for (const key of ["generatedAt", "sourceGeneratedAt", "supplementDigest", "minVersion"]) {
    if (catalog[key] === undefined) add("structure: missing root field", key);
  }
  const walk = (value, at) => {
    if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${at}[${i}]`));
    else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        if (FORBIDDEN_KEYS.has(k)) add("security: transport/credential key", `${at}.${k}`);
        walk(v, `${at}.${k}`);
      }
    }
  };
  walk(catalog.providers, "providers");
  for (const [provider, entry] of Object.entries(catalog.providers)) {
    const ids = new Set();
    for (const key of ["defaultModel", "defaultUtilityModel"]) {
      if (entry[key] && !entry.models.some((m) => m.id === entry[key])) add(`structure: ${key} not in provider`, provider, entry[key]);
    }
    for (const m of entry.models) {
      const ref = `${provider}/${m.id}`;
      const retired = m.status === "deprecated" || m.status === "disabled";
      const router = isRouterAlias(m.id);
      if (ids.has(m.id)) add("structure: duplicate id", ref);
      ids.add(m.id);
      if (!(m.api ?? entry.api)) add("required: api", ref);
      if (m.replacedBy) {
        const target = entry.models.find((x) => x.id === m.replacedBy);
        if (!target || target.status === "deprecated" || target.status === "disabled") {
          add("lifecycle: replacedBy missing or retired", ref, `${m.replacedBy} (${target?.status ?? "missing"})`);
        }
      }
      if (retired) continue;
      if (!m.name) add("required: name", ref, "", known("model-data", provider, m.id));
      if (!Array.isArray(m.input) || !m.input.length) add("required: input", ref);
      else for (const x of m.input) if (!INPUTS.has(x)) add("value: unknown input type", ref, x);
      if (typeof m.reasoning !== "boolean") add("required: reasoning", ref, "", router || known("model-data", provider, m.id));
      if (!(m.contextWindow > 0) || !(m.maxTokens > 0)) {
        add("required: contextWindow/maxTokens", ref, "", known("model-data", provider, m.id));
      }
      if (m.contextWindow && m.maxTokens > m.contextWindow) add("value: maxTokens > contextWindow", ref, `${m.maxTokens} > ${m.contextWindow}`);
      if (!m.cost) {
        add(
          "required: cost",
          ref,
          "",
          SUBSCRIPTION_PROVIDERS.has(provider) || overridden(provider, m.id, "cost") || known("cost", provider, m.id),
        );
      } else {
        const { input, output, cacheRead, cacheWrite } = m.cost;
        if (!(input >= 0) || !(output >= 0)) add("value: cost input/output missing or negative", ref, JSON.stringify(m.cost));
        if (input === 0 && output === 0 && !/free/i.test(`${m.id} ${m.name ?? ""}`)) {
          add(
            "value: zero price",
            ref,
            "",
            SUBSCRIPTION_PROVIDERS.has(provider) || overridden(provider, m.id, "cost") || known("zero-price", provider, m.id),
          );
        }
        if (cacheRead !== undefined && input > 0 && cacheRead > input) add("value: cacheRead > input", ref, `${cacheRead} > ${input}`);
        // Claude bills cache writes; a gateway that serves cache reads but lists writes at 0
        // is a listing error (REVIEW 2026-11-19). Without cache reads there is no caching.
        if (cacheWrite === 0 && cacheRead > 0 && /claude|mythos|fable/i.test(m.id)) add("value: Claude cacheWrite 0", ref);
      }
      const lv = m.compat?.thinkingLevels;
      const def = m.compat?.defaultThinkingLevel;
      if (lv !== undefined) {
        if (!Array.isArray(lv) || !lv.length || lv.some((l) => !RANK.has(l))) add("thinking: invalid levels", ref, JSON.stringify(lv));
        else if (lv.some((l, i) => i && RANK.get(lv[i - 1]) >= RANK.get(l))) add("thinking: levels not ordered/unique", ref, lv.join(","));
        if (def !== undefined && Array.isArray(lv) && !lv.includes(def)) add("thinking: default not in levels", ref, `${def}`);
      }
      if (m.reasoning === false && (lv || def) && !m.compat?.thinkingRequired) add("thinking: profile on reasoning:false", ref);
      if (m.reasoning === true && !(lv?.length && def)) {
        add("thinking: missing levels/default", ref, "", known("thinking", provider, m.id));
      }
    }
  }
  return findings;
}

/**
 * Markdown body for the "Catalog gaps" issue and the workflow summary: the audit's open
 * findings (the to-do list), grouped by check and provider, plus the known ones folded.
 */
export function gapReport(findings, { total, complete }) {
  const open = findings.filter((f) => !f.known);
  const known = findings.filter((f) => f.known);
  const render = (list) => {
    const out = [];
    for (const [check, items] of Map.groupBy(list, (f) => f.check)) {
      out.push("", `### ${check} (${items.length})`, "");
      for (const f of items.toSorted((a, b) => a.ref.localeCompare(b.ref))) {
        out.push(`- \`${f.ref}\`${f.detail ? ` — ${f.detail}` : ""}`);
      }
    }
    return out;
  };
  const lines = [
    `**Open gaps: ${open.length}** (to fix). Known gaps: ${known.length} (intended or reviewed: subscription prices, router aliases, \`knownGaps\`, \`overrides\` with \`"cost": null\`).`,
    "",
    `Active reasoning models with thinking levels and a default: **${complete}/${total}**.`,
    "",
    "Same checks as `npm run audit`. Follow MAINTAINING.md: fix open gaps in `sources/clawpod-providers.json`",
    "(`overrides` / `thinking` / `providers`), or record a reviewed reason in `knownGaps` when no official value exists.",
  ];
  if (open.length) lines.push("", "## Open", ...render(open));
  if (known.length) lines.push("", "<details><summary>Known gaps</summary>", ...render(known), "", "</details>");
  return `${lines.join("\n")}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--")) ?? path.join(root, "models/v1/catalog.json");
  const catalog = JSON.parse(fs.readFileSync(file, "utf8"));
  const supplement = JSON.parse(fs.readFileSync(path.join(root, "sources/clawpod-providers.json"), "utf8"));
  const findings = auditCatalog(catalog, supplement);
  if (args.includes("--json")) {
    console.log(JSON.stringify(findings, null, 1));
  } else {
    const models = Object.values(catalog.providers).reduce((n, p) => n + p.models.length, 0);
    console.log(`providers ${Object.keys(catalog.providers).length}, models ${models}, size ${fs.statSync(file).size} bytes (limit 4194304)`);
    const byCheck = Map.groupBy(findings, (f) => f.check);
    for (const [check, list] of [...byCheck].sort()) {
      const open = list.filter((f) => !f.known);
      console.log(`\n${check}: ${list.length} (known ${list.length - open.length}, open ${open.length})`);
      for (const f of open.slice(0, 50)) console.log(`  ${f.ref}${f.detail ? ` — ${f.detail}` : ""}`);
      if (open.length > 50) console.log(`  … ${open.length - 50} more (use --json)`);
    }
    if (!findings.length) console.log("no findings");
  }
}
