import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";

export const MAX_CATALOG_BYTES = 8 * 1024 * 1024;
export const MAX_PUBLISHED_BYTES = 4 * 1024 * 1024;
const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000;
const nonempty = z.string().trim().min(1);
const supplementalApi = z.enum([
  "openai-completions",
  "openai-responses",
  "openai-codex-responses",
  "anthropic-messages",
  "google-generative-ai",
  "google-vertex",
  "bedrock-converse-stream",
]);
const timestamp = z.number().int().positive();
const costFields = {
  input: z.number().finite().nonnegative(),
  output: z.number().finite().nonnegative(),
  cacheRead: z.number().finite().nonnegative().optional(),
  cacheWrite: z.number().finite().nonnegative().optional(),
};
const modelFields = {
  id: nonempty,
  name: nonempty.optional(),
  api: nonempty.optional(),
  input: z.array(z.string()).optional(),
  reasoning: z.boolean().optional(),
  contextWindow: z.number().finite().positive().optional(),
  contextTokens: z.number().int().positive().optional(),
  maxTokens: z.number().finite().positive().optional(),
  cost: z.object(costFields).loose().optional(),
};
const modelSchema = z.object(modelFields).loose();
const providerSchema = z.object({ api: nonempty.optional(), models: z.array(modelSchema) }).loose();
const bundleSchema = z
  .object({
    schemaVersion: z.literal(1).optional(),
    generatedAt: timestamp,
    minVersion: nonempty.optional(),
    sourceMinVersion: nonempty.optional(),
    sourceCommit: nonempty.optional(),
    providers: z.record(nonempty, providerSchema),
  })
  .loose();

// Local, hand-maintained inputs have an allowlist: no transport or credentials.
const supplementalModelSchema = z
  .object({
    ...modelFields,
    api: supplementalApi.optional(),
    name: nonempty,
    input: z.array(z.enum(["text", "image"])).min(1),
    reasoning: z.boolean(),
    contextWindow: z.number().int().positive(),
    maxTokens: z.number().int().positive(),
    cost: z.object(costFields).strict().optional(),
    status: z.enum(["active", "deprecated", "disabled"]).optional(),
    replacedBy: nonempty.optional(),
  })
  .strict();
const supplementalProviderSchema = z
  .object({
    api: supplementalApi,
    models: z.array(supplementalModelSchema).min(1),
  })
  .strict();
export const supplementSchema = z
  .object({
    schemaVersion: z.literal(1),
    provenance: z.record(
      nonempty,
      z
        .object({
          source: nonempty,
          revision: nonempty,
          files: z.array(nonempty).min(1),
          notes: nonempty,
        })
        .strict(),
    ),
    providers: z.record(z.string().regex(/^[a-z0-9][a-z0-9-]*$/), supplementalProviderSchema),
  })
  .strict();

function checkModels(providers) {
  for (const [id, provider] of Object.entries(providers)) {
    if (!provider.models.length) throw new Error(`empty models: ${id}`);
    const seen = new Set();
    for (const model of provider.models) {
      if (seen.has(model.id)) throw new Error(`duplicate model id: ${id}/${model.id}`);
      seen.add(model.id);
    }
  }
}

export function validateSupplement(value) {
  const supplement = supplementSchema.parse(value);
  checkModels(supplement.providers);
  if (
    !isDeepStrictEqual(
      Object.keys(supplement.providers).sort(),
      Object.keys(supplement.provenance).sort(),
    )
  ) {
    throw new Error("supplement provenance must cover exactly its providers");
  }
  return supplement;
}

const forbiddenKeys = new Set(["baseUrl", "headers", "apiKey", "auth", "authHeader"]);
export function stripTransportKeys(value) {
  if (Array.isArray(value)) return value.map(stripTransportKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !forbiddenKeys.has(key))
      .map(([key, entry]) => [key, stripTransportKeys(entry)]),
  );
}

