import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCatalog } from "../scripts/catalog.mjs";
import {
  convertOpenRouterModels,
  fetchOpenRouterModels,
  MIN_OPENROUTER_MODELS,
  OPENROUTER_MODELS_URL,
  withOpenRouter,
} from "../scripts/openrouter.mjs";

const NOW = Date.UTC(2026, 9, 2);
const filler = Array.from({ length: MIN_OPENROUTER_MODELS }, (_, i) => ({
  id: `vendor/filler-${String(i).padStart(3, "0")}`,
  context_length: 8_000,
  pricing: { prompt: "0", completion: "0" },
}));
const response = (...rows) => ({ data: [...rows, ...filler] });
const convert = (...rows) => convertOpenRouterModels(response(...rows)).models;
const find = (models, id) => models.find((m) => m.id === id);

test("OpenRouter rows convert like OpenClaw's live discovery", () => {
  const models = convert(
    {
      id: "anthropic/claude-sonnet-5.5",
      name: "Anthropic: Claude Sonnet 5.5",
      context_length: 1_000_000,
      architecture: { input_modalities: ["image", "text", "file"], output_modalities: ["text"] },
      pricing: {
        prompt: "0.000002",
        completion: "0.00001",
        input_cache_read: "0.0000002",
        input_cache_write: "0.0000025",
        web_search: "0.01",
      },
      top_provider: { context_length: 1_000_000, max_completion_tokens: 128_000 },
      supported_parameters: ["include_reasoning", "tools"],
    },
    {
      id: "vendor/no-limits",
      context_length: 32_000,
      architecture: { modality: "text->text", input_modalities: ["text"] },
      pricing: { prompt: "0.00000008333333", completion: "0.0000004" },
      top_provider: { context_length: null, max_completion_tokens: null },
    },
  );
  assert.deepEqual(find(models, "anthropic/claude-sonnet-5.5"), {
    id: "anthropic/claude-sonnet-5.5",
    name: "Anthropic: Claude Sonnet 5.5",
    input: ["text", "image"],
    reasoning: true,
    contextWindow: 1_000_000,
    maxTokens: 128_000,
    cost: { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  });
  assert.deepEqual(find(models, "vendor/no-limits"), {
    id: "vendor/no-limits",
    name: "vendor/no-limits",
    input: ["text"],
    reasoning: false,
    contextWindow: 32_000,
    maxTokens: 8192,
    cost: { input: 0.08333333, output: 0.4 },
  });
  assert.deepEqual(models.map((m) => m.id), models.map((m) => m.id).toSorted());
});

test("unknown prices are omitted, free prices stay 0, unusable rows are skipped", () => {
  const models = convert(
    { id: "openrouter/auto", context_length: 2_000_000, pricing: { prompt: "-1", completion: "-1" } },
    { id: "vendor/no-price", context_length: 8_000 },
    { id: "vendor/free:free", context_length: 8_000, pricing: { prompt: "0", completion: "0" } },
    {
      id: "vendor/image-only",
      context_length: 8_000,
      architecture: { output_modalities: ["image"] },
    },
    { id: "vendor/no-context" },
    { id: "vendor/dup", name: "first", context_length: 8_000 },
    { id: "vendor/dup", name: "second", context_length: 8_000 },
  );
  assert.equal(find(models, "openrouter/auto").cost, undefined);
  assert.equal(find(models, "vendor/no-price").cost, undefined);
  assert.deepEqual(find(models, "vendor/free:free").cost, { input: 0, output: 0 });
  assert.equal(find(models, "vendor/image-only"), undefined);
  assert.equal(find(models, "vendor/no-context"), undefined);
  assert.equal(models.filter((m) => m.id === "vendor/dup").length, 1);
  assert.equal(find(models, "vendor/dup").name, "first");
});

test("a partial or malformed OpenRouter list is refused", () => {
  assert.throws(() => convertOpenRouterModels({ data: filler.slice(1) }), /partial list/);
  assert.throws(() => convertOpenRouterModels({}));
  assert.throws(() => convertOpenRouterModels({ data: [{ name: "no id" }] }));
});

test("OpenRouter rows override upstream rows and outrank the supplement", () => {
  const model = (id, extra = {}) => ({
    id,
    name: id,
    input: ["text"],
    reasoning: false,
    contextWindow: 8_000,
    maxTokens: 1_000,
    ...extra,
  });
  const upstream = {
    generatedAt: NOW - 1_000,
    providers: {
      anthropic: { api: "anthropic-messages", models: [model("claude")] },
      openai: { api: "openai-responses", models: [model("gpt")] },
      openrouter: {
        api: "openai-completions",
        models: [model("vendor/filler-000", { maxTokens: 1 }), model("upstream/only")],
      },
    },
  };
  const merged = withOpenRouter(upstream, convertOpenRouterModels({ data: filler }));
  assert.equal(upstream.providers.openrouter.models.length, 2);
  const supplement = {
    schemaVersion: 1,
    provenance: { openrouter: { source: "s", revision: "r", files: ["f"], notes: "n" } },
    providers: {
      openrouter: {
        api: "openai-completions",
        models: [model("auto"), model("vendor/filler-001", { maxTokens: 2 })],
      },
    },
  };
  const next = buildCatalog({ upstream: merged, supplement, minVersion: "2026.4.11", now: NOW });
  const rows = next.providers.openrouter.models;
  assert.equal(find(rows, "vendor/filler-000").maxTokens, 8192);
  assert.equal(find(rows, "vendor/filler-001").maxTokens, 8192);
  assert.ok(find(rows, "upstream/only"));
  assert.ok(find(rows, "auto"));
  assert.equal(rows.length, MIN_OPENROUTER_MODELS + 2);
  assert.throws(
    () =>
      withOpenRouter(
        { providers: { openrouter: { api: "anthropic-messages", models: [] } } },
        convertOpenRouterModels({ data: filler }),
      ),
    /API conflict/,
  );
});

test("fetch is bounded and validates before returning", async () => {
  let call;
  const body = await fetchOpenRouterModels(async (url, options) => {
    call = { url, options };
    return new Response(JSON.stringify({ data: filler }));
  });
  assert.equal(call.url, OPENROUTER_MODELS_URL);
  assert.ok(call.options.signal instanceof AbortSignal);
  assert.equal(JSON.parse(body.toString("utf8")).data.length, MIN_OPENROUTER_MODELS);
  for (const fetchImpl of [
    async () => new Response("bad", { status: 503 }),
    async () => new Response("not JSON"),
    async () => new Response(JSON.stringify({ data: filler.slice(1) })),
    async () => new Response("x".repeat(16 * 1024 * 1024 + 1)),
    async () => {
      throw new Error("timeout");
    },
  ]) {
    await assert.rejects(fetchOpenRouterModels(fetchImpl));
  }
});
