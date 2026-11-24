import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  applyOverrides,
  buildCatalog,
  mergeProviders,
  serializeCatalog,
  stripTransportKeys,
  validateSupplement,
  MAX_PUBLISHED_BYTES,
} from "../scripts/catalog.mjs";
import { MIN_MODELS_DEV_PROVIDERS } from "../scripts/models-dev.mjs";
import { MIN_OPENROUTER_MODELS } from "../scripts/openrouter.mjs";
import { publishCatalog } from "../scripts/publish-catalog.mjs";
import { SUBSCRIPTION_PROVIDERS } from "../scripts/audit-catalog.mjs";
import { ruleMatches } from "../scripts/thinking.mjs";

const NOW = Date.UTC(2026, 8, 8);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const localModel = (id = "local-model") => ({
  id,
  name: id,
  input: ["text", "image"],
  reasoning: true,
  contextWindow: 100_000,
  maxTokens: 8_000,
  cost: { input: 1, output: 2 },
});
function fixture() {
  return {
    now: NOW,
    minVersion: "2026.4.11",
    upstream: {
      schemaVersion: 1,
      generatedAt: NOW - 1_000,
      minVersion: "2026.7.0",
      sourceCommit: "upstream-revision",
      providers: {
        anthropic: { api: "anthropic-messages", models: [localModel("claude")] },
        openai: { api: "openai-responses", models: [localModel("gpt")] },
      },
    },
    supplement: {
      schemaVersion: 1,
      provenance: {
        google: { source: "fixture", revision: "rev", files: ["catalog.ts"], notes: "static" },
      },
      providers: { google: { api: "google-generative-ai", models: [localModel()] } },
    },
  };
}

test("merge adds providers and models without mutating inputs or replacing upstream rows", () => {
  const f = fixture();
  f.upstream.providers.google = {
    api: "google-generative-ai",
    defaultModel: "local-model",
    models: [{ ...localModel(), contextWindow: 200_000, status: "deprecated" }],
  };
  f.supplement.providers.google.models.push(localModel("new-model"));
  const before = structuredClone(f);
  const next = buildCatalog(f);
  assert.deepEqual(next.providers.google.models[0], f.upstream.providers.google.models[0]);
  assert.equal(next.providers.google.models[1].id, "new-model");
  assert.equal(next.providers.google.defaultModel, "local-model");
  assert.deepEqual(next.providers.openai, f.upstream.providers.openai);
  assert.deepEqual(f, before);
  assert.equal(next.sourceCommit, "upstream-revision");
  assert.equal(next.sourceMinVersion, "2026.7.0");
});

test("initial migration separates upstream and publication times; repeat is byte-stable", () => {
  const f = fixture();
  const previous = { ...f.upstream, minVersion: f.minVersion };
  const first = buildCatalog({ ...f, previous });
  assert.equal(first.sourceGeneratedAt, f.upstream.generatedAt);
  assert.equal(first.generatedAt, NOW);
  const again = buildCatalog({ ...f, previous: first, now: NOW + 6 * 3600_000 });
  assert.equal(serializeCatalog(first), serializeCatalog(again));
});

test("local-only edits increment the publication clock even in the same millisecond", () => {
  const f = fixture();
  const first = buildCatalog(f);
  f.supplement.providers.google.models.push(localModel("added"));
  const second = buildCatalog({ ...f, previous: first });
  assert.equal(second.generatedAt, first.generatedAt + 1);
  assert.equal(second.sourceGeneratedAt, first.sourceGeneratedAt);
  assert.notEqual(second.supplementDigest, first.supplementDigest);
  f.supplement.providers.google.models = [localModel("added")];
  const third = buildCatalog({ ...f, previous: second });
  assert.deepEqual(
    third.providers.google.models.map((m) => m.id),
    ["added"],
  );
  assert.ok(third.generatedAt > second.generatedAt);
});

test("upstream refresh older than publication but newer than source is accepted", () => {
  const f = fixture();
  const first = buildCatalog(f);
  f.upstream.generatedAt += 500;
  f.upstream.providers.openai.models.push(localModel("new-upstream-model"));
  const next = buildCatalog({ ...f, previous: first });
  assert.equal(next.providers.openai.models.length, 2);
  assert.equal(next.providers.google.models.length, 1);
  assert.equal(next.sourceGeneratedAt, NOW - 500);
});

test("genuinely stale upstream cannot roll back either legacy or supplemented data", () => {
  const f = fixture();
  const first = buildCatalog(f);
  const legacy = structuredClone(f.upstream);
  f.upstream.generatedAt--;
  assert.equal(buildCatalog({ ...f, previous: first }), null);
  assert.equal(buildCatalog({ ...f, previous: legacy }), null);
});

test("same-timestamp upstream corrections are accepted; manual data never revives an upstream retired row", () => {
  const f = fixture();
  const first = buildCatalog(f);
  f.upstream.providers.google = {
    api: "google-generative-ai",
    models: [{ ...localModel(), status: "disabled" }],
  };
  const second = buildCatalog({ ...f, previous: first });
  assert.equal(second.providers.google.models[0].status, "disabled");
  assert.ok(second.generatedAt > first.generatedAt);
});

test("provider and effective model API conflicts fail closed", () => {
  const f = fixture();
  f.upstream.providers.google = { api: "openai-completions", models: [localModel()] };
  assert.throws(() => buildCatalog(f), /provider API conflict/);
  f.upstream.providers.google.api = "google-generative-ai";
  f.upstream.providers.google.models[0].api = "openai-completions";
  assert.throws(() => buildCatalog(f), /model API conflict/);
});

test("mixed model APIs survive; appended rows inherit local API without altering upstream rows", () => {
  const local = {
    mantle: { api: "openai-completions", models: [{ ...localModel(), api: "anthropic-messages" }] },
  };
  const next = mergeProviders({}, local);
  assert.equal(next.mantle.models[0].api, "anthropic-messages");
  const remote = {
    google: { models: [{ ...localModel("existing"), api: "google-generative-ai" }] },
  };
  const merged = mergeProviders(remote, fixture().supplement.providers);
  assert.equal(merged.google.models[1].api, "google-generative-ai");
  assert.equal(merged.google.api, undefined);
  assert.deepEqual(merged.google.models[0], remote.google.models[0]);
});

test("transport and auth fields are recursively removed, model costs retained", () => {
  const f = fixture();
  f.upstream.pricing = { large: true };
  f.upstream.providers.openai.baseUrl = "https://example.invalid";
  f.upstream.providers.openai.models[0].compat = {
    nested: [
      {
        headers: { Authorization: "not-a-real-token" },
        apiKey: "fake",
        auth: "token",
        authHeader: true,
        valid: true,
      },
    ],
  };
  const next = buildCatalog(f);
  assert.equal(next.pricing, undefined);
  assert.equal(next.providers.openai.baseUrl, undefined);
  assert.deepEqual(next.providers.openai.models[0].compat, { nested: [{ valid: true }] });
  assert.deepEqual(next.providers.openai.models[0].cost, { input: 1, output: 2 });
  const tricky = JSON.parse('{"__proto__":{"headers":{}},"constructor":{"apiKey":"fake"}}');
  const stripped = stripTransportKeys(tricky);
  assert.ok(Object.hasOwn(stripped, "__proto__"));
  assert.deepEqual(stripped.__proto__, {});
  assert.equal({}.apiKey, undefined);
});

for (const [label, mutate, pattern] of [
  [
    "missing required provider",
    (f) => {
      delete f.upstream.providers.openai;
    },
    /missing the openai/,
  ],
  [
    "empty upstream models",
    (f) => {
      f.upstream.providers.openai.models = [];
    },
    /empty models/,
  ],
  [
    "duplicate upstream models",
    (f) => {
      f.upstream.providers.openai.models.push(localModel(" gpt "));
    },
    /duplicate model/,
  ],
  [
    "duplicate local models",
    (f) => {
      f.supplement.providers.google.models.push(localModel());
    },
    /duplicate model/,
  ],
  [
    "future source timestamp",
    (f) => {
      f.upstream.generatedAt = NOW + 25 * 3600_000;
    },
    /future/,
  ],
  [
    "invalid schema version",
    (f) => {
      f.upstream.schemaVersion = 2;
    },
    /Invalid/,
  ],
  [
    "blank source commit",
    (f) => {
      f.upstream.sourceCommit = " ";
    },
    /small/,
  ],
  [
    "negative model price",
    (f) => {
      f.supplement.providers.google.models[0].cost.input = -1;
    },
    /small/,
  ],
  [
    "zero context window",
    (f) => {
      f.supplement.providers.google.models[0].contextWindow = 0;
    },
    /small/,
  ],
  [
    "empty local catalog",
    (f) => {
      f.supplement.providers.google.models = [];
    },
    /small/,
  ],
  [
    "local transport injection",
    (f) => {
      f.supplement.providers.google.baseUrl = "https://example.invalid";
    },
    /Unrecognized/,
  ],
  [
    "local nested credential",
    (f) => {
      f.supplement.providers.google.models[0].cost.apiKey = "fake";
    },
    /Unrecognized/,
  ],
  [
    "unknown local API",
    (f) => {
      f.supplement.providers.google.api = "typo";
    },
    /Invalid/,
  ],
  [
    "missing provenance",
    (f) => {
      delete f.supplement.provenance.google;
    },
    /provenance/,
  ],
]) {
  test(`rejects ${label}`, () => {
    const f = fixture();
    mutate(f);
    assert.throws(() => buildCatalog(f), pattern);
  });
}

test("missing ingress schemaVersion is normalized to consumer-required version 1", () => {
  const f = fixture();
  delete f.upstream.schemaVersion;
  assert.equal(buildCatalog(f).schemaVersion, 1);
});

test("published output is not accepted as a new upstream source", () => {
  const f = fixture();
  assert.throws(() => buildCatalog({ ...f, upstream: buildCatalog(f) }), /not a supplemented/);
});

test("final serialized artifact respects the consumer's 4 MiB limit", () => {
  const f = fixture();
  f.upstream.padding = "x".repeat(MAX_PUBLISHED_BYTES);
  assert.throws(() => buildCatalog(f), /consumer limit/);
});

test("removing a local provider removes it on regeneration, but keeps independent upstream data", () => {
  const f = fixture();
  const first = buildCatalog(f);
  f.supplement = { schemaVersion: 1, provenance: {}, providers: {} };
  const next = buildCatalog({ ...f, previous: first });
  assert.equal(next.providers.google, undefined);
  assert.deepEqual(next.providers.openai, first.providers.openai);
});

function workspace(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clawpod-catalog-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, "models/v1"), { recursive: true });
  fs.mkdirSync(path.join(dir, "sources"));
  const f = fixture();
  fs.writeFileSync(path.join(dir, "MIN_VERSION"), f.minVersion);
  fs.writeFileSync(path.join(dir, "sources/clawpod-providers.json"), JSON.stringify(f.supplement));
  const source = path.join(dir, "upstream.json");
  fs.writeFileSync(source, JSON.stringify(f.upstream));
  const openRouter = path.join(dir, "openrouter.json");
  fs.writeFileSync(openRouter, JSON.stringify(openRouterResponse()));
  const modelsDev = path.join(dir, "models-dev.json");
  fs.writeFileSync(modelsDev, JSON.stringify(modelsDevResponse()));
  const inputs = [
    "--source-file",
    source,
    "--openrouter-file",
    openRouter,
    "--modelsdev-file",
    modelsDev,
  ];
  return {
    dir,
    source,
    openRouter,
    modelsDev,
    inputs,
    output: path.join(dir, "models/v1/catalog.json"),
    f,
  };
}

function modelsDevResponse(count = MIN_MODELS_DEV_PROVIDERS) {
  return Object.fromEntries(Array.from({ length: count }, (_, i) => [`p${i}`, { models: {} }]));
}

function openRouterResponse(count = MIN_OPENROUTER_MODELS) {
  return {
    data: Array.from({ length: count }, (_, i) => ({
      id: `vendor/model-${i}`,
      name: `Model ${i}`,
      context_length: 128_000,
      architecture: { input_modalities: ["text"], output_modalities: ["text"] },
      pricing: { prompt: "0.000001", completion: "0.000002" },
      top_provider: { context_length: 128_000, max_completion_tokens: 16_384 },
      supported_parameters: ["tools"],
    })),
  };
}

test("offline CLI dry-run, write, repeat, and source-only changes obey persistence and outputs", async (t) => {
  const { dir, inputs, output, f } = workspace(t);
  const githubOutput = path.join(dir, "github-output");
  const options = {
    rootDir: dir,
    argv: inputs,
    now: NOW,
    log: () => {},
    githubOutput,
  };
  const report = path.join(dir, "report.md");
  const dry = await publishCatalog({
    ...options,
    argv: [...options.argv, "--dry-run", "--report-file", report],
  });
  assert.equal(dry.changed, true);
  assert.equal(fs.existsSync(output), false);
  assert.match(fs.readFileSync(report, "utf8"), /thinking levels and a default/);
  await publishCatalog(options);
  const first = fs.readFileSync(output, "utf8");
  assert.equal((await publishCatalog({ ...options, now: NOW + 3600_000 })).changed, false);
  assert.equal(fs.readFileSync(output, "utf8"), first);
  f.supplement.providers.google.models.push(localModel("second"));
  fs.writeFileSync(path.join(dir, "sources/clawpod-providers.json"), JSON.stringify(f.supplement));
  await publishCatalog({ ...options, argv: [...options.argv, "--dry-run"] });
  assert.equal(fs.readFileSync(output, "utf8"), first);
  await publishCatalog(options);
  assert.equal(read(output).providers.google.models.length, 2);
  assert.match(fs.readFileSync(githubOutput, "utf8"), /changed=false/);
  assert.equal(
    fs.readdirSync(path.dirname(output)).some((x) => x.endsWith(".tmp")),
    false,
  );
});

