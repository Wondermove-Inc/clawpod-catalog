// OpenRouter's public model list (https://openrouter.ai/api/v1/models) is the official
// source for the openrouter provider. CI saves the raw response next to the generated
// OpenClaw catalog; the publisher converts it here and treats it like upstream data.
// Conversion follows OpenClaw's live OpenRouter discovery
// (extensions/openrouter/provider-catalog.ts) so both sides read the API the same way.
import { z } from "zod";

export const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
export const OPENROUTER_API = "openai-completions";
export const MAX_OPENROUTER_BYTES = 16 * 1024 * 1024;
// A healthy response lists hundreds of models; far fewer means a partial or broken
// response, which would otherwise silently drop most of the provider.
export const MIN_OPENROUTER_MODELS = 100;
const DEFAULT_MAX_TOKENS = 8192;
const FETCH_TIMEOUT_MS = 30_000;

const positiveInt = z.number().int().positive();
const responseSchema = z.object({
  data: z.array(z.object({ id: z.string().trim().min(1) }).loose()),
});

function positive(value) {
  return positiveInt.safeParse(value).success ? value : undefined;
}

function modalities(architecture, key) {
  const list = architecture?.[key];
  return Array.isArray(list) ? list.filter((entry) => typeof entry === "string") : [];
}

// Per-token decimal strings -> USD per million tokens. A missing or negative input or
// output price (OpenRouter uses -1 for routers whose price depends on the routed model)
// means "unknown", so the whole cost is omitted rather than published as 0.
function convertCost(pricing) {
  const perMillion = (value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const number = Number(value);
    if (!Number.isFinite(number)) return undefined;
    return Math.round(number * 1e6 * 1e8) / 1e8;
  };
  const cost = {
    input: perMillion(pricing?.prompt),
    output: perMillion(pricing?.completion),
    cacheRead: perMillion(pricing?.input_cache_read),
    cacheWrite: perMillion(pricing?.input_cache_write),
  };
  if (cost.input === undefined || cost.output === undefined) return undefined;
  if (Object.values(cost).some((value) => value !== undefined && value < 0)) return undefined;
  return Object.fromEntries(Object.entries(cost).filter(([, value]) => value !== undefined));
}

function convertModel(row) {
  const output = modalities(row.architecture, "output_modalities");
  if (output.length && !output.includes("text")) return undefined;
  const params = Array.isArray(row.supported_parameters) ? row.supported_parameters : [];
  const contextWindow = positive(row.top_provider?.context_length) ?? positive(row.context_length);
  // Without a context length the row cannot be planned against; skip it.
  if (!contextWindow) return undefined;
  const cost = convertCost(row.pricing);
  return {
    id: row.id.trim(),
    name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : row.id.trim(),
    input: modalities(row.architecture, "input_modalities").includes("image")
      ? ["text", "image"]
      : ["text"],
    reasoning: params.includes("reasoning") || params.includes("include_reasoning"),
    contextWindow,
    maxTokens:
      positive(row.top_provider?.max_completion_tokens) ??
      positive(row.max_completion_tokens) ??
      DEFAULT_MAX_TOKENS,
    ...(cost ? { cost } : {}),
  };
}

export function parseOpenRouterResponse(body) {
  if (body.byteLength > MAX_OPENROUTER_BYTES) {
    throw new Error(`OpenRouter response exceeds ${MAX_OPENROUTER_BYTES} bytes (${body.byteLength})`);
  }
  return JSON.parse(body.toString("utf8"));
}

export function convertOpenRouterModels(response) {
  const { data } = responseSchema.parse(response);
  const seen = new Set();
  const models = [];
  for (const row of data) {
    const model = convertModel(row);
    if (!model || seen.has(model.id)) continue;
    seen.add(model.id);
    models.push(model);
  }
  if (models.length < MIN_OPENROUTER_MODELS) {
    throw new Error(
      `OpenRouter returned ${models.length} usable models (< ${MIN_OPENROUTER_MODELS}); refusing a partial list`,
    );
  }
  models.sort((a, b) => a.id.localeCompare(b.id));
  return { api: OPENROUTER_API, models };
}

// OpenRouter rows act as upstream data: they replace same-ID rows an upstream bundle
// may already carry and are added before the supplement is merged, so the hand-kept
// supplement only contributes IDs the API does not list (the Agent's `auto` alias).
export function withOpenRouter(upstream, provider) {
  const existing = upstream.providers?.openrouter;
  if (existing?.api && existing.api !== provider.api) {
    throw new Error(`provider API conflict: openrouter (${existing.api} != ${provider.api})`);
  }
  const apiIds = new Set(provider.models.map((model) => model.id));
  const kept = (existing?.models ?? []).filter((model) => !apiIds.has(model.id));
  return {
    ...upstream,
    providers: {
      ...upstream.providers,
      openrouter: { ...existing, api: provider.api, models: [...kept, ...provider.models] },
    },
  };
}

export async function fetchOpenRouterModels(fetchImpl = fetch) {
  const response = await fetchImpl(OPENROUTER_MODELS_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`OpenRouter request failed: HTTP ${response.status}`);
  const body = Buffer.from(await response.arrayBuffer());
  const parsed = parseOpenRouterResponse(body);
  // Validate before saving so a broken response fails the fetch step, not publishing.
  convertOpenRouterModels(parsed);
  return body;
}
