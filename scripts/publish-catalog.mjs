// Publish job: mirror the upstream OpenClaw model catalog into models/v1/catalog.json.
//
// Pipeline (see README): fetch -> zod validation -> strip baseUrl/headers ->
// drop pricing -> rewrite minVersion (source preserved as sourceMinVersion) ->
// diff against the published bundle -> emit gate decision for the workflow.
//
// Standalone by design: this repo is the firewall between upstream and the
// agents, so the job must not depend on the agent repo being reachable.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const DEFAULT_CATALOG_URL = "https://catalog.openclaw.ai/models/v1/catalog.json";
const MAX_CATALOG_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30_000;
// generatedAt more than this far in the future means a broken upstream clock
// or a tampered bundle; refuse to publish it.
const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000;
// Review gate: a swing this large (or any provider disappearing) is unusual
// enough that a human should look at the diff before agents consume it.
const REVIEW_MODEL_DELTA_THRESHOLD = 50;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(rootDir, "models", "v1", "catalog.json");
const minVersionPath = path.join(rootDir, "MIN_VERSION");

const costSchema = z
  .object({
    input: z.number().finite().nonnegative(),
    output: z.number().finite().nonnegative(),
    cacheRead: z.number().finite().nonnegative().optional(),
    cacheWrite: z.number().finite().nonnegative().optional(),
  })
  .loose();

const modelSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().optional(),
    api: z.string().optional(),
    input: z.array(z.string()).optional(),
    reasoning: z.boolean().optional(),
    contextWindow: z.number().finite().positive().optional(),
    contextTokens: z.number().int().positive().optional(),
    maxTokens: z.number().finite().positive().optional(),
    cost: costSchema.optional(),
  })
  .loose();

const providerSchema = z
  .object({
    api: z.string().optional(),
    models: z.array(modelSchema),
  })
  .loose();

const bundleSchema = z
  .object({
    schemaVersion: z.literal(1).optional(),
    generatedAt: z.number().int().positive(),
    minVersion: z.string().optional(),
    pricing: z.unknown().optional(),
    providers: z.record(z.string(), providerSchema),
  })
  .loose();

function fail(message) {
  console.error(`publish-catalog: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  let dryRun = false;
  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    fail(`unknown argument: ${arg}`);
  }
  return { dryRun };
}

async function fetchCatalog(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    fail(`catalog request failed: HTTP ${response.status}`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (body.byteLength > MAX_CATALOG_BYTES) {
    fail(`catalog exceeds ${MAX_CATALOG_BYTES} bytes (${body.byteLength})`);
  }
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    fail("catalog is not valid JSON");
  }
}

// The upstream bundle intentionally carries no transport fields; agents also
// sanitize on their side. Stripping here keeps the published artifact inert
// even if upstream (or a compromised upstream) starts including them.
function stripTransportKeys(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stripTransportKeys(item));
  }
  if (value && typeof value === "object") {
    const next = {};
    for (const [key, entry] of Object.entries(value)) {
      if (key === "baseUrl" || key === "headers") {
        continue;
      }
      next[key] = stripTransportKeys(entry);
    }
    return next;
  }
  return value;
}

function countModels(bundle) {
  return Object.values(bundle.providers ?? {}).reduce(
    (total, provider) => total + (provider.models?.length ?? 0),
    0,
  );
}

function readJsonIfExists(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeOutput(name, value) {
  const target = process.env.GITHUB_OUTPUT;
  if (!target) {
    return;
  }
  fs.appendFileSync(target, `${name}=${value}\n`);
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));
  const minVersion = fs.readFileSync(minVersionPath, "utf8").trim();
  if (!minVersion) {
    fail("MIN_VERSION file is empty");
  }

  const fetched = await fetchCatalog(DEFAULT_CATALOG_URL);
  const parsed = bundleSchema.safeParse(fetched);
  if (!parsed.success) {
    fail(`catalog failed validation: ${parsed.error.issues[0]?.path?.join(".")}: ${parsed.error.issues[0]?.message}`);
  }
  const bundle = parsed.data;

  for (const required of ["anthropic", "openai"]) {
    if (!Object.hasOwn(bundle.providers, required)) {
      fail(`catalog is missing the ${required} provider — refusing a truncated document`);
    }
  }
  if (bundle.generatedAt > Date.now() + MAX_FUTURE_SKEW_MS) {
    fail(`catalog generatedAt is more than 24h in the future (${bundle.generatedAt})`);
  }

  const previous = readJsonIfExists(outputPath);
  if (previous?.generatedAt && bundle.generatedAt < previous.generatedAt) {
    console.log(
      `upstream generatedAt ${bundle.generatedAt} is older than published ${previous.generatedAt}; nothing to do`,
    );
    writeOutput("changed", "false");
    return;
  }

  const { pricing: _pricing, ...rest } = stripTransportKeys(bundle);
  const next = {
    ...rest,
    minVersion,
    ...(bundle.minVersion ? { sourceMinVersion: bundle.minVersion } : {}),
  };
  const contents = `${JSON.stringify(next, null, 2)}\n`;

  const current = (() => {
    try {
      return fs.readFileSync(outputPath, "utf8");
    } catch {
      return "";
    }
  })();
  if (current === contents) {
    console.log("published catalog is already current; nothing to do");
    writeOutput("changed", "false");
    return;
  }

  const previousProviders = new Set(Object.keys(previous?.providers ?? {}));
  const nextProviders = new Set(Object.keys(next.providers ?? {}));
  const addedProviders = [...nextProviders].filter((id) => !previousProviders.has(id));
  const removedProviders = [...previousProviders].filter((id) => !nextProviders.has(id));
  const previousModels = previous ? countModels(previous) : 0;
  const nextModels = countModels(next);
  const modelDelta = nextModels - previousModels;
  const needsReview =
    removedProviders.length > 0 || Math.abs(modelDelta) > REVIEW_MODEL_DELTA_THRESHOLD;

  // Upstream-derived strings feed a commit message via the workflow; keep the
  // summary to a safe charset so it can never smuggle shell or YAML syntax.
  const safe = (value) => String(value).replace(/[^\w.+\-]/g, "_");
  const summary = [
    `providers=${nextProviders.size} (+${addedProviders.length}/-${removedProviders.length})`,
    `models=${previousModels}->${nextModels} (${modelDelta >= 0 ? "+" : ""}${modelDelta})`,
    `generatedAt=${previous?.generatedAt ?? "(none)"}->${bundle.generatedAt}`,
    `minVersion=${safe(bundle.minVersion ?? "(none)")}->${safe(minVersion)}`,
    `sourceCommit=${safe(next.sourceCommit ?? "(none)")}`,
  ].join(" ");
  console.log(summary);
  if (addedProviders.length > 0) {
    console.log(`added providers: ${addedProviders.join(", ")}`);
  }
  if (removedProviders.length > 0) {
    console.log(`removed providers: ${removedProviders.join(", ")}`);
  }

  if (dryRun) {
    console.log("dry-run: not writing models/v1/catalog.json");
  } else {
    fs.writeFileSync(outputPath, contents);
  }
  writeOutput("changed", "true");
  writeOutput("needs_review", needsReview ? "true" : "false");
  writeOutput("summary", summary);
}

await main();