test("unreadable, malformed, invalid or oversized source files leave the artifact untouched", async (t) => {
  const { dir, source, openRouter, modelsDev, inputs, output } = workspace(t);
  const options = { rootDir: dir, now: NOW, log: () => {}, githubOutput: null };
  const withFiles = (sourceFile, openRouterFile, modelsDevFile) => [
    "--source-file",
    sourceFile,
    "--openrouter-file",
    openRouterFile,
    "--modelsdev-file",
    modelsDevFile,
  ];
  await publishCatalog({ ...options, argv: inputs });
  const before = fs.readFileSync(output, "utf8");
  const bad = path.join(dir, "bad.json");
  for (const contents of [undefined, "not JSON", "{}", "x".repeat(8 * 1024 * 1024 + 1)]) {
    fs.rmSync(bad, { force: true });
    if (contents !== undefined) fs.writeFileSync(bad, contents);
    await assert.rejects(
      publishCatalog({ ...options, argv: withFiles(bad, openRouter, modelsDev) }),
    );
    assert.equal(fs.readFileSync(output, "utf8"), before);
  }
  for (const contents of [
    undefined,
    "not JSON",
    "{}",
    JSON.stringify(openRouterResponse(MIN_OPENROUTER_MODELS - 1)),
    "x".repeat(16 * 1024 * 1024 + 1),
  ]) {
    fs.rmSync(bad, { force: true });
    if (contents !== undefined) fs.writeFileSync(bad, contents);
    await assert.rejects(
      publishCatalog({ ...options, argv: withFiles(source, bad, modelsDev) }),
    );
    assert.equal(fs.readFileSync(output, "utf8"), before);
  }
  for (const contents of [
    undefined,
    "not JSON",
    "[]",
    JSON.stringify(modelsDevResponse(MIN_MODELS_DEV_PROVIDERS - 1)),
    "x".repeat(32 * 1024 * 1024 + 1),
  ]) {
    fs.rmSync(bad, { force: true });
    if (contents !== undefined) fs.writeFileSync(bad, contents);
    await assert.rejects(publishCatalog({ ...options, argv: withFiles(source, openRouter, bad) }));
    assert.equal(fs.readFileSync(output, "utf8"), before);
  }
  fs.writeFileSync(output, "corrupt previous file");
  await assert.rejects(publishCatalog({ ...options, argv: inputs }));
  assert.equal(fs.readFileSync(output, "utf8"), "corrupt previous file");
});

test("invalid or missing command arguments fail before write", async (t) => {
  const { dir, output } = workspace(t);
  for (const argv of [
    [],
    ["--dry-run"],
    ["--unknown"],
    ["--source-file"],
    ["--source-file", "--dry-run"],
    ["--source-file", "a", "--source-file", "b"],
    ["--source-file", "a"],
    ["--source-file", "a", "--openrouter-file"],
    ["--source-file", "a", "--openrouter-file", "b", "--openrouter-file", "c"],
    ["--source-file", "a", "--openrouter-file", "b"],
    ["--source-file", "a", "--openrouter-file", "b", "--modelsdev-file"],
    ["--source-file", "a", "--openrouter-file", "b", "--modelsdev-file", "c", "--modelsdev-file", "d"],
    [...["--source-file", "a", "--openrouter-file", "b", "--modelsdev-file", "c"], "--report-file"],
    [
      ...["--source-file", "a", "--openrouter-file", "b", "--modelsdev-file", "c"],
      ...["--report-file", "d", "--report-file", "e"],
    ],
  ]) {
    await assert.rejects(publishCatalog({ rootDir: dir, argv }), /argument|once/);
  }
  assert.equal(fs.existsSync(output), false);
});

test("committed supplemental data covers the requested providers and preserves provider-specific metadata", () => {
  const s = validateSupplement(read(path.join(root, "sources/clawpod-providers.json")));
  assert.deepEqual(
    Object.keys(s.providers).sort(),
    [
      "openai-codex",
      "codex",
      "openai",
      "anthropic",
      "google",
      "google-vertex",
      "google-gemini-cli",
      "xai",
      "minimax",
      "minimax-portal",
      "amazon-bedrock",
      "amazon-bedrock-mantle",
      "anthropic-vertex",
      "openrouter",
      "zai",
      "opencode",
      "opencode-go",
      "byteplus",
      "volcengine",
      "together",
      "synthetic",
      "minimax-cn",
      "minimax-portal-cn",
      "kimi",
      "kilocode",
      "nvidia",
      "mistral",
    ].sort(),
  );
  const codex = s.providers["openai-codex"].models.find((m) => m.id === "gpt-6-astra");
  assert.equal(codex.contextWindow, 272_000);
  assert.equal(s.providers["google-vertex"].api, "google-vertex");
  // Claude rows use the Messages API; Mantle-only models inherit openai-completions.
  assert.ok(
    s.providers["amazon-bedrock-mantle"].models.every((m) =>
      m.id.startsWith("anthropic.") ? m.api === "anthropic-messages" : m.api === undefined,
    ),
  );
  assert.ok(
    s.providers["anthropic-vertex"].models.some((m) => m.id === "claude-haiku-4-5@20251001"),
  );
  // Everything else comes from the OpenRouter API on each publish run.
  assert.deepEqual(
    s.providers.openrouter.models.map((m) => m.id),
    ["auto"],
  );
  const f = fixture();
  const next = buildCatalog({ ...f, supplement: s });
  assert.ok(Buffer.byteLength(serializeCatalog(next)) < MAX_PUBLISHED_BYTES);
});

test("policy-only changes and permitted clock skew keep publication monotonic", () => {
  const f = fixture();
  f.upstream.generatedAt = NOW + 3600_000;
  const first = buildCatalog(f);
  const next = buildCatalog({ ...f, minVersion: "2026.9.1", previous: first });
  assert.equal(next.generatedAt, first.generatedAt + 1);
  assert.equal(next.minVersion, "2026.9.1");
  assert.equal(next.sourceMinVersion, "2026.7.0");
  assert.equal(
    buildCatalog({ ...f, minVersion: "2026.9.1", previous: next }).generatedAt,
    next.generatedAt,
  );
  assert.throws(() => buildCatalog({ ...f, minVersion: " " }));
  assert.throws(
    () => buildCatalog({ ...f, previous: { ...first, generatedAt: NOW + 25 * 3600_000 } }),
    /future/,
  );
});

test("missing or malformed supplement fails without changing output", async (t) => {
  const { dir, inputs, output } = workspace(t);
  const options = {
    rootDir: dir,
    now: NOW,
    log: () => {},
    githubOutput: null,
    argv: inputs,
  };
  await publishCatalog(options);
  const before = fs.readFileSync(output, "utf8");
  const supplementPath = path.join(dir, "sources/clawpod-providers.json");
  fs.writeFileSync(supplementPath, "invalid");
  await assert.rejects(publishCatalog(options));
  fs.unlinkSync(supplementPath);
  await assert.rejects(publishCatalog(options));
  assert.equal(fs.readFileSync(output, "utf8"), before);
});

test("committed artifact includes every manual model and fits the publication contract", () => {
  const supplement = validateSupplement(read(path.join(root, "sources/clawpod-providers.json")));
  const artifact = read(path.join(root, "models/v1/catalog.json"));
  assert.equal(artifact.schemaVersion, 1);
  assert.ok(Number.isSafeInteger(artifact.generatedAt));
  assert.ok(Number.isSafeInteger(artifact.sourceGeneratedAt));
  assert.ok(artifact.generatedAt >= artifact.sourceGeneratedAt);
  assert.match(artifact.supplementDigest, /^[a-f0-9]{64}$/);
  for (const [id, provider] of Object.entries(supplement.providers)) {
    const published = artifact.providers[id];
    assert.ok(published, `missing provider ${id}`);
    const ids = new Set(published.models.map((m) => m.id));
    for (const model of provider.models) assert.ok(ids.has(model.id), `missing ${id}/${model.id}`);
  }
  for (const [id, provider] of Object.entries(artifact.providers)) {
    assert.ok(provider.models.length > 0, `empty ${id}`);
    assert.equal(
      new Set(provider.models.map((m) => m.id.trim())).size,
      provider.models.length,
      `duplicate ${id}`,
    );
  }
  assert.deepEqual(stripTransportKeys(artifact), artifact);
  assert.equal(artifact.pricing, undefined);
  assert.ok(Buffer.byteLength(serializeCatalog(artifact)) <= MAX_PUBLISHED_BYTES);
});

test("committed artifact gives the Codex harness the same rows as ChatGPT sign-in Codex", () => {
  const artifact = read(path.join(root, "models/v1/catalog.json"));
  const codex = artifact.providers.codex;
  const twin = new Map(artifact.providers["openai-codex"].models.map((m) => [m.id, m]));
  assert.ok(codex, "missing provider codex");
  assert.equal(codex.api, artifact.providers["openai-codex"].api);
  // Same ChatGPT Codex backend: values, lifecycle and effort must not drift apart.
  for (const m of codex.models) assert.deepEqual(m, twin.get(m.id), `codex/${m.id}`);
  // gpt-5.6 is only the openai-codex plugin's alias row (REVIEW 2026-11-21).
  assert.deepEqual(
    codex.models.map((m) => m.id).sort(),
    [...twin.keys()].filter((id) => id !== "gpt-5.6").sort(),
  );
  assert.ok(SUBSCRIPTION_PROVIDERS.has("codex"));
});

test("valid JSON with corrupt previous schema or provenance cannot disable rollback protection", () => {
  const f = fixture();
  const good = buildCatalog(f);
  for (const previous of [
    null,
    {},
    [],
    { ...good, generatedAt: 0 },
    { ...good, sourceGeneratedAt: null },
    { ...good, supplementDigest: "invalid" },
  ]) {
    assert.throws(() => buildCatalog({ ...f, previous }));
  }
  const partial = structuredClone(good);
  delete partial.sourceGeneratedAt;
  assert.throws(() => buildCatalog({ ...f, previous: partial }), /incomplete/);
});

test("reviewed cost corrections fix stale upstream fields and preserve newer values and metadata", () => {
  const f = fixture();
  f.upstream.providers.google = structuredClone(f.supplement.providers.google);
  const upstreamModel = f.upstream.providers.google.models[0];
  upstreamModel.cost.cacheRead = 0.1;
  upstreamModel.compat = { preserved: true };
  upstreamModel.status = "disabled";
  f.supplement.corrections = [
    {
      kind: "cost",
      provider: "google",
      model: "local-model",
      expected: { input: 1, output: 2 },
      set: { input: 3, output: 4 },
      source: "https://example.com/pricing",
    },
  ];
  const before = structuredClone(f);
  const next = buildCatalog(f);
  assert.deepEqual(next.providers.google.models[0].cost, { input: 3, output: 4, cacheRead: 0.1 });
  assert.equal(next.providers.google.models[0].status, "disabled");
  assert.deepEqual(next.providers.google.models[0].compat, { preserved: true });
  assert.equal(next.corrections, undefined);
  assert.deepEqual(f, before);
  upstreamModel.cost.output = 5;
  assert.deepEqual(buildCatalog(f).providers.google.models[0].cost, upstreamModel.cost);
  delete upstreamModel.cost;
  assert.equal(buildCatalog(f).providers.google.models[0].cost, undefined);
});

test("dated corrections change publication at the exact boundary with unchanged upstream", () => {
  const f = fixture();
  f.supplement.corrections = [
    {
      kind: "cost",
      provider: "google",
      model: "local-model",
      expected: { input: 1, output: 2 },
      set: { input: 2, output: 4 },
      effectiveAt: NOW + 1000,
      source: "https://example.com/pricing",
    },
  ];
  const first = buildCatalog({ ...f, now: NOW + 999 });
  assert.equal(first.providers.google.models[0].cost.input, 1);
  const second = buildCatalog({ ...f, previous: first, now: NOW + 1000 });
  assert.equal(second.providers.google.models[0].cost.input, 2);
  assert.equal(second.sourceGeneratedAt, first.sourceGeneratedAt);
  assert.equal(second.supplementDigest, first.supplementDigest);
  assert.ok(second.generatedAt > first.generatedAt);
  assert.equal(
    serializeCatalog(buildCatalog({ ...f, previous: second, now: NOW + 2000 })),
    serializeCatalog(second),
  );
});

test("lifecycle corrections preserve disabled rows and never replace other provider metadata", () => {
  const f = fixture();
  f.upstream.providers.google = structuredClone(f.supplement.providers.google);
  f.supplement.corrections = [
    {
      kind: "status",
      provider: "google",
      model: "local-model",
      from: null,
      to: "deprecated",
      source: "https://example.com/lifecycle",
    },
    {
      kind: "status",
      provider: "google",
      model: "local-model",
      from: "deprecated",
      to: "disabled",
      effectiveAt: NOW + 1000,
      source: "https://example.com/lifecycle",
    },
  ];
  assert.equal(buildCatalog(f).providers.google.models[0].status, "deprecated");
  assert.equal(
    buildCatalog({ ...f, now: NOW + 1000 }).providers.google.models[0].status,
    "disabled",
  );
  f.upstream.providers.google.models[0].status = "disabled";
  assert.equal(buildCatalog(f).providers.google.models[0].status, "disabled");
  assert.deepEqual(buildCatalog(f).providers.openai, f.upstream.providers.openai);
});

test("corrections reject unsafe, unguarded, and missing targets", () => {
  const f = fixture();
  const valid = {
    kind: "cost",
    provider: "google",
    model: "local-model",
    expected: { input: 1 },
    set: { input: 2 },
    source: "https://example.com/pricing",
  };
  for (const bad of [
    { ...valid, model: "missing" },
    { ...valid, set: { output: 2 } },
    { ...valid, expected: {} },
    { ...valid, set: { input: -1 } },
    { ...valid, set: { apiKey: "not-allowed" } },
    { ...valid, effectiveAt: 0 },
    { ...valid, source: "not-a-url" },
    {
      kind: "status",
      provider: "google",
      model: "local-model",
      from: "disabled",
      to: "active",
      source: valid.source,
    },
  ])
    assert.throws(() =>
      buildCatalog({ ...f, supplement: { ...f.supplement, corrections: [bad] } }),
    );
});