export function mergeProviders(upstream, supplemental) {
  const providers = structuredClone(upstream);
  for (const [id, local] of Object.entries(supplemental)) {
    if (!Object.hasOwn(providers, id)) {
      providers[id] = structuredClone(local);
      continue;
    }
    const remote = providers[id];
    if (remote.api && remote.api !== local.api) {
      throw new Error(`provider API conflict: ${id} (${remote.api} != ${local.api})`);
    }
    const existing = new Map(remote.models.map((model) => [model.id, model]));
    for (const model of local.models) {
      if (existing.has(model.id)) {
        const remoteModel = existing.get(model.id);
        const remoteApi = remoteModel.api ?? remote.api;
        const localApi = model.api ?? local.api;
        if (remoteApi && remoteApi !== localApi) {
          throw new Error(`model API conflict: ${id}/${model.id} (${remoteApi} != ${localApi})`);
        }
        // Preserve the entire upstream row, including deprecation and limits.
        continue;
      }
      // Give appended rows their own API if upstream has no provider-level API.
      remote.models.push({
        ...structuredClone(model),
        ...(!remote.api ? { api: model.api ?? local.api } : {}),
      });
    }
  }
  return providers;
}

function plausibleTimestamp(value, now, label) {
  timestamp.parse(value);
  if (value > now + MAX_FUTURE_SKEW_MS) throw new Error(`${label} is more than 24h in the future`);
}

export function serializeCatalog(bundle) {
  const contents = `${JSON.stringify(bundle, null, 2)}\n`;
  if (Buffer.byteLength(contents) > MAX_PUBLISHED_BYTES) {
    throw new Error(`published catalog exceeds consumer limit (${MAX_PUBLISHED_BYTES} bytes)`);
  }
  return contents;
}

// Pure transformation shared by online publishing, offline regeneration and tests.
export function buildCatalog({
  upstream,
  supplement: rawSupplement,
  previous,
  minVersion,
  now = Date.now(),
}) {
  const bundle = bundleSchema.parse(upstream);
  const supplement = validateSupplement(rawSupplement);
  nonempty.parse(minVersion);
  if (Object.hasOwn(bundle, "sourceGeneratedAt") || Object.hasOwn(bundle, "supplementDigest")) {
    throw new Error("source must be an upstream bundle, not a supplemented published catalog");
  }
  for (const id of ["anthropic", "openai"]) {
    if (!Object.hasOwn(bundle.providers, id))
      throw new Error(`catalog is missing the ${id} provider`);
  }
  plausibleTimestamp(bundle.generatedAt, now, "upstream generatedAt");
  checkModels(bundle.providers);
  if (previous !== undefined) {
    bundleSchema.parse(previous);
    checkModels(previous.providers);
    plausibleTimestamp(previous.generatedAt, now, "previous generatedAt");
    const hasSourceTime = Object.hasOwn(previous, "sourceGeneratedAt");
    const hasDigest = Object.hasOwn(previous, "supplementDigest");
    if (hasSourceTime !== hasDigest) throw new Error("incomplete previous publication metadata");
    if (hasSourceTime) {
      plausibleTimestamp(previous.sourceGeneratedAt, now, "previous sourceGeneratedAt");
      z.string()
        .regex(/^[a-f0-9]{64}$/)
        .parse(previous.supplementDigest);
    }
  }
  // Older mirrors used the upstream timestamp as generatedAt. After migration,
  // publication time must NEVER be used to reject a valid upstream refresh.
  const previousSourceAt = previous?.sourceGeneratedAt ?? previous?.generatedAt;
  if (previousSourceAt !== undefined) {
    if (bundle.generatedAt < previousSourceAt) return null;
  }
  const { pricing: _pricing, generatedAt: sourceGeneratedAt, ...rest } = stripTransportKeys(bundle);
  const candidate = {
    ...rest,
    schemaVersion: 1,
    minVersion: minVersion.trim(),
    ...(bundle.minVersion ? { sourceMinVersion: bundle.minVersion } : {}),
    providers: mergeProviders(rest.providers, supplement.providers),
    sourceGeneratedAt,
    supplementDigest: createHash("sha256").update(JSON.stringify(supplement)).digest("hex"),
  };
  const { generatedAt: previousPublishedAt, ...previousContent } = previous ?? {};
  const unchanged = isDeepStrictEqual(candidate, previousContent);
  const generatedAt = unchanged
    ? previousPublishedAt
    : Math.max(now, sourceGeneratedAt, (previousPublishedAt ?? 0) + 1);
  plausibleTimestamp(generatedAt, now, "published generatedAt");
  const next = { schemaVersion: 1, generatedAt, ...candidate };
  bundleSchema.parse(next);
  checkModels(next.providers);
  serializeCatalog(next);
  return next;
}

export function countModels(bundle) {
  return Object.values(bundle?.providers ?? {}).reduce(
    (sum, provider) => sum + provider.models.length,
    0,
  );
}
