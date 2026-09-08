import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildCatalog,
  mergeProviders,
  serializeCatalog,
  stripTransportKeys,
  validateSupplement,
  MAX_PUBLISHED_BYTES,
} from "../scripts/catalog.mjs";
import { publishCatalog } from "../scripts/publish-catalog.mjs";

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
  return { dir, source, output: path.join(dir, "models/v1/catalog.json"), f };
}

test("offline CLI dry-run, write, repeat, and source-only changes obey persistence and outputs", async (t) => {
  const { dir, source, output, f } = workspace(t);
  const githubOutput = path.join(dir, "github-output");
  const options = {
    rootDir: dir,
    argv: ["--source-file", source],
    now: NOW,
    log: () => {},
    githubOutput,
    fetchImpl: () => {
      throw new Error("must not fetch");
    },
  };
  const dry = await publishCatalog({ ...options, argv: [...options.argv, "--dry-run"] });
  assert.equal(dry.changed, true);
  assert.equal(fs.existsSync(output), false);
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

test("scheduled online path merges the local file and sends bounded fetch options", async (t) => {
  const { dir, output, f } = workspace(t);
  let calls = 0;
  await publishCatalog({
    rootDir: dir,
    now: NOW,
    log: () => {},
    githubOutput: null,
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, "https://catalog.openclaw.ai/models/v1/catalog.json");
      assert.ok(options.signal instanceof AbortSignal);
      return new Response(JSON.stringify(f.upstream));
    },
  });
  assert.equal(calls, 1);
  assert.equal(read(output).providers.google.models.length, 1);
});

test("HTTP, JSON and validation failures leave the artifact untouched", async (t) => {
  const { dir, source, output } = workspace(t);
  const options = { rootDir: dir, now: NOW, log: () => {}, githubOutput: null };
  await publishCatalog({ ...options, argv: ["--source-file", source] });
  const before = fs.readFileSync(output, "utf8");
  for (const fetchImpl of [
    async () => new Response("bad", { status: 503 }),
    async () => new Response("not JSON"),
    async () => new Response("{}"),
    async () => {
      throw new Error("timeout");
    },
    async () => new Response("x".repeat(8 * 1024 * 1024 + 1)),
  ]) {
    await assert.rejects(publishCatalog({ ...options, fetchImpl }));
    assert.equal(fs.readFileSync(output, "utf8"), before);
  }
  fs.writeFileSync(output, "corrupt previous file");
  await assert.rejects(publishCatalog({ ...options, argv: ["--source-file", source] }));
  assert.equal(fs.readFileSync(output, "utf8"), "corrupt previous file");
});

test("invalid command arguments fail before fetch or write", async (t) => {
  const { dir } = workspace(t);
  for (const argv of [
    ["--unknown"],
    ["--source-file"],
    ["--source-file", "--dry-run"],
    ["--source-file", "a", "--source-file", "b"],
  ]) {
    await assert.rejects(
      publishCatalog({
        rootDir: dir,
        argv,
        fetchImpl: () => {
          assert.fail("must not fetch");
        },
      }),
      /argument|once/,
    );
  }
});

test("committed supplemental data covers the requested providers and preserves provider-specific metadata", () => {
  const s = validateSupplement(read(path.join(root, "sources/clawpod-providers.json")));
  assert.deepEqual(
    Object.keys(s.providers).sort(),
    [
      "openai-codex",
      "google",
      "google-vertex",
      "xai",
      "minimax",
      "minimax-portal",
      "amazon-bedrock",
      "amazon-bedrock-mantle",
      "anthropic-vertex",
      "openrouter",
      "zai",
    ].sort(),
  );
  const codex = s.providers["openai-codex"].models.find((m) => m.id === "gpt-6-astra");
  assert.equal(codex.contextWindow, 272_000);
  assert.equal(s.providers["google-vertex"].api, "google-vertex");
  assert.ok(
    s.providers["amazon-bedrock-mantle"].models.every((m) => m.api === "anthropic-messages"),
  );
  assert.ok(
    s.providers["anthropic-vertex"].models.some((m) => m.id === "claude-haiku-4-5@20251001"),
  );
  assert.ok(s.providers.openrouter.models.some((m) => m.id.startsWith("anthropic/")));
  assert.equal(
    s.providers.openrouter.models.find((m) => m.id === "openrouter/auto").cost,
    undefined,
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

test("missing or malformed supplement fails without fetching or changing output", async (t) => {
  const { dir, source, output } = workspace(t);
  const options = {
    rootDir: dir,
    now: NOW,
    log: () => {},
    githubOutput: null,
    argv: ["--source-file", source],
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
  assert.equal(get("openai-codex", "gpt-5.4-mini").replacedBy, "gpt-5.6-luna");
  assert.ok(next.providers["openai-codex"].models.every((m) => m.cost === undefined));
  assert.ok(next.providers["minimax-portal"].models.every((m) => m.cost === undefined));
  assert.equal(get("amazon-bedrock-mantle", "anthropic.claude-mythos-preview").cost, undefined);
  assert.equal(get("openrouter", "deepseek/deepseek-chat").maxTokens, 16384);
  assert.equal(get("openrouter", "openrouter/hunter-alpha"), undefined);
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
});