test("reviewed data publishes corrected prices, subscription unknowns, and retirement states", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const f = { ...fixture(), supplement };
  f.upstream.providers.zai = {
    api: "openai-completions",
    models: [
      {
        ...localModel("glm-5.2"),
        cost: { input: 0.966, output: 3.036, cacheRead: 0.1932, cacheWrite: 0 },
      },
      { ...localModel("glm-5.3"), cost: { input: 1.4, output: 4.4, cacheRead: 0.14 } },
    ],
  };
  const next = buildCatalog(f);
  const get = (p, id, bundle = next) => bundle.providers[p].models.find((m) => m.id === id);
  assert.equal(get("zai", "glm-5.2").cost.input, 1.4);
  assert.equal(get("zai", "glm-5.2").cost.output, 4.4);
  assert.equal(get("zai", "glm-5.3").cost.cacheRead, 0.26);
  assert.deepEqual(get("anthropic-vertex", "claude-sonnet-5").cost, {
    input: 2,
    output: 10,
    cacheRead: 0.2,
    cacheWrite: 2.5,
  });
  assert.equal(get("google-vertex", "gemini-3.8-flash").cost.input, 0.75);
  assert.equal(get("openai-codex", "gpt-5.4").status, "disabled");
  assert.equal(get("openai-codex", "gpt-5.4-mini").replacedBy, "gpt-6-luna");
  assert.equal(get("openai-codex", "gpt-5.5").replacedBy, "gpt-6.1-sol");
  assert.ok(next.providers["openai-codex"].models.every((m) => m.cost === undefined));
  assert.ok(next.providers["minimax-portal"].models.every((m) => m.cost === undefined));
  // Mantle IDs are in-Region only, so AWS Geo/In-region prices apply (reviewed 2026-10-02).
  assert.deepEqual(get("amazon-bedrock-mantle", "anthropic.claude-mythos-preview").cost, {
    input: 27.5,
    output: 137.5,
    cacheRead: 2.75,
    cacheWrite: 34.375,
  });
  assert.equal(get("amazon-bedrock-mantle", "anthropic.claude-opus-4-8").reasoning, false);
  const expiry = Date.UTC(2026, 8, 9, 16);
  assert.equal(
    get("zai", "glm-5.3-flash", buildCatalog({ ...f, now: expiry - 1 })).cost.input,
    0.075,
  );
  assert.equal(get("zai", "glm-5.3-flash", buildCatalog({ ...f, now: expiry })).cost.input, 0.15);
  const later = buildCatalog({ ...f, now: Date.UTC(2027, 0, 1) });
  assert.equal(get("google", "gemini-3.8-flash", later).cost.input, 1.5);
  assert.equal(
    get("amazon-bedrock", "anthropic.claude-3-haiku-20240307-v1:0", later).status,
    "disabled",
  );
  // Anthropic retires both Sonnet 4.5 IDs on 2026-11-30 (REVIEW 2026-11-21).
  const sonnet45Retirement = Date.UTC(2026, 10, 30);
  for (const id of ["claude-sonnet-4-5", "claude-sonnet-4-5-20250929"]) {
    const before = get("anthropic", id, buildCatalog({ ...f, now: sonnet45Retirement - 1 }));
    assert.equal(before.status, "deprecated");
    assert.equal(before.replacedBy, "claude-sonnet-5-5");
    assert.equal(
      get("anthropic", id, buildCatalog({ ...f, now: sonnet45Retirement })).status,
      "disabled",
    );
  }
});

test("reviewed xai aliases publish their official target's values and always-on effort", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const next = buildCatalog({ ...fixture(), supplement });
  const get = (id) => next.providers.xai.models.find((m) => m.id === id);
  const shared = {
    input: ["text", "image"],
    reasoning: true,
    contextWindow: 1_000_000,
    cost: { input: 1.25, output: 2.5, cacheRead: 0.2, cacheWrite: 0 },
  };
  const alwaysOn = { thinkingLevels: ["low"], defaultThinkingLevel: "low", thinkingLevelLabels: { low: "on" } };
  // grok-4.20 is an official alias of grok-4.20-0309-reasoning (REVIEW 2026-11-21).
  const alias = get("grok-4.20");
  assert.ok(alias, "missing xai/grok-4.20");
  assert.deepEqual(
    { ...alias, compat: undefined },
    { id: "grok-4.20", name: "Grok 4.20", ...shared, maxTokens: 30_000, compat: undefined, thinkingLevelMap: { low: null } },
  );
  assert.deepEqual(alias.compat, alwaysOn);
  // grok-4-0709 retired 2026-05-15; xAI serves it as grok-4.3 with low reasoning effort.
  const retired = get("grok-4-0709");
  assert.ok(retired, "missing xai/grok-4-0709");
  assert.deepEqual(
    { ...retired, compat: undefined },
    {
      id: "grok-4-0709",
      name: "Grok 4 0709",
      ...shared,
      maxTokens: 64_000,
      status: "deprecated",
      replacedBy: "grok-4.3",
      compat: undefined,
      // No effort field on the wire (xAI: effort only on grok-4.3 and 4.5+), I3h.
      thinkingLevelMap: { low: null },
    },
  );
  assert.deepEqual(retired.compat, alwaysOn);
});

test("reviewed Google rows publish custom tools, Robotics ER 2 and the Gemini CLI rows", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const f = { ...fixture(), supplement };
  const next = buildCatalog(f);
  const get = (p, id, bundle = next) => bundle.providers[p].models.find((m) => m.id === id);
  const pro = {
    id: "gemini-3.1-pro-preview-customtools",
    name: "Gemini 3.1 Pro Preview Custom Tools",
    input: ["text", "image"],
    reasoning: true,
    contextWindow: 1_048_576,
    maxTokens: 65_536,
    cost: { input: 2, output: 12, cacheRead: 0.2 },
    compat: { thinkingLevels: ["low", "medium", "high"], defaultThinkingLevel: "high" },
  };
  // Same model as gemini-3.1-pro-preview on both APIs (REVIEW 2026-11-21).
  assert.deepEqual(get("google", pro.id), pro);
  assert.deepEqual(get("google-vertex", pro.id), pro);
  assert.deepEqual(get("google", "gemini-robotics-er-2-preview"), {
    id: "gemini-robotics-er-2-preview",
    name: "Gemini Robotics-ER 2 Preview",
    input: ["text", "image"],
    reasoning: true,
    contextWindow: 131_072,
    maxTokens: 65_536,
    cost: { input: 1, output: 5, cacheRead: 0.1 },
    compat: { thinkingLevels: ["minimal", "low", "medium", "high"], defaultThinkingLevel: "high" },
  });
  // Introductory Robotics ER 2 price ends 2026-12-31.
  const later = buildCatalog({ ...f, now: Date.UTC(2027, 0, 1) });
  assert.deepEqual(get("google", "gemini-robotics-er-2-preview", later).cost, {
    input: 2,
    output: 10,
    cacheRead: 0.2,
  });
  const cli = next.providers["google-gemini-cli"];
  assert.ok(cli, "missing provider google-gemini-cli");
  assert.equal(cli.api, "google-generative-ai");
  assert.deepEqual(
    cli.models.map((m) => m.id).sort(),
    [
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.5-pro",
      "gemini-3-flash-preview",
      "gemini-3.1-flash-lite",
      "gemini-3.1-pro-preview",
      "gemini-3.1-pro-preview-customtools",
    ].sort(),
  );
  // Gemini CLI sign-in is a request quota, not a per-token price.
  assert.ok(cli.models.every((m) => m.cost === undefined));
  assert.ok(SUBSCRIPTION_PROVIDERS.has("google-gemini-cli"));
  // The Agent's Pi Google adapter rejects xhigh (MAINTAINING.md 9).
  const added = [
    get("google", pro.id),
    get("google-vertex", pro.id),
    get("google", "gemini-robotics-er-2-preview"),
    ...cli.models,
  ];
  for (const m of added) {
    assert.ok(m.compat?.thinkingLevels?.length, `no effort ${m.id}`);
    assert.ok(!m.compat.thinkingLevels.some((l) => l === "xhigh" || l === "max"), m.id);
  }
});

test("Gemini CLI manual rows keep the google manual rows' values without a price", () => {
  // Compared with the manual google rows, not the published ones: upstream google rows
  // may change on a scheduled publish and must not block it (google is auto + manual).
  const s = validateSupplement(read(path.join(root, "sources/clawpod-providers.json")));
  const google = new Map(s.providers.google.models.map((m) => [m.id, m]));
  const cli = s.providers["google-gemini-cli"];
  assert.equal(cli.api, s.providers.google.api);
  for (const m of cli.models) {
    const twin = google.get(m.id);
    assert.ok(twin, `no manual google row for ${m.id}`);
    const { cost, ...values } = twin;
    assert.deepEqual(m, values, m.id);
  }
});

// OpenCode Zen and Go rows from Pi 1.5.2 (REVIEW 2026-11-21). Effort follows the model APIs'
// capabilities.reasoning (REVIEW 2026-11-22 I3h) except the rows below, which state neither an
// effort list nor a toggle and keep the Agent's current effort.
const OPENCODE_IDS = {
  opencode: [
    ...["claude-fable-5", "claude-fable-5-1", "claude-fable-5-2", "claude-haiku-4-5", "claude-haiku-5-5"],
    ...["claude-opus-4-5", "claude-opus-4-6", "claude-opus-4-7", "claude-opus-4-8", "claude-opus-5-5"],
    ...["claude-sonnet-4-5", "claude-sonnet-4-6", "claude-sonnet-5", "claude-sonnet-5-5"],
    ...["qwen3.5-plus", "qwen3.6-plus", "qwen3.8-flash"],
    ...["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash", "gemini-3.8-flash", "gemini-4-argon"],
    ...["beam-free", "deepseek-v4-pro", "deepseek-v4.1-flash", "deepseek-v4.1-flash-free", "flint-40b-free"],
    ...["glm-5.3", "glm-5.3-flash", "iceman-free", "kimi-k2.7-code", "longcat-2.5-free", "mimo-v2.6-flash-free"],
    ...["minimax-m2.5", "minimax-m2.7", "mistral-large-4", "nemotron-3.5-lightning-free"],
    ...["nemotron-3.5-super-vl-free", "qwen3.8-max"],
    ...["gpt-5", "gpt-5-codex", "gpt-5-nano", "gpt-5.1", "gpt-5.1-codex", "gpt-5.1-codex-max"],
    ...["gpt-5.1-codex-mini", "gpt-5.2", "gpt-5.2-codex", "gpt-5.3-codex", "gpt-5.4", "gpt-5.4-mini"],
    ...["gpt-5.4-nano", "gpt-5.4-pro", "gpt-5.5", "gpt-5.5-pro", "gpt-5.6-luna", "gpt-5.6-terra"],
    ...["gpt-6-astra", "gpt-6-luna", "gpt-6-sol", "gpt-6.1-sol", "grok-4.5", "grok-4.6", "grok-4.7"],
    ...["grok-build-0.1", "muse-ember-1.0", "muse-spark-1.2", "muse-spark-1.3", "muse-wonder-1.0"],
  ],
  "opencode-go": [
    ...["claude-haiku-5-5", "minimax-m3", "qwen3.7-plus", "qwen3.8-flash", "gemini-4-argon", "beam-free"],
    ...["glm-5.3", "glm-5.3-flash", "hy4", "hy4-preview", "iceman-contributor-free", "kimi-k3.1-pro"],
    ...["longcat-2.0", "longcat-2.5-free", "mimo-v2.6-flash", "mimo-v2.6-pro", "minimax-m3.1-flash"],
    ...["step-5-preview", "gpt-6-luna", "grok-4.7", "muse-spark-1.2-contributor", "muse-spark-1.3-contributor"],
  ],
};
const OPENCODE_STILL_KEPT = [
  ...["opencode/claude-haiku-4-5", "opencode/claude-sonnet-4-5", "opencode/iceman-free", "opencode/kimi-k2.7-code"],
  ...["opencode/mimo-v2.6-flash-free", "opencode/minimax-m2.5", "opencode/minimax-m2.7"],
  // opencode/grok-build-0.1 left this list on 2026-11-24 (G1): one always-on level, high.
  ...["opencode/nemotron-3.5-lightning-free", "opencode-go/iceman-contributor-free"],
  ...["opencode-go/mimo-v2.6-flash", "opencode-go/mimo-v2.6-pro"],
];
const OPENCODE_API = { opencode: "https://opencode.ai/zen/v1/models", "opencode-go": "https://opencode.ai/inference/go/v1/models" };
const OPENCODE_KEPT = {
  thinkingLevels: ["off", "minimal", "low", "medium", "high", "adaptive"],
  defaultThinkingLevel: "low",
};

