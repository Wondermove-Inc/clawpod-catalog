// Publish a locally generated OpenClaw catalog plus OpenRouter's public model list and
// this repository's manually maintained models. Both input files are produced in CI
// (see .github/workflows/publish.yml): the source file by OpenClaw's
// scripts/publish-model-catalog.mts, the OpenRouter file by scripts/fetch-openrouter.mjs.
// This command itself does not use the network and has no dependency on clawpod-agent
// or provider credentials.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalog, countModels, MAX_CATALOG_BYTES, serializeCatalog } from "./catalog.mjs";
import { convertOpenRouterModels, parseOpenRouterResponse, withOpenRouter } from "./openrouter.mjs";

const LARGE_MODEL_DELTA_NOTICE = 50;
const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  let dryRun = false;
  let sourceFile;
  let openRouterFile;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") {
      dryRun = true;
    } else if (argv[i] === "--source-file" && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      if (sourceFile) throw new Error("--source-file may only be specified once");
      sourceFile = argv[++i];
    } else if (argv[i] === "--openrouter-file" && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      if (openRouterFile) throw new Error("--openrouter-file may only be specified once");
      openRouterFile = argv[++i];
    } else {
      throw new Error(`unknown or incomplete argument: ${argv[i]}`);
    }
  }
  if (!sourceFile) throw new Error("missing required argument: --source-file <generated catalog>");
  // Required so a forgotten flag cannot publish the openrouter provider without its models.
  if (!openRouterFile) {
    throw new Error("missing required argument: --openrouter-file <OpenRouter /api/v1/models response>");
  }
  return { dryRun, sourceFile, openRouterFile };
}

function parseSource(body) {
  if (body.byteLength > MAX_CATALOG_BYTES) {
    throw new Error(`catalog exceeds ${MAX_CATALOG_BYTES} bytes (${body.byteLength})`);
  }
  return JSON.parse(body.toString("utf8"));
}

function readPrevious(filePath) {
  try {
    const contents = fs.readFileSync(filePath, "utf8");
    return { contents, bundle: JSON.parse(contents) };
  } catch (error) {
    if (error.code === "ENOENT") return { contents: "", bundle: undefined };
    // A corrupt previous file must not silently disable the rollback guard.
    throw error;
  }
}

function writeOutput(target, name, value) {
  if (target) fs.appendFileSync(target, `${name}=${value}\n`);
}

export async function publishCatalog({
  rootDir = defaultRoot,
  argv = [],
  now = Date.now(),
  log = console.log,
  githubOutput = process.env.GITHUB_OUTPUT,
} = {}) {
  const { dryRun, sourceFile, openRouterFile } = parseArgs(argv);
  const outputPath = path.join(rootDir, "models", "v1", "catalog.json");
  const minVersion = fs.readFileSync(path.join(rootDir, "MIN_VERSION"), "utf8").trim();
  const supplement = JSON.parse(
    fs.readFileSync(path.join(rootDir, "sources", "clawpod-providers.json"), "utf8"),
  );
  const openRouter = convertOpenRouterModels(
    parseOpenRouterResponse(fs.readFileSync(path.resolve(openRouterFile))),
  );
  const upstream = withOpenRouter(
    parseSource(fs.readFileSync(path.resolve(sourceFile))),
    openRouter,
  );
  const previous = readPrevious(outputPath);
  const next = buildCatalog({ upstream, supplement, previous: previous.bundle, minVersion, now });
  if (!next) {
    log("upstream generatedAt is older than the last accepted upstream; nothing to do");
    writeOutput(githubOutput, "changed", "false");
    return { changed: false, reason: "stale-upstream" };
  }
  const contents = serializeCatalog(next);
  if (contents === previous.contents) {
    log("published catalog is already current; nothing to do");
    writeOutput(githubOutput, "changed", "false");
    return { changed: false, reason: "unchanged" };
  }
  const previousProviders = new Set(Object.keys(previous.bundle?.providers ?? {}));
  const nextProviders = new Set(Object.keys(next.providers));
  const addedProviders = [...nextProviders].filter((id) => !previousProviders.has(id));
  const removedProviders = [...previousProviders].filter((id) => !nextProviders.has(id));
  const previousModels = countModels(previous.bundle);
  const nextModels = countModels(next);
  const modelDelta = nextModels - previousModels;
  const safe = (value) => String(value).replace(/[^\w.+\-]/g, "_");
  const summary = [
    `providers=${nextProviders.size} (+${addedProviders.length}/-${removedProviders.length})`,
    `models=${previousModels}->${nextModels} (${modelDelta >= 0 ? "+" : ""}${modelDelta})`,
    `generatedAt=${previous.bundle?.generatedAt ?? "(none)"}->${next.generatedAt}`,
    `sourceGeneratedAt=${next.sourceGeneratedAt}`,
    `minVersion=${safe(upstream.minVersion ?? "(none)")}->${safe(minVersion)}`,
    `sourceCommit=${safe(next.sourceCommit ?? "(none)")}`,
    `supplement=${next.supplementDigest.slice(0, 12)}`,
  ].join(" ");
  log(summary);
  if (addedProviders.length) log(`added providers: ${addedProviders.join(", ")}`);
  if (removedProviders.length) log(`removed providers: ${removedProviders.join(", ")}`);
  if (removedProviders.length || Math.abs(modelDelta) > LARGE_MODEL_DELTA_NOTICE) {
    log(
      "notice: unusually large change (provider removal or model-count swing) — published anyway; compare the commit if this was unexpected",
    );
  }
  if (dryRun) {
    log("dry-run: not writing models/v1/catalog.json");
  } else {
    const tempPath = `${outputPath}.${process.pid}.tmp`;
    try {
      fs.writeFileSync(tempPath, contents);
      fs.renameSync(tempPath, outputPath);
    } finally {
      fs.rmSync(tempPath, { force: true });
    }
  }
  writeOutput(githubOutput, "changed", "true");
  writeOutput(githubOutput, "summary", summary);
  return { changed: true, dryRun, summary };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await publishCatalog({ argv: process.argv.slice(2) });
  } catch (error) {
    console.error(`publish-catalog: ${error.message}`);
    process.exitCode = 1;
  }
}