test("reviewed OpenCode Zen and Go rows publish the Pi 1.5.2 values and the model APIs' effort", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const next = buildCatalog({ ...fixture(), supplement });
  const get = (p, id) => next.providers[p].models.find((m) => m.id === id);
  assert.equal(OPENCODE_IDS.opencode.length, 69);
  assert.equal(OPENCODE_IDS["opencode-go"].length, 22);
  for (const [p, ids] of Object.entries(OPENCODE_IDS)) {
    assert.equal(next.providers[p]?.api, "openai-completions", p);
    assert.deepEqual(next.providers[p].models.map((m) => m.id).sort(), [...ids].sort(), p);
    for (const m of next.providers[p].models) {
      const rule = supplement.thinking.find((r) => r.provider === p && r.model === m.id);
      const levels = { thinkingLevels: m.compat.thinkingLevels, defaultThinkingLevel: m.compat.defaultThinkingLevel };
      if (OPENCODE_STILL_KEPT.includes(`${p}/${m.id}`)) assert.deepEqual(levels, OPENCODE_KEPT, `${p}/${m.id}`);
      else assert.deepEqual(levels, { thinkingLevels: rule.levels, defaultThinkingLevel: rule.default }, `${p}/${m.id}`);
    }
  }
  // Model API ladders, the Claude adaptive flag and tools.strict from the API. Defaults stay where
  // API default first, then the current default if the new list holds it, vendor default, nearest level.
  const effort = (p, id) => {
    const { thinkingLevels, defaultThinkingLevel, ...rest } = get(p, id).compat;
    return [thinkingLevels, defaultThinkingLevel, rest, get(p, id).thinkingLevelMap];
  };
  assert.deepEqual(effort("opencode", "claude-opus-4-6"), [["low", "medium", "high", "max"], "low", { forceAdaptiveThinking: true }, undefined]);
  assert.deepEqual(effort("opencode", "gpt-5.4"), [["off", "low", "medium", "high", "xhigh"], "low", {}, undefined]);
  assert.deepEqual(effort("opencode", "gemini-4-argon"), [["low", "medium", "high"], "low", {}, { minimal: "low" }]);
  assert.deepEqual(effort("opencode", "beam-free"), [["low", "medium", "high", "xhigh", "max"], "low", { supportsStrictMode: true }, undefined]);
  assert.deepEqual(effort("opencode-go", "kimi-k3.1-pro"), [["low", "high", "max"], "max", { supportsStrictMode: true }, undefined]);
  assert.deepEqual(effort("opencode-go", "minimax-m3"), [["off", "adaptive"], "adaptive", { forceAdaptiveThinking: true }, undefined]);
  const strip = ({ compat: _c, thinkingLevelMap: _m, ...m }) => m;
  const row = (id, name, api, input, contextWindow, maxTokens, cost) => ({
    id,
    name,
    ...(api ? { api } : {}),
    input,
    reasoning: true,
    contextWindow,
    maxTokens,
    cost,
  });
  const ti = ["text", "image"];
  assert.deepEqual(
    strip(get("opencode", "claude-opus-4-6")),
    row("claude-opus-4-6", "Claude Opus 4.6", "anthropic-messages", ti, 1_000_000, 128_000, {
      input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25,
    }),
  );
  // Pi value kept where the OpenCode model API states a 1,050,000 window (REVIEW 2026-11-21).
  assert.deepEqual(
    strip(get("opencode", "gpt-5.4")),
    row("gpt-5.4", "GPT-5.4", "openai-responses", ti, 272_000, 128_000, {
      input: 2.5, output: 15, cacheRead: 0.25, cacheWrite: 0,
    }),
  );
  assert.deepEqual(
    strip(get("opencode", "gemini-4-argon")),
    row("gemini-4-argon", "Gemini 4 Argon", "google-generative-ai", ti, 1_048_576, 65_536, {
      input: 2, output: 10, cacheRead: 0.1, cacheWrite: 0,
    }),
  );
  // Officially free (Zen pricing "Free").
  assert.deepEqual(
    strip(get("opencode", "beam-free")),
    row("beam-free", "Beam Free", undefined, ["text"], 1_048_576, 131_072, {
      input: 0, output: 0, cacheRead: 0, cacheWrite: 0,
    }),
  );
  assert.deepEqual(
    strip(get("opencode-go", "kimi-k3.1-pro")),
    row("kimi-k3.1-pro", "Kimi K3.1 Pro", undefined, ti, 1_048_576, 131_072, {
      input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2,
    }),
  );
  // Not in the OpenCode model APIs, so not published.
  for (const id of [
    ...["gemini-3.1-pro", "gemini-3-flash", "glm-5.3-flash-free", "minimax-m3.1-flash-free", "glm-5"],
    ...["kimi-k2.5", "glm-5.1", "glm-5.2", "kimi-k2.6", "inkling-2-small-free"],
  ]) {
    assert.equal(get("opencode", id), undefined, id);
  }
  for (const id of ["glm-5.2", "mimo-v2.5", "mimo-v2.5-pro"]) assert.equal(get("opencode-go", id), undefined, id);
});

test("OpenCode effort rules name one row each and follow the model APIs where they state a ladder", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const isOpencode = (r) => r.provider === "opencode" || r.provider === "opencode-go";
  const rules = supplement.thinking.filter(isOpencode);
  const firstWildcard = supplement.thinking.findIndex((r) => r.provider === "*");
  assert.equal(rules.length, 96);
  for (const r of rules) {
    assert.ok(!r.model.endsWith("*"), `exact id ${r.provider}/${r.model}`);
    assert.ok(supplement.thinking.indexOf(r) < firstWildcard, `before * rules ${r.provider}/${r.model}`);
  }
  // Model API ladders for upstream rows (REVIEW 2026-11-21 kimi-k3, 2026-11-22 DeepSeek and I3h).
  const OFFICIAL_UPSTREAM = {
    "opencode-go/kimi-k3": [["max"], "max"],
    "opencode-go/deepseek-v4-pro": [["high", "max"], "high"],
    "opencode-go/deepseek-v4.1-flash": [["low", "high", "max"], "high"],
    "opencode/claude-opus-5": [["low", "medium", "high", "xhigh", "max"], "high"],
    "opencode/kimi-k3": [["off", "low", "high", "max"], "max"],
  };
  const ref = (r) => `${r.provider}/${r.model}`;
  const keep = rules.filter((r) => !OFFICIAL_UPSTREAM[ref(r)]);
  assert.deepEqual(
    keep.map(ref).sort(),
    Object.entries(OPENCODE_IDS).flatMap(([p, ids]) => ids.map((id) => `${p}/${id}`)).sort(),
  );
  for (const r of rules) {
    if (OPENCODE_STILL_KEPT.includes(ref(r))) {
      assert.deepEqual([r.levels, r.default], [OPENCODE_KEPT.thinkingLevels, "low"]);
      assert.match(r.note, /^Not the official ladder: /);
    } else {
      assert.equal(r.source, OPENCODE_API[r.provider], ref(r));
    }
  }
  // Upstream OpenCode rows from the committed artifact, rebuilt with and without this review.
  const artifact = read(path.join(root, "models/v1/catalog.json"));
  const manual = new Set(Object.entries(OPENCODE_IDS).flatMap(([p, ids]) => ids.map((id) => `${p}/${id}`)));
  const upstream = fixture().upstream;
  for (const p of ["opencode", "opencode-go"]) {
    upstream.providers[p] = {
      api: "openai-completions",
      models: [
        ...(artifact.providers[p]?.models ?? []).filter((m) => !manual.has(`${p}/${m.id}`)),
        // Pinned so the check holds whatever the scheduled publish brings.
        ...(p === "opencode-go" && !artifact.providers[p]?.models.some((m) => m.id === "kimi-k3")
          ? [{ ...localModel("kimi-k3"), compat: { supportedReasoningEfforts: ["max"] } }]
          : []),
      ],
    };
  }
  const { opencode: _a, "opencode-go": _b, ...otherProviders } = supplement.providers;
  const { opencode: _c, "opencode-go": _d, ...otherProvenance } = supplement.provenance;
  const without = {
    ...supplement,
    providers: otherProviders,
    provenance: otherProvenance,
    thinking: supplement.thinking.filter((r) => !isOpencode(r)),
  };
  const f = { ...fixture(), upstream };
  const after = buildCatalog({ ...f, supplement });
  const before = buildCatalog({ ...f, supplement: without });
  for (const p of ["opencode", "opencode-go"]) {
    for (const m of before.providers[p].models) {
      const now = after.providers[p].models.find((x) => x.id === m.id);
      if (OFFICIAL_UPSTREAM[`${p}/${m.id}`]) {
        assert.deepEqual([now.compat.thinkingLevels, now.compat.defaultThinkingLevel], OFFICIAL_UPSTREAM[`${p}/${m.id}`]);
      } else {
        assert.deepEqual(now, m, `${p}/${m.id}`);
      }
    }
  }
});

const VOLC_IDS = {
  byteplus: ["seed-2-0-pro-260328", "seed-2-0-lite-260428", "seed-2-0-mini-260428"],
  volcengine: ["deepseek-v4-1-flash-260910", "doubao-seed-2-1-lite-260915", "doubao-seed-2-1-pro-260915"],
};

test("reviewed BytePlus and Volcano Engine rows publish the Agent table values and the Agent's current effort", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const next = buildCatalog({ ...fixture(), supplement });
  const get = (p, id) => next.providers[p].models.find((m) => m.id === id);
  for (const [p, ids] of Object.entries(VOLC_IDS)) {
    assert.equal(supplement.providers[p]?.api, "openai-completions", p);
    assert.deepEqual(supplement.providers[p].models.map((m) => m.id).sort(), [...ids].sort(), p);
  }
  const row = (id, name, contextWindow, maxTokens, cost) => ({
    id,
    name,
    input: ["text", "image"],
    reasoning: true,
    contextWindow,
    maxTokens,
    ...(cost ? { cost } : {}),
    compat: OPENCODE_KEPT,
  });
  // BytePlus USD [0,128K] tier; cache storage is billed per hour, not as a token write.
  assert.deepEqual(
    get("byteplus", "seed-2-0-pro-260328"),
    row("seed-2-0-pro-260328", "Seed 2.0 Pro", 256_000, 4_096, { input: 0.5, output: 3, cacheRead: 0.1, cacheWrite: 0 }),
  );
  assert.deepEqual(
    get("byteplus", "seed-2-0-lite-260428"),
    row("seed-2-0-lite-260428", "Seed 2.0 Lite", 256_000, 4_096, { input: 0.25, output: 2, cacheRead: 0.05, cacheWrite: 0 }),
  );
  assert.deepEqual(
    get("byteplus", "seed-2-0-mini-260428"),
    row("seed-2-0-mini-260428", "Seed 2.0 Mini", 256_000, 4_096, { input: 0.1, output: 0.4, cacheRead: 0.02, cacheWrite: 0 }),
  );
  // Volcano Engine prices are CNY only: no price, a reviewed cost gap instead.
  assert.deepEqual(
    get("volcengine", "deepseek-v4-1-flash-260910"),
    row("deepseek-v4-1-flash-260910", "DeepSeek V4.1 Flash", 1_024_000, 384_000),
  );
  assert.deepEqual(
    get("volcengine", "doubao-seed-2-1-lite-260915"),
    row("doubao-seed-2-1-lite-260915", "Doubao Seed 2.1 Lite", 1_024_000, 256_000),
  );
  assert.deepEqual(
    get("volcengine", "doubao-seed-2-1-pro-260915"),
    row("doubao-seed-2-1-pro-260915", "Doubao Seed 2.1 Pro (September)", 1_024_000, 256_000),
  );
  assert.deepEqual(
    supplement.knownGaps
      .filter((g) => g.provider === "volcengine" && g.check === "cost")
      .map((g) => [g.model, g.check])
      .sort(),
    VOLC_IDS.volcengine.map((id) => [id, "cost"]).sort(),
  );
  // Retired or not listed officially, so not published as manual rows.
  for (const id of ["seed-1-8-251228", "kimi-k2-5-260127"]) assert.equal(get("byteplus", id), undefined, id);
  for (const id of ["doubao-seed-1-8-251228", "doubao-seed-code-preview-251028"]) {
    assert.equal(get("volcengine", id), undefined, id);
  }
  for (const p of ["byteplus-plan", "volcengine-plan"]) assert.equal(supplement.providers[p], undefined, p);
});

test("BytePlus and Volcano Engine effort rules name one row each and leave the upstream rows alone", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const isVolc = (r) => r.provider === "byteplus" || r.provider === "volcengine";
  const rules = supplement.thinking.filter(isVolc);
  const firstWildcard = supplement.thinking.findIndex((r) => r.provider === "*");
  assert.deepEqual(
    rules.map((r) => `${r.provider}/${r.model}`).sort(),
    Object.entries(VOLC_IDS).flatMap(([p, ids]) => ids.map((id) => `${p}/${id}`)).sort(),
  );
  for (const r of rules) {
    assert.ok(supplement.thinking.indexOf(r) < firstWildcard, `before * rules ${r.provider}/${r.model}`);
    assert.deepEqual([r.levels, r.default], [OPENCODE_KEPT.thinkingLevels, "low"]);
    assert.match(r.note, /^Not the official ladder: /);
  }
  // Upstream rows from the committed artifact, rebuilt with and without this review.
  const artifact = read(path.join(root, "models/v1/catalog.json"));
  const manual = new Set(Object.entries(VOLC_IDS).flatMap(([p, ids]) => ids.map((id) => `${p}/${id}`)));
  const upstream = fixture().upstream;
  for (const p of Object.keys(VOLC_IDS)) {
    upstream.providers[p] = {
      api: "openai-completions",
      models: (artifact.providers[p]?.models ?? []).filter((m) => !manual.has(`${p}/${m.id}`)),
    };
  }
  const { byteplus: _a, volcengine: _b, ...otherProviders } = supplement.providers;
  const { byteplus: _c, volcengine: _d, ...otherProvenance } = supplement.provenance;
  const without = {
    ...supplement,
    providers: otherProviders,
    provenance: otherProvenance,
    thinking: supplement.thinking.filter((r) => !isVolc(r)),
    knownGaps: supplement.knownGaps.filter((g) => !manual.has(`${g.provider}/${g.model}`)),
  };
  const f = { ...fixture(), upstream };
  const after = buildCatalog({ ...f, supplement });
  const before = buildCatalog({ ...f, supplement: without });
  for (const p of Object.keys(VOLC_IDS)) {
    assert.deepEqual(
      after.providers[p].models.filter((m) => !manual.has(`${p}/${m.id}`)),
      before.providers[p].models,
      p,
    );
  }
});

const TOGETHER_ID = "Qwen/Qwen3.8-Flash";

test("reviewed Together row publishes the Agent table values and the Agent's current effort", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  assert.equal(supplement.providers.together?.api, "openai-completions");
  assert.deepEqual(supplement.providers.together.models.map((m) => m.id), [TOGETHER_ID]);
  const next = buildCatalog({ ...fixture(), supplement });
  assert.deepEqual(next.providers.together.models.find((m) => m.id === TOGETHER_ID), {
    id: TOGETHER_ID,
    name: "Qwen3.8 Flash",
    input: ["text", "image"],
    reasoning: true,
    contextWindow: 1_000_000,
    maxTokens: 8_192,
    cost: { input: 0.15, output: 0.47, cacheRead: 0, cacheWrite: 0 },
    compat: OPENCODE_KEPT,
  });
  // Retired or no longer offered officially, so not published as manual rows.
  const manual = new Set(supplement.providers.together.models.map((m) => m.id));
  for (const id of [
    "zai-org/GLM-4.7",
    "moonshotai/Kimi-K2.5",
    "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    "deepseek-ai/DeepSeek-V3.1",
    "deepseek-ai/DeepSeek-R1",
    "moonshotai/Kimi-K2-Instruct-0905",
  ]) {
    assert.equal(manual.has(id), false, id);
  }
  for (const p of ["qianfan", "moonshot"]) assert.equal(supplement.providers[p], undefined, p);
});

test("Together effort rule names one row and leaves the upstream Together rows alone", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const isTogether = (r) => r.provider === "together";
  const rules = supplement.thinking.filter(isTogether);
  const DEEPSEEK_PRO = "deepseek-ai/DeepSeek-V4-Pro-0813";
  assert.deepEqual(rules.map((r) => r.model), [TOGETHER_ID, DEEPSEEK_PRO]);
  const [rule, official] = rules;
  for (const r of rules) {
    assert.ok(
      supplement.thinking.indexOf(r) < supplement.thinking.findIndex((x) => x.provider === "*"),
      `before * rules ${r.model}`,
    );
  }
  // Together: DeepSeek V4 Pro 0813 accepts only high and max, toggled by reasoning.enabled.
  assert.deepEqual([official.levels, official.default], [["off", "high", "max"], "high"]);
  assert.deepEqual([rule.levels, rule.default], [OPENCODE_KEPT.thinkingLevels, "low"]);
  assert.match(rule.note, /^Not the official ladder: /);
  // Upstream Together rows from the committed artifact, rebuilt with and without this review.
  const artifact = read(path.join(root, "models/v1/catalog.json"));
  const upstream = fixture().upstream;
  upstream.providers.together = {
    api: "openai-completions",
    models: artifact.providers.together.models.filter((m) => m.id !== TOGETHER_ID),
  };
  const { together: _a, ...providers } = supplement.providers;
  const { together: _b, ...provenance } = supplement.provenance;
  const without = { ...supplement, providers, provenance, thinking: supplement.thinking.filter((r) => !isTogether(r)) };
  const f = { ...fixture(), upstream };
  const after = buildCatalog({ ...f, supplement });
  const before = buildCatalog({ ...f, supplement: without });
  for (const m of before.providers.together.models) {
    const now = after.providers.together.models.find((x) => x.id === m.id);
    if (m.id === DEEPSEEK_PRO) assert.deepEqual(now.compat.thinkingLevels, ["off", "high", "max"]);
    else assert.deepEqual(now, m, m.id);
  }
});

const SYNTHETIC_REASONING_IDS = ["hf:zai-org/GLM-4.7-Flash", "hf:zai-org/GLM-5.3-Flash", "hf:Qwen/Qwen3.8-27B"];
const SYNTHETIC_IDS = ["hf:openai/gpt-oss-120b", ...SYNTHETIC_REASONING_IDS];

test("reviewed Synthetic rows publish the Agent table values, official prices and the Agent's current effort", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  assert.equal(supplement.providers.synthetic?.api, "anthropic-messages");
  assert.deepEqual(supplement.providers.synthetic.models.map((m) => m.id).sort(), [...SYNTHETIC_IDS].sort());
  assert.deepEqual(supplement.provenance.synthetic.files, ["extensions/synthetic/models.ts"]);
  // Usage-based prices are published per token, so this is not a subscription-only provider.
  assert.equal(SUBSCRIPTION_PROVIDERS.has("synthetic"), false);
  const next = buildCatalog({ ...fixture(), supplement });
  assert.equal(next.providers.synthetic.api, "anthropic-messages");
  assert.deepEqual(next.providers.synthetic.models.map((m) => m.id).sort(), [...SYNTHETIC_IDS].sort());
  const get = (id) => next.providers.synthetic.models.find((m) => m.id === id);
  const row = (id, name, input, reasoning, contextWindow, cost) => ({
    id,
    name,
    input,
    reasoning,
    contextWindow,
    maxTokens: 8_192,
    cost,
    ...(reasoning ? { compat: OPENCODE_KEPT } : {}),
  });
  // Reasoning stays off like the Agent table, so the row gets no effort profile. An exact-id
  // override after the * gpt-oss-* rule (which sets reasoning:true) keeps it off.
  const kept = supplement.overrides.filter((r) => r.provider === "synthetic");
  assert.deepEqual(kept.map((r) => [r.model, r.set]), [["hf:openai/gpt-oss-120b", { reasoning: false }]]);
  assert.ok(
    supplement.overrides.indexOf(kept[0]) > supplement.overrides.findIndex((r) => r.provider === "*" && r.model === "gpt-oss-*"),
  );
  assert.deepEqual(
    get("hf:openai/gpt-oss-120b"),
    row("hf:openai/gpt-oss-120b", "GPT OSS 120B", ["text"], false, 128_000, { input: 0.1, output: 0.1, cacheRead: 0.02, cacheWrite: 0 }),
  );
  assert.deepEqual(
    get("hf:zai-org/GLM-4.7-Flash"),
    row("hf:zai-org/GLM-4.7-Flash", "GLM 4.7 Flash", ["text"], true, 196_608, { input: 0.1, output: 0.5, cacheRead: 0.02, cacheWrite: 0 }),
  );
  assert.deepEqual(
    get("hf:zai-org/GLM-5.3-Flash"),
    row("hf:zai-org/GLM-5.3-Flash", "GLM 5.3 Flash", ["text", "image"], true, 524_288, { input: 0.15, output: 0.5, cacheRead: 0.04, cacheWrite: 0 }),
  );
  assert.deepEqual(
    get("hf:Qwen/Qwen3.8-27B"),
    row("hf:Qwen/Qwen3.8-27B", "Qwen3.8 27B", ["text", "image"], true, 262_144, { input: 0.45, output: 2.2, cacheRead: 0.09, cacheWrite: 0 }),
  );
  // Not on the official model API (or a different id there), so not published as manual rows.
  for (const id of [
    "hf:deepseek-ai/DeepSeek-V4.1-FlashBeta",
    "hf:moonshotai/Kimi-K3",
    "hf:zai-org/GLM-5.3Beta",
    "hf:MiniMaxAI/MiniMax-M2.5",
    "hf:moonshotai/Kimi-K2.5",
    "hf:zai-org/GLM-4.7",
    "hf:nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4",
  ]) {
    assert.equal(get(id), undefined, id);
  }
  // Venice and Chutes table-only ids are not on the official lists, Arcee Trinity is "Not Hosted".
  for (const p of ["venice", "chutes", "arcee"]) assert.equal(supplement.providers[p], undefined, p);
});

test("Synthetic effort rules name the three reasoning rows only", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const rules = supplement.thinking.filter((r) => r.provider === "synthetic");
  const firstWildcard = supplement.thinking.findIndex((r) => r.provider === "*");
  assert.deepEqual(rules.map((r) => r.model).sort(), [...SYNTHETIC_REASONING_IDS].sort());
  for (const r of rules) {
    assert.ok(supplement.thinking.indexOf(r) < firstWildcard, `before * rules ${r.model}`);
    assert.deepEqual([r.levels, r.default], [OPENCODE_KEPT.thinkingLevels, "low"]);
    assert.match(r.note, /^Not the official ladder: /);
    // Anthropic Messages route: the Agent does send thinking, so the note must not claim otherwise.
    assert.doesNotMatch(r.note, /never send/);
  }
});

test("committed overrides give the reviewed OpenAI rows their context budget", () => {
  const { overrides } = read(path.join(root, "sources/clawpod-providers.json"));
  const row = (id, extra) => ({ id, contextWindow: 1050000, maxTokens: 128000, ...extra });
  const out = applyOverrides(
    {
      openai: { models: [row("gpt-5.4"), row("gpt-5.4-pro")] },
      openrouter: { models: [row("openai/gpt-6.2-sol"), row("openai/gpt-6.2-sol:batch")] },
      "github-copilot": { models: [row("gpt-5.6-sol", { contextTokens: 922000 }), row("gpt-5.4")] },
    },
    overrides,
  );
  const get = (p, id) => out[p].models.find((m) => m.id === id);
  assert.equal(get("openai", "gpt-5.4").contextTokens, 272000);
  assert.equal(get("openrouter", "openai/gpt-6.2-sol").contextTokens, 272000);
  // Exact-id rules: variants and other providers' rows keep what upstream gave them.
  assert.equal(get("openai", "gpt-5.4-pro").contextTokens, undefined);
  assert.equal(get("openrouter", "openai/gpt-6.2-sol:batch").contextTokens, undefined);
  assert.equal(get("github-copilot", "gpt-5.6-sol").contextTokens, 922000);
  // Retired Copilot rows keep the Agent's current budget (approved exception, REVIEW 2026-11-20).
  assert.equal(get("github-copilot", "gpt-5.4").contextTokens, 128000);
  assert.equal(get("github-copilot", "gpt-5.4").maxTokens, 8192);
});

test("compat overrides set or delete one key at a time and keep the rest of compat", () => {
  const src = "https://example.com/compat";
  const providers = {
    gw: {
      models: [
        { id: "a", compat: { keep: true, drop: "x", flip: false, thinkingLevels: ["low"] } },
        { id: "b", compat: { drop: true } },
        { id: "c", maxTokens: 9 },
      ],
    },
  };
  const out = applyOverrides(providers, [
    { provider: "gw", model: "*", set: { compat: { drop: null } }, source: src },
    { provider: "gw", model: "a", set: { compat: { flip: true, mode: "enabled" }, maxTokens: 5 }, source: src },
    // Later rules win key by key, including a delete of a key an earlier rule set.
    { provider: "gw", model: "a", set: { compat: { mode: null } }, source: src },
    { provider: "gw", model: "c", set: { compat: { absent: null } }, source: src },
  ]);
  const get = (id) => out.gw.models.find((m) => m.id === id);
  assert.deepEqual(get("a"), { id: "a", maxTokens: 5, compat: { keep: true, flip: true, thinkingLevels: ["low"] } });
  // A compat left empty is removed, and deleting a missing key creates nothing.
  assert.deepEqual(get("b"), { id: "b" });
  assert.deepEqual(get("c"), { id: "c", maxTokens: 9 });
  assert.deepEqual(providers.gw.models[0].compat.drop, "x", "input is not mutated");

  // Through the whole build: upstream compat stays and Effort is added on top.
  const f = fixture();
  f.upstream.providers.openai.models[0].compat = { codeMode: "capable", supportsTemperature: false };
  f.supplement.overrides = [{ provider: "*", model: "gpt", set: { compat: { cachesInstructions: false } }, source: src }];
  f.supplement.thinking = [{ provider: "*", model: "gpt", levels: ["low", "high"], default: "high", source: src }];
  assert.deepEqual(buildCatalog(f).providers.openai.models[0].compat, {
    codeMode: "capable",
    supportsTemperature: false,
    cachesInstructions: false,
    thinkingLevels: ["low", "high"],
    defaultThinkingLevel: "high",
  });
});

for (const [label, compat] of [
  ["an empty compat patch", {}],
  ["a key that is not a plain name", { "bad-key": true }],
  ["an object value", { reasoningEffortMap: { off: "none" } }],
  ["an empty string value", { promptCacheKeyMode: "" }],
]) {
  test(`compat overrides reject ${label}`, () => {
    const f = fixture();
    f.supplement.overrides = [{ provider: "openai", model: "gpt", set: { compat }, source: "https://example.com/x" }];
    assert.throws(() => buildCatalog(f));
  });
}

test("committed compat rules patch the reviewed request keys and leave the other keys", () => {
  const { overrides } = read(path.join(root, "sources/clawpod-providers.json"));
  const row = (id, compat) => ({ id, compat: { thinkingLevels: ["low"], ...compat } });
  const out = applyOverrides(
    {
      kimi: { models: [row("k3", { adaptiveThinking: true, codeMode: "preferred" }), row("kimi-for-coding")] },
      mistral: { models: [row("mistral-small-2603", { adaptiveThinking: true })] },
      abliteration: { models: [row("abliterated-model", { supportsPromptCacheKey: true, maxTokensField: "max_tokens" })] },
      opencode: {
        models: [
          row("kimi-k3", { supportsStrictMode: false, maxTokensField: "max_tokens", supportsUsageInStreaming: true }),
          row("big-pickle", { supportsStrictMode: false, supportsDeveloperRole: false }),
          row("claude-opus-5", { supportsReasoningEffort: true, codeMode: "capable" }),
        ],
      },
      "opencode-go": {
        models: [
          row("kimi-k2.6", { supportsStrictMode: false }),
          row("deepseek-v4.1-flash", { supportsStrictMode: false, supportsReasoningEffort: true }),
        ],
      },
      nvidia: { models: [row("nvidia/nemotron-3.5-super-vl-120b-a12b", { requiresStringContent: true })] },
      "stepfun-plan": { models: [{ id: "step-3.7-flash", maxTokens: 262144, compat: { maxTokensField: "max_tokens", supportsStore: false } }] },
      baseten: { models: [{ id: "deepseek-ai/DeepSeek-V4-Flash-0731", maxTokens: 384000 }] },
    },
    overrides,
  );
  const compat = (p, id) => out[p].models.find((m) => m.id === id).compat;
  assert.deepEqual(compat("kimi", "k3"), { thinkingLevels: ["low"], codeMode: "preferred" });
  assert.deepEqual(compat("kimi", "kimi-for-coding"), { thinkingLevels: ["low"] });
  // adaptiveThinking dropped (I3e); reasoning_effort per the Mistral reasoning page (I3h).
  assert.deepEqual(compat("mistral", "mistral-small-2603"), { thinkingLevels: ["low"], supportsReasoningEffort: true });
  assert.deepEqual(compat("abliteration", "abliterated-model"), {
    thinkingLevels: ["low"],
    maxTokensField: "max_tokens",
    promptCacheKeyMode: "enabled",
  });
  // OpenCode: tools.strict from the model API; not stated keeps today's false.
  assert.deepEqual(compat("opencode", "kimi-k3"), { thinkingLevels: ["low"], supportsStrictMode: true });
  assert.deepEqual(compat("opencode", "big-pickle"), { thinkingLevels: ["low"], supportsStrictMode: false });
  assert.deepEqual(compat("opencode", "claude-opus-5"), {
    thinkingLevels: ["low"],
    codeMode: "capable",
    forceAdaptiveThinking: true,
  });
  assert.deepEqual(compat("opencode-go", "kimi-k2.6"), { thinkingLevels: ["low"] });
  assert.deepEqual(compat("opencode-go", "deepseek-v4.1-flash"), {
    thinkingLevels: ["low"],
    supportsStrictMode: false,
    supportsReasoningEffort: true,
  });
  assert.deepEqual(compat("nvidia", "nvidia/nemotron-3.5-super-vl-120b-a12b"), { thinkingLevels: ["low"] });
  assert.deepEqual(out["stepfun-plan"].models[0], { id: "step-3.7-flash", maxTokens: 65536, compat: { maxTokensField: "max_tokens" } });
  assert.equal(out.baseten.models[0].maxTokens, 262144);
});

test("the GPT-6.2 family rules mark every GPT-6.2 row and no other GPT", () => {
  const { overrides } = read(path.join(root, "sources/clawpod-providers.json"));
  const family = overrides.filter((o) => o.set.compat && "cachesInstructions" in o.set.compat);
  assert.deepEqual(
    family.map((o) => [o.provider, o.model, o.set]),
    [
      ["*", "gpt-6-2*", { compat: { cachesInstructions: false } }],
      ["*", "openai-gpt-62*", { compat: { cachesInstructions: false } }],
    ],
  );
  const hit = (p, id) => family.some((o) => ruleMatches(o, p, id));
  for (const [p, id] of [
    ["openai", "gpt-6.2-sol"],
    ["openai-codex", "gpt-6.2-astra"],
    ["openrouter", "openai/gpt-6.2-astra-pro:batch"],
    ["amazon-bedrock", "global.openai.gpt-6.2-sol"],
    ["amazon-bedrock-mantle", "openai.gpt-6.2-astra"],
    ["venice", "openai-gpt-62-sol-pro"],
  ]) {
    assert.ok(hit(p, id), `${p}/${id}`);
  }
  for (const [p, id] of [
    ["openai", "gpt-6-astra"],
    ["openai", "gpt-6.1-sol"],
    ["openai", "gpt-5.6-sol"],
    ["venice", "openai-gpt-6-astra"],
  ]) {
    assert.ok(!hit(p, id), `${p}/${id}`);
  }
  const artifact = read(path.join(root, "models/v1/catalog.json"));
  const marked = Object.entries(artifact.providers).flatMap(([p, v]) =>
    v.models.filter((m) => hit(p, m.id)).map((m) => [`${p}/${m.id}`, m.compat?.cachesInstructions]),
  );
  assert.ok(marked.length >= 36, `${marked.length} rows`);
  for (const [ref, value] of marked) assert.equal(value, false, ref);
});

test("China MiniMax keys copy the global MiniMax rows without a price", () => {
  const s = read(path.join(root, "sources/clawpod-providers.json"));
  const noCost = ({ cost: _cost, ...m }) => m;
  const preview = s.providers["minimax-portal"].models.find((m) => m.id === "MiniMax-M3.1-Flash-Preview");
  // The global pay-as-you-go key keeps resolving the Preview id as a retired row.
  assert.deepEqual(s.providers.minimax.models.at(-1), preview);
  assert.deepEqual(s.providers["minimax-cn"], {
    api: s.providers.minimax.api,
    models: s.providers.minimax.models.map(noCost),
  });
  assert.deepEqual(s.providers["minimax-portal-cn"], s.providers["minimax-portal"]);
  const artifact = read(path.join(root, "models/v1/catalog.json"));
  for (const [cn, global] of [["minimax-cn", "minimax"], ["minimax-portal-cn", "minimax-portal"]]) {
    assert.deepEqual(
      artifact.providers[cn].models,
      artifact.providers[global].models.map(noCost),
      `${cn} publishes the ${global} rows and Effort`,
    );
  }
  assert.ok(SUBSCRIPTION_PROVIDERS.has("minimax-portal-cn"));
});

// NVIDIA retired ids the Agent also resolves as nested ids: fact fields only, from the inner row (I3h).
const NVIDIA_INNER = { "moonshotai/kimi-k3": ["moonshot", "kimi-k3"], "z-ai/glm-5.2": ["zai", "glm-5.2"] };

test("NVIDIA kimi-k3 and glm-5.2 retired rows copy the inner rows' facts and no request compat", () => {
  const artifact = read(path.join(root, "models/v1/catalog.json"));
  const get = (p, id) => artifact.providers[p].models.find((m) => m.id === id);
  const facts = (m) => ({
    name: m.name, input: m.input, reasoning: m.reasoning, contextWindow: m.contextWindow, maxTokens: m.maxTokens,
    thinkingLevels: m.compat?.thinkingLevels, defaultThinkingLevel: m.compat?.defaultThinkingLevel,
  });
  for (const [id, [p, innerId]] of Object.entries(NVIDIA_INNER)) {
    const row = get("nvidia", id);
    const inner = facts(get(p, innerId));
    // I5 gave moonshot/kimi-k3 the official low/high/max; the retired NVIDIA row keeps the max-only
    // copy its own rule froze (changing it changes that path's request, follow-up F3).
    if (id === "moonshotai/kimi-k3") Object.assign(inner, { thinkingLevels: ["max"], defaultThinkingLevel: "max" });
    assert.deepEqual(facts(row), inner, id);
    assert.equal(row.status, "deprecated", id);
    // The Moonshot and Z.ai rates are not NVIDIA prices.
    assert.equal(row.cost, undefined, id);
    assert.equal(row.thinkingLevelMap, undefined, id);
    assert.deepEqual(Object.keys(row.compat).sort(), ["defaultThinkingLevel", "thinkingLevels"], id);
  }
});

test("retired Agent ids stay as retired rows with the Agent values and no price", () => {
  const s = read(path.join(root, "sources/clawpod-providers.json"));
  const artifact = read(path.join(root, "models/v1/catalog.json"));
  const ids = (p) => s.providers[p].models.map((m) => m.id);
  assert.deepEqual(ids("kimi"), ["kimi-code", "k2p5"]);
  assert.deepEqual(ids("kilocode"), ["kilo/auto"]);
  assert.deepEqual(ids("nvidia"), [
    "nvidia/nemotron-3-super-120b-a12b",
    "minimaxai/minimax-m3",
    "moonshotai/kimi-k2.5",
    "minimaxai/minimax-m2.5",
    "z-ai/glm5",
    "moonshotai/kimi-k3",
    "z-ai/glm-5.2",
  ]);
  assert.equal(s.providers.kimi.models[1].name, "Kimi Code (legacy model id)");
  for (const p of ["kimi", "kilocode", "nvidia"]) {
    for (const m of s.providers[p].models) {
      assert.equal(m.status, "deprecated", `${p}/${m.id}`);
      assert.equal(m.cost, undefined, `${p}/${m.id}`);
      // replacedBy only where the provider names the target, and it must be active.
      if (m.replacedBy) {
        const target = artifact.providers[p].models.find((x) => x.id === m.replacedBy);
        assert.ok(target && !target.status, `${p}/${m.replacedBy}`);
      }
    }
  }
  assert.deepEqual(
    s.providers.kimi.models.map((m) => m.replacedBy),
    ["kimi-for-coding", "kimi-for-coding"],
  );
});

test("rows the supplement lists as non-chat are dropped by exact provider and id", () => {
  const f = fixture();
  f.upstream.providers.openai.models.push(localModel("voice-only"));
  f.upstream.providers.gateway = {
    api: "openai-completions",
    models: [localModel("openai/voice-only"), localModel("openai/voice-only-2")],
  };
  f.supplement.nonChatModels = [
    {
      provider: "gateway",
      model: "openai/voice-only",
      source: "https://example.com/voice-only",
      reason: "Realtime endpoint only",
    },
    {
      provider: "openai",
      model: "voice-only",
      source: "https://example.com/voice-only",
      reason: "Realtime endpoint only",
    },
  ];
  const next = buildCatalog(f);
  const ids = (p) => next.providers[p].models.map((m) => m.id);
  assert.deepEqual(ids("openai"), ["gpt"]);
  // Exact ids only: a sibling id stays.
  assert.deepEqual(ids("gateway"), ["openai/voice-only-2"]);
});

for (const [label, rule] of [
  ["a provider wildcard", { provider: "*", model: "voice-only" }],
  ["a model prefix", { provider: "openai", model: "voice-*" }],
  ["a missing source", { provider: "openai", model: "voice-only", source: undefined }],
  ["a missing reason", { provider: "openai", model: "voice-only", reason: undefined }],
]) {
  test(`non-chat rules reject ${label}`, () => {
    const f = fixture();
    f.supplement.nonChatModels = [
      { source: "https://example.com/x", reason: "Realtime endpoint only", ...rule },
    ];
    assert.throws(() => buildCatalog(f));
  });
}

test("committed non-chat rules drop the reviewed realtime rows", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const f = { ...fixture(), supplement };
  const realtime = [
    "openai/gpt-realtime-1.5",
    "openai/gpt-realtime-2",
    "openai/gpt-realtime-2.1",
    "openai/gpt-realtime-mini",
    "openai/gpt-live-1",
    "google/gemini-3.8-live",
    "google/gemini-3.8-live-extended-thinking",
  ];
  f.upstream.providers.openai.models.push(localModel("gpt-realtime-2.1"), localModel("gpt-audio"));
  f.upstream.providers["vercel-ai-gateway"] = {
    api: "anthropic-messages",
    models: [...realtime, "openai/gpt-6.2-sol"].map((id) => localModel(id)),
  };
  const next = buildCatalog(f);
  const ids = (p) => next.providers[p].models.map((m) => m.id);
  const manual = new Set(supplement.providers.openai.models.map((m) => m.id));
  assert.deepEqual(
    ids("openai").filter((id) => !manual.has(id)),
    ["gpt", "gpt-audio"],
  );
  assert.deepEqual(ids("vercel-ai-gateway"), ["openai/gpt-6.2-sol"]);
});

test("I3h rules reach exactly their target rows", () => {
  const s = read(path.join(root, "sources/clawpod-providers.json"));
  const artifact = read(path.join(root, "models/v1/catalog.json"));
  const rows = Object.entries(artifact.providers).flatMap(([p, v]) => v.models.map((m) => [p, m]));
  const refs = (pred) => rows.filter(([p, m]) => pred(p, m)).map(([p, m]) => `${p}/${m.id}`).sort();
  // forceAdaptiveThinking: the ten Claude families on every provider plus the eight MiniMax rows.
  const families = s.overrides.filter((o) => o.provider === "*" && o.set.compat?.forceAdaptiveThinking === true);
  assert.equal(families.length, 10);
  const minimax = ["minimax", "minimax-cn", "minimax-portal", "minimax-portal-cn"].flatMap((p) =>
    ["MiniMax-M3", "MiniMax-M3.1-Flash-Preview"].map((id) => `${p}/${id}`),
  ).concat("opencode-go/minimax-m3");
  assert.deepEqual(
    refs((p, m) => m.compat?.forceAdaptiveThinking === true),
    [...refs((p, m) => families.some((o) => ruleMatches(o, p, m.id))), ...minimax].sort(),
  );
  for (const [, m] of rows) if (m.compat?.forceAdaptiveThinking) assert.match(m.id, /claude|MiniMax-M3/i);
  // Rule maps land on these rows only, after the level filter.
  assert.deepEqual(refs((p, m) => s.thinking.some((r) => r.map && ruleMatches(r, p, m.id) && s.thinking.find((x) => ruleMatches(x, p, m.id)) === r)), [
    "amazon-bedrock-mantle/anthropic.claude-sonnet-5-5",
    "anthropic-vertex/claude-sonnet-5-5",
    "anthropic/claude-sonnet-5-5",
    "codex/gpt-6-astra",
    "codex/gpt-6.1-sol",
    "codex/gpt-6.2-astra",
    "codex/gpt-6.2-sol",
    "moonshot/kimi-k3",
    "moonshot/kimi-k3.1-pro",
    "moonshot/kimi-k3.1-pro-highspeed",
    "openai-codex/gpt-6-astra",
    "openai-codex/gpt-6.1-sol",
    "openai-codex/gpt-6.2-astra",
    "openai-codex/gpt-6.2-sol",
    "openai/gpt-6-astra",
    "openai/gpt-6.1-sol",
    "openai/gpt-6.2-astra",
    "openai/gpt-6.2-sol",
    "openai/gpt-daybreak-blue-latest",
    "opencode-go/gemini-4-argon",
    "opencode/gemini-3.7-flash",
    "opencode/gemini-3.8-flash",
    "opencode/gemini-4-argon",
    "xai/grok-4-0709",
    "xai/grok-4.20",
    "xai/grok-4.20-0309-reasoning",
  ]);
  const get = (p, id) => artifact.providers[p].models.find((m) => m.id === id);
  assert.deepEqual(get("anthropic-vertex", "claude-sonnet-5-5").compat.thinkingLevels[0], "off");
  assert.equal(get("anthropic-vertex", "claude-sonnet-5-5").thinkingLevelMap.off, null);
  // grok-build-0.1 takes xAI's official ladder since G1 (2026-11-24); the other three stay always on.
  for (const id of ["grok-4.20", "grok-4.20-0309-reasoning", "grok-4-0709"]) {
    assert.deepEqual([get("xai", id).compat.thinkingLevels, get("xai", id).thinkingLevelMap], [["low"], { low: null }], id);
  }
  // Effort support and Mistral output caps.
  assert.deepEqual(refs((p, m) => p === "mistral" && m.compat?.supportsReasoningEffort === true), [
    "mistral/mistral-large-4", "mistral/mistral-large-latest", "mistral/mistral-medium-3-5", "mistral/mistral-small-2603",
    "mistral/mistral-small-latest", "mistral/zai-glm-5-3", "mistral/zai-glm-5-3-flash",
  ]);
  assert.deepEqual(refs((p, m) => p === "kilocode" && m.compat?.supportsReasoningEffort === false), [
    "kilocode/kilo/auto", "kilocode/x-ai/grok-4.20", "kilocode/x-ai/grok-4.20-reasoning", "kilocode/x-ai/grok-4.20-reasoning-beta",
  ]);
  for (const [, m] of rows.filter(([p]) => p === "mistral")) assert.ok(m.maxTokens < m.contextWindow, m.id);
  assert.equal(get("mistral", "mistral-medium-latest").maxTokens, 16384);
});

test("I5 rules give the reviewed rows their official levels and keep today's requests", () => {
  const s = read(path.join(root, "sources/clawpod-providers.json"));
  const artifact = read(path.join(root, "models/v1/catalog.json"));
  const get = (p, id) => artifact.providers[p].models.find((m) => m.id === id);
  const profile = (p, id) => {
    const m = get(p, id);
    return [m.compat.thinkingLevels, m.compat.defaultThinkingLevel, m.compat.thinkingLevelLabels];
  };
  // Provider rules sit before the first * rule, so each one is its row's first match.
  const firstStar = s.thinking.findIndex((r) => r.provider === "*");
  for (const [p, id] of [
    ["moonshot", "kimi-k3"], ["qwen-token-plan", "glm-5"], ["qwen-token-plan", "glm-5.1"],
    ["openai", "gpt-daybreak-blue-latest"], ["baseten", "moonshotai/Kimi-K3"], ["baseten", "openai/gpt-oss-120b"],
  ]) {
    const first = s.thinking.findIndex((r) => ruleMatches(r, p, id));
    assert.ok(first >= 0 && first < firstStar, `${p}/${id}`);
  }
  for (const id of ["kimi-k3", "kimi-k3.1-pro", "kimi-k3.1-pro-highspeed"]) {
    assert.deepEqual(profile("moonshot", id), [["low", "high", "max"], "max", undefined], id);
    assert.deepEqual(get("moonshot", id).thinkingLevelMap, {
      off: null, minimal: null, low: "low", medium: null, high: "high", xhigh: null, max: "max",
    }, id);
    assert.equal(get("moonshot", id).compat.supportedReasoningEfforts, undefined, id);
    assert.equal(get("moonshot", id).compat.thinkingRequired, true, id);
  }
  // The on/off switch is high here (the route does not take low), labeled on, never the old low label.
  for (const id of ["glm-5", "glm-5.1"]) {
    assert.deepEqual(profile("qwen-token-plan", id), [["off", "high"], "high", { high: "on" }], id);
  }
  assert.deepEqual(profile("openai", "gpt-daybreak-blue-latest"), [["off", "low", "medium", "high", "xhigh", "max"], "low", undefined]);
  assert.equal(get("openai", "gpt-daybreak-blue-latest").thinkingLevelMap.off, "none");
  assert.equal(get("openai", "gpt-daybreak-blue-latest").compat.supportedReasoningEfforts, undefined);
  assert.deepEqual(profile("baseten", "moonshotai/Kimi-K3"), [["off", "low", "high", "max"], "max", undefined]);
  assert.deepEqual(profile("baseten", "openai/gpt-oss-120b"), [["off", "minimal", "low", "medium", "high"], "medium", undefined]);
});

test("OpenAI GPT-6 rows that reject none state low for calls that pass no level, off unlisted", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const f = fixture();
  f.upstream.providers.openai.models.push(
    ...["gpt-6-astra", "gpt-6.1-sol", "gpt-6.2-astra", "gpt-6.2-sol"].map((id) => ({
      ...localModel(id),
      thinkingLevelMap: { off: null, minimal: "low", xhigh: "xhigh", max: "max" },
    })),
  );
  const next = buildCatalog({ ...f, supplement });
  for (const provider of ["openai", "openai-codex", "codex"]) {
    for (const id of ["gpt-6-astra", "gpt-6.1-sol", "gpt-6.2-astra", "gpt-6.2-sol"]) {
      const row = next.providers[provider].models.find((m) => m.id === id);
      assert.ok(row, `missing ${provider}/${id}`);
      assert.equal(row.thinkingLevelMap?.off, "low", `${provider}/${id}`);
      assert.deepEqual(row.compat.thinkingLevels, ["low", "medium", "high", "xhigh", "max"], `${provider}/${id}`);
    }
  }
});

// The ClawPoD Agent rewrites a configured model id in two layers before it looks the row
// up: the static rules (normalizeStaticProviderModelId in src/agents/model-ref-shared.ts and
// src/plugin-sdk/provider-model-id-normalize.ts), then the provider plugin normalizeModelId
// hook (src/agents/model-selection-normalize.ts): the Anthropic aliases in
// extensions/anthropic/register.runtime.ts; the Google and xAI hooks call the same tables
// again. A row whose id it rewrites to another row of the same provider is never read. This
// copies both layers; this repo cannot import Agent code, so re-copy them when the Agent
// changes them.
const AGENT_ANTHROPIC_IDS = { "opus-4.6": "claude-opus-4-6", "opus-4.5": "claude-opus-4-5", "sonnet-4.6": "claude-sonnet-4-6", "sonnet-4.5": "claude-sonnet-4-5" };
// Plugin hook layer (anthropic only; the vercel-ai-gateway branch uses the static table only).
const AGENT_ANTHROPIC_PLUGIN_ALIASES = { fable: "claude-fable-5", opus: "claude-opus-4-8", sonnet: "claude-sonnet-5" };
const AGENT_GOOGLE_IDS = {
  "gemini-3-pro": "gemini-3.1-pro-preview", "gemini-3-pro-preview": "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite-preview": "gemini-3.1-flash-lite", "gemini-3-flash": "gemini-3-flash-preview",
  "gemini-3.1-pro": "gemini-3.1-pro-preview", "gemini-3.1-flash": "gemini-3-flash-preview",
  "gemini-3.1-flash-preview": "gemini-3-flash-preview",
};
const AGENT_XAI_IDS = {
  "grok-4.5-latest": "grok-4.5", "grok-build-latest": "grok-4.5", "grok-4.3-latest": "grok-4.3",
  "grok-code-fast-1": "grok-build-0.1", "grok-code-fast": "grok-build-0.1", "grok-code-fast-1-0825": "grok-build-0.1",
  "grok-4-fast-reasoning": "grok-4-fast", "grok-4-1-fast-reasoning": "grok-4-1-fast",
  "grok-4.20-experimental-beta-0304-reasoning": "grok-4.20-0309-reasoning",
  "grok-4.20-experimental-beta-0304-non-reasoning": "grok-4.20-0309-non-reasoning",
  "grok-4.20-reasoning": "grok-4.20-0309-reasoning", "grok-4.20-beta-latest-reasoning": "grok-4.20-0309-reasoning",
  "grok-4.20-non-reasoning": "grok-4.20-0309-non-reasoning", "grok-4.20-beta-latest-non-reasoning": "grok-4.20-0309-non-reasoning",
};
function agentModelId(provider, id) {
  const anthropic = (m) => AGENT_ANTHROPIC_IDS[m.trim().toLowerCase()] ?? m.trim();
  if (provider === "anthropic") {
    const statics = anthropic(id);
    return AGENT_ANTHROPIC_PLUGIN_ALIASES[statics.toLowerCase()] ?? statics;
  }
  if (provider === "huggingface") return id.trim().toLowerCase().startsWith("huggingface/") ? id.trim().slice("huggingface/".length) : id.trim();
  if (provider === "google" || provider === "google-vertex") return AGENT_GOOGLE_IDS[id] ?? id;
  if (provider === "openrouter" && !id.includes("/")) return `openrouter/${id}`;
  if (provider === "xai") return AGENT_XAI_IDS[id] ?? id;
  if (provider === "vercel-ai-gateway" && !id.includes("/") && anthropic(id).startsWith("claude-")) return `anthropic/${anthropic(id)}`;
  return id;
}

test("rows the ClawPoD Agent reads under another id agree on the values it uses", () => {
  const artifact = read(path.join(root, "models/v1/catalog.json"));
  const pairs = [];
  for (const [provider, entry] of Object.entries(artifact.providers)) {
    for (const skipped of entry.models) {
      const readId = agentModelId(provider, skipped.id);
      const read = readId !== skipped.id && entry.models.find((m) => m.id === readId);
      if (!read) continue;
      pairs.push(`${provider}/${skipped.id} -> ${readId}`);
      for (const key of ["reasoning", "maxTokens", "contextWindow"]) {
        assert.equal(skipped[key], read[key], `${provider} ${skipped.id} vs ${readId}: ${key}`);
      }
    }
  }
  // A new pair needs the same check; a missing one means a row or a rule moved.
  assert.deepEqual(pairs.sort(), [
    "google-vertex/gemini-3.1-flash-preview -> gemini-3-flash-preview",
    "google/gemini-3.1-flash-preview -> gemini-3-flash-preview",
    "openrouter/auto -> openrouter/auto",
  ]);
  assert.equal(artifact.providers.openrouter.models.find((m) => m.id === "openrouter/auto").reasoning, false);
});

test("provider rules that only add a map keep the levels and default of the * rule they shadow", () => {
  const s = read(path.join(root, "sources/clawpod-providers.json"));
  const gpt6 = s.thinking.filter((r) => r.map?.off === "low" && ["openai", "openai-codex", "codex"].includes(r.provider));
  assert.equal(gpt6.length, 12);
  for (const rule of gpt6) {
    // The rule's own model pattern names original ids; the * rules name model keys.
    const star = s.thinking.find((r) => r.provider === "*" && ruleMatches(r, rule.provider, rule.model.replace(/\*$/, "")));
    assert.ok(star, `${rule.provider}/${rule.model}`);
    assert.deepEqual([rule.levels, rule.default], [star.levels, star.default], `${rule.provider}/${rule.model} vs * ${star.model}`);
  }
});

test("Bedrock Nova v1 and Vercel DeepSeek V4 Flash vision use the documented output caps", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const f = fixture();
  f.upstream.providers["amazon-bedrock"] = {
    api: "bedrock-converse-stream",
    models: ["amazon.nova-pro-v1:0", "amazon.nova-lite-v1:0", "amazon.nova-micro-v1:0", "amazon.nova-premier-v1:0"].map((id) => ({ ...localModel(id), maxTokens: 8_192 })),
  };
  f.upstream.providers["vercel-ai-gateway"] = {
    api: "anthropic-messages",
    models: [{ ...localModel("deepseek/deepseek-v4-flash-vision-exp"), contextWindow: 1_048_576, maxTokens: 1_048_576 }],
  };
  const next = buildCatalog({ ...f, supplement });
  for (const id of ["amazon.nova-pro-v1:0", "amazon.nova-lite-v1:0", "amazon.nova-micro-v1:0", "amazon.nova-premier-v1:0"]) {
    assert.equal(next.providers["amazon-bedrock"].models.find((m) => m.id === id)?.maxTokens, 10_000, id);
  }
  assert.equal(next.providers["vercel-ai-gateway"].models[0].maxTokens, 384_000);
});

// G1 follow-ups (2026-11-24): DeepSeek V4 output caps, Grok Build official ladder, catalog row fixes.
const G1_DEEPSEEK = {
  openrouter: ["~deepseek/deepseek-pro-latest", "~deepseek/deepseek-flash-latest", "~deepseek/deepseek-v4-flash-latest",
    "deepseek/deepseek-v4-flash-0731", "deepseek/deepseek-v4-pro-0813", "deepseek/deepseek-v4.1-flash-1017:batch"],
  kilocode: ["~deepseek/deepseek-flash-latest", "~deepseek/deepseek-v4-flash-latest", "deepseek/deepseek-v4-flash-0731",
    "deepseek/deepseek-v4-pro-0813", "deepseek/deepseek-v4.1-flash-1017-ultrafast", "~deepseek/deepseek-pro-latest"],
  deepinfra: ["deepseek-ai/DeepSeek-V4-Flash", "deepseek-ai/DeepSeek-V4-Pro"],
  "ollama-cloud": ["deepseek-v4-pro", "deepseek-v4-pro:0813"],
  "vercel-ai-gateway": ["deepseek/deepseek-v4-pro", "deepseek/deepseek-v4-pro-0813", "deepseek/deepseek-v4.1-flash",
    "deepseek/deepseek-v4.1-flash-1017-ultrafast"],
};

test("DeepSeek V4 rows on gateways cap a response at DeepSeek's documented 393216 tokens", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const f = fixture();
  for (const [provider, ids] of Object.entries(G1_DEEPSEEK)) {
    f.upstream.providers[provider] = {
      api: "openai-completions",
      models: ids.map((id) => ({ ...localModel(id), contextWindow: 1_048_576, maxTokens: 1_048_576 })),
    };
  }
  const next = buildCatalog({ ...f, supplement });
  let n = 0;
  for (const [provider, ids] of Object.entries(G1_DEEPSEEK)) {
    for (const id of ids) {
      assert.equal(next.providers[provider].models.find((m) => m.id === id)?.maxTokens, 393_216, `${provider}/${id}`);
      n++;
    }
  }
  assert.equal(n, 20);
});

test("Grok Build: xAI official ladder and window, Venice row as before, OpenCode one on level", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const f = fixture();
  f.upstream.providers.xai = {
    api: "openai-responses",
    models: [{ ...localModel("grok-build-0.1"), contextWindow: 256_000, maxTokens: 64_000, compat: { defaultThinkingLevel: "off", thinkingLevels: ["off"] } }],
  };
  f.upstream.providers.venice = { api: "openai-completions", models: [{ ...localModel("grok-build-0-1"), contextWindow: 256_000, maxTokens: 65_536 }] };
  const next = buildCatalog({ ...f, supplement });
  const get = (p, id) => next.providers[p].models.find((m) => m.id === id);
  const xai = get("xai", "grok-build-0.1");
  assert.deepEqual([xai.compat.thinkingLevels, xai.compat.defaultThinkingLevel, xai.compat.thinkingLevelLabels, xai.thinkingLevelMap],
    [["low", "medium", "high", "xhigh"], "high", undefined, undefined]);
  assert.equal(xai.contextWindow, 500_000);
  assert.equal(xai.maxTokens, 64_000);
  // Venice reports no effort control: the row keeps today's single always-on level.
  const venice = get("venice", "grok-build-0-1");
  assert.deepEqual(venice.compat, { thinkingLevels: ["low"], defaultThinkingLevel: "low", thinkingLevelLabels: { low: "on" } });
  assert.equal(venice.thinkingLevelMap, undefined);
  // The venice rule must come before the * grok-build* rule (first match wins, * rules match model keys).
  const veniceRule = supplement.thinking.findIndex((r) => r.provider === "venice" && r.model === "grok-build-0-1");
  const starRule = supplement.thinking.findIndex((r) => r.provider === "*" && r.model === "grok-build*");
  assert.ok(veniceRule >= 0 && veniceRule < starRule);
  assert.equal(supplement.thinking.some((r) => r.provider === "xai" && r.model.startsWith("grok-build")), false);
  const opencode = get("opencode", "grok-build-0.1");
  assert.deepEqual([opencode.compat.thinkingLevels, opencode.compat.defaultThinkingLevel, opencode.compat.thinkingLevelLabels],
    [["high"], "high", { high: "on" }]);
});

test("mistral-large-latest and Baseten Kimi K3.1 Pro send the effort they list; mistral-large-4-0-8 unchanged", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const f = fixture();
  f.upstream.providers.mistral = {
    api: "openai-completions",
    models: ["mistral-large-latest", "mistral-large-4-0-8"].map((id) => ({ ...localModel(id), contextWindow: 262_144, maxTokens: 16_384 })),
  };
  f.upstream.providers.baseten = { api: "openai-completions", models: [{ ...localModel("moonshotai/Kimi-K3.1-Pro"), contextWindow: 1_048_576, maxTokens: 262_144 }] };
  const next = buildCatalog({ ...f, supplement });
  const get = (p, id) => next.providers[p].models.find((m) => m.id === id);
  assert.equal(get("mistral", "mistral-large-latest").compat.supportsReasoningEffort, true);
  assert.equal(get("mistral", "mistral-large-4-0-8").compat?.supportsReasoningEffort, undefined);
  const kimi = get("baseten", "moonshotai/Kimi-K3.1-Pro");
  assert.deepEqual([kimi.compat.thinkingLevels, kimi.compat.defaultThinkingLevel, kimi.compat.supportsReasoningEffort], [["low", "high", "max"], "max", true]);
});

test("Mantle Haiku 5.5 row publishes the Bedrock Haiku 5.5 effort profile without a price", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const next = buildCatalog({ ...fixture(), supplement });
  const mantle = next.providers["amazon-bedrock-mantle"].models.find((m) => m.id === "anthropic.claude-haiku-5-5");
  assert.ok(mantle, "missing amazon-bedrock-mantle/anthropic.claude-haiku-5-5");
  const expected = { forceAdaptiveThinking: true, thinkingLevels: ["off", "low", "medium", "high", "xhigh", "max"], defaultThinkingLevel: "medium" };
  assert.deepEqual(mantle.compat, expected);
  assert.deepEqual(next.providers["amazon-bedrock"].models.find((m) => m.id === "global.anthropic.claude-haiku-5-5").compat, expected);
  assert.deepEqual([mantle.api, mantle.contextWindow, mantle.maxTokens, mantle.cost], ["anthropic-messages", 1_000_000, 128_000, undefined]);
  assert.ok(supplement.knownGaps.some((g) => g.provider === "amazon-bedrock-mantle" && g.model === "anthropic.claude-haiku-5-5" && g.check === "cost"));
});

test("xAI Grok Build is published as disabled after xAI ended it; the gateway copies keep their own state", () => {
  // xAI release notes: "grok-build-0.1 reached end of life on November 19, 2026 and is no longer served on the API."
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  assert.equal(supplement.providers.xai.models.some((m) => m.id === "grok-build-0.1"), false, "no manual xai row");
  const f = fixture();
  f.upstream.providers.xai = { api: "openai-responses", models: [{ ...localModel("grok-build-0.1"), contextWindow: 256_000, maxTokens: 64_000 }] };
  f.upstream.providers.venice = { api: "openai-completions", models: [{ ...localModel("grok-build-0-1"), status: "deprecated" }] };
  const next = buildCatalog({ ...f, supplement });
  const get = (p, id) => next.providers[p].models.find((m) => m.id === id);
  assert.equal(get("xai", "grok-build-0.1").status, "disabled");
  assert.equal(get("venice", "grok-build-0-1").status, "deprecated");
  assert.equal(get("opencode", "grok-build-0.1").status, undefined);
});

// Rows upstream dropped while the provider still serves them (OpenAI and Anthropic deprecation
// pages, 2026-11-24): restored as manual rows with the values of their last published row.
const RESTORED = {
  openai: {
    "gpt-4.1-mini": ["GPT-4.1 mini", false, 1_047_576, 32_768, { input: 0.4, output: 1.6, cacheRead: 0.1, cacheWrite: 0 }],
    "gpt-4o": ["GPT-4o", false, 128_000, 16_384, { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 0 }],
    "gpt-4o-2024-08-06": ["GPT-4o (2024-08-06)", false, 128_000, 16_384, { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 0 }],
    "gpt-4o-2024-11-20": ["GPT-4o (2024-11-20)", false, 128_000, 16_384, { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 0 }],
    "gpt-4o-mini": ["GPT-4o mini", false, 128_000, 16_384, { input: 0.15, output: 0.6, cacheRead: 0.075, cacheWrite: 0 }],
    "gpt-5": ["GPT-5", true, 400_000, 128_000, { input: 1.25, output: 10, cacheRead: 0.125, cacheWrite: 0 }, [["minimal", "low", "medium", "high"], "medium"]],
    "gpt-5-mini": ["GPT-5 Mini", true, 400_000, 128_000, { input: 0.25, output: 2, cacheRead: 0.025, cacheWrite: 0 }, [["minimal", "low", "medium", "high"], "medium"]],
    "gpt-5-nano": ["GPT-5 Nano", true, 400_000, 128_000, { input: 0.05, output: 0.4, cacheRead: 0.005, cacheWrite: 0 }, [["minimal", "low", "medium", "high"], "medium"]],
    "gpt-5-pro": ["GPT-5 Pro", true, 400_000, 272_000, { input: 15, output: 120, cacheRead: 0, cacheWrite: 0 }, [["high"], "high"]],
    "gpt-5.1": ["GPT-5.1", true, 400_000, 128_000, { input: 1.25, output: 10, cacheRead: 0.125, cacheWrite: 0 }, [["off", "low", "medium", "high"], "off"]],
    "gpt-5.3-codex": ["GPT-5.3 Codex", true, 400_000, 128_000, { input: 1.75, output: 14, cacheRead: 0.175, cacheWrite: 0 }, [["low", "medium", "high", "xhigh"], "medium"]],
    o3: ["o3", true, 200_000, 100_000, { input: 2, output: 8, cacheRead: 0.5, cacheWrite: 0 }, [["low", "medium", "high"], "medium"]],
    "o3-pro": ["o3-pro", true, 200_000, 100_000, { input: 20, output: 80, cacheRead: 0, cacheWrite: 0 }, [["low", "medium", "high"], "medium"]],
  },
  anthropic: {
    "claude-opus-4-5": ["Claude Opus 4.5 (latest)", true, 200_000, 64_000, { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 }, [["off", "minimal", "low", "medium", "high"], "off"]],
    "claude-opus-4-5-20251101": ["Claude Opus 4.5", true, 200_000, 64_000, { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 }, [["off", "minimal", "low", "medium", "high"], "off"]],
  },
};

// The last published rows that listed native document (PDF) input, which the Agent reads.
const RESTORED_DOCUMENT = new Set([
  "openai/gpt-4.1-mini", "openai/gpt-4o", "openai/gpt-4o-mini", "openai/gpt-5.3-codex", "openai/o3",
  "anthropic/claude-opus-4-5", "anthropic/claude-opus-4-5-20251101",
]);

test("manual rows may list document input like upstream rows; other input kinds stay rejected", () => {
  const base = read(path.join(root, "sources/clawpod-providers.json"));
  const withInput = (input) => {
    const s = structuredClone(base);
    s.providers.openai.models[0].input = input;
    return s;
  };
  assert.doesNotThrow(() => validateSupplement(withInput(["text", "image", "document"])));
  assert.throws(() => validateSupplement(withInput(["text", "video"])));
  assert.throws(() => validateSupplement(withInput(["text", "audio"])));
});

test("still-served OpenAI and Anthropic rows upstream dropped publish their last published values", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const next = buildCatalog({ ...fixture(), supplement });
  for (const [provider, rows] of Object.entries(RESTORED)) {
    for (const [id, [name, reasoning, contextWindow, maxTokens, cost, effort]] of Object.entries(rows)) {
      const row = next.providers[provider].models.find((m) => m.id === id);
      assert.ok(row, `missing ${provider}/${id}`);
      assert.deepEqual(
        [row.name, row.input, row.reasoning, row.contextWindow, row.maxTokens, row.cost, row.status, row.thinkingLevelMap],
        [name, RESTORED_DOCUMENT.has(`${provider}/${id}`) ? ["text", "image", "document"] : ["text", "image"],
          reasoning, contextWindow, maxTokens, cost, undefined, undefined],
        `${provider}/${id}`,
      );
      if (effort) assert.deepEqual([row.compat.thinkingLevels, row.compat.defaultThinkingLevel], effort, `${provider}/${id}`);
      else assert.equal(row.compat, undefined, `${provider}/${id}`);
    }
  }
  // Retired or not on the API: stays out.
  assert.equal(next.providers.openai.models.some((m) => m.id === "gpt-5.3-codex-spark"), false);
});

test("Mistral rows upstream dropped while Mistral still serves them publish their last published values", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const next = buildCatalog({ ...fixture(), supplement });
  const get = (id) => next.providers.mistral.models.find((m) => m.id === id);
  const doc = ["text", "image", "document"];
  const expected = {
    "mistral-large-2512": ["Mistral Large 3", doc, false, 262_144, 8_192, { input: 0.5, output: 1.5, cacheRead: 0.05, cacheWrite: 0 }, undefined],
    "mistral-medium-2604": ["Mistral Medium 3.5", doc, true, 262_144, 8_192, { input: 1.5, output: 7.5, cacheRead: 0.15, cacheWrite: 0 }, { thinkingLevels: ["off", "high"], defaultThinkingLevel: "off" }],
    "mistral-medium-latest": ["Mistral Medium (latest)", doc, true, 262_144, 16_384, { input: 1.5, output: 7.5, cacheRead: 0.15, cacheWrite: 0 }, { thinkingLevels: ["off", "high"], defaultThinkingLevel: "off" }],
    "mistral-large-4-0-8": ["Mistral Large 4.0.8", doc, true, 1_048_576, 262_144, { input: 0.7, output: 2.1, cacheRead: 0.07, cacheWrite: 0 }, { thinkingLevels: ["low", "medium", "high"], defaultThinkingLevel: "high" }],
  };
  for (const [id, [name, input, reasoning, contextWindow, maxTokens, cost, compat]] of Object.entries(expected)) {
    const row = get(id);
    assert.ok(row, `missing mistral/${id}`);
    assert.deepEqual([row.name, row.input, row.reasoning, row.contextWindow, row.maxTokens, row.cost, row.compat, row.status],
      [name, input, reasoning, contextWindow, maxTokens, cost, compat, undefined], id);
  }
  assert.equal(next.providers.mistral.api, "openai-completions");
});

test("gateway rows whose upstream output jumped keep the output cap they publish today", () => {
  const supplement = read(path.join(root, "sources/clawpod-providers.json"));
  const f = fixture();
  f.upstream.providers.openrouter = { api: "openai-completions", models: [{ ...localModel("z-ai/glm-5.3-flash"), contextWindow: 1_048_576, maxTokens: 943_718 }] };
  f.upstream.providers.kilocode = { api: "openai-completions", models: [{ ...localModel("minimax/minimax-m3.1-flash"), contextWindow: 1_048_576, maxTokens: 943_718 }] };
  const next = buildCatalog({ ...f, supplement });
  assert.equal(next.providers.openrouter.models.find((m) => m.id === "z-ai/glm-5.3-flash").maxTokens, 131_072);
  const minimax = next.providers.kilocode.models.find((m) => m.id === "minimax/minimax-m3.1-flash");
  assert.deepEqual([minimax.contextWindow, minimax.maxTokens], [1_000_000, 512_000]);
});
