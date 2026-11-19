import assert from "node:assert/strict";
import { test } from "node:test";
import { applyOverrides, validateSupplement } from "../scripts/catalog.mjs";
import { parseModelsDev } from "../scripts/models-dev.mjs";
import { applyThinking, modelKey, thinkingCoverage, thinkingReport } from "../scripts/thinking.mjs";

const row = (id, extra = {}) => ({ id, reasoning: true, ...extra });
const profile = (providers, provider, id) => {
  const compat = providers[provider].models.find((m) => m.id === id).compat ?? {};
  return {
    levels: compat.thinkingLevels,
    default: compat.defaultThinkingLevel,
    labels: compat.thinkingLevelLabels,
  };
};

test("OpenRouter metadata becomes an ordered ladder and session default", () => {
  const openRouter = [
    {
      id: "vendor/always-on",
      reasoning: { mandatory: true, supported_efforts: ["xhigh", "high", "low"], default_effort: "high" },
    },
    {
      id: "vendor/off-by-default",
      reasoning: {
        mandatory: false,
        default_enabled: false,
        supported_efforts: ["max", "high", "none"],
        default_effort: "high",
      },
    },
    { id: "vendor/switch", reasoning: { mandatory: false, default_enabled: true } },
    { id: "vendor/switch-unknown", reasoning: { mandatory: false } },
    { id: "vendor/all-efforts", reasoning: { mandatory: true, supported_efforts: null } },
  ];
  const providers = {
    openrouter: { models: openRouter.map((m) => row(m.id)).concat(row("vendor/none")) },
  };
  const out = applyThinking(providers, { openRouter });
  assert.deepEqual(profile(out, "openrouter", "vendor/always-on"), {
    levels: ["low", "high", "xhigh"],
    default: "high",
    labels: undefined,
  });
  assert.deepEqual(profile(out, "openrouter", "vendor/off-by-default"), {
    levels: ["off", "high", "max"],
    default: "off",
    labels: undefined,
  });
  assert.deepEqual(profile(out, "openrouter", "vendor/switch"), {
    levels: ["off", "low"],
    default: "low",
    labels: { low: "on" },
  });
  // A switch with no stated default keeps its ladder but stays incomplete.
  assert.equal(profile(out, "openrouter", "vendor/switch-unknown").default, undefined);
  assert.deepEqual(profile(out, "openrouter", "vendor/all-efforts").levels, [
    "minimal",
    "low",
    "medium",
    "high",
    "xhigh",
    "max",
  ]);
  assert.equal(profile(out, "openrouter", "vendor/none").levels, undefined);
  assert.equal(providers.openrouter.models[0].compat, undefined, "input is not mutated");
});

test("sources apply in order: rule, upstream row, OpenRouter, models.dev", () => {
  const modelsDev = {
    acme: {
      models: {
        "m-rule": { reasoning_options: [{ type: "effort", values: ["low", "high"] }] },
        "m-up": { reasoning_options: [{ type: "effort", values: ["low", "high"] }] },
        "m-or": { reasoning_options: [{ type: "effort", values: ["low", "high"] }] },
        "m-md": { reasoning_options: [{ type: "toggle" }, { type: "effort", values: ["none", "medium", "max"] }] },
        "m-budget": { reasoning_options: [{ type: "budget_tokens" }] },
      },
    },
  };
  const openRouter = [
    { id: "acme/m-or", reasoning: { mandatory: true, supported_efforts: ["medium", "xhigh"], default_effort: "xhigh" } },
    { id: "acme/m-md", reasoning: { mandatory: true, supported_efforts: ["max"], default_effort: "max" } },
  ];
  const rules = [
    {
      provider: "acme",
      model: "m-rule*",
      levels: ["off", "high"],
      default: "high",
      source: "https://example.com/doc",
    },
  ];
  const providers = {
    acme: {
      models: [
        row("m-rule"),
        row("m-up", { compat: { thinkingLevels: ["medium"], defaultThinkingLevel: "medium" } }),
        row("m-or"),
        row("m-md", { compat: { defaultThinkingLevel: "xhigh" } }),
        row("m-budget"),
        { id: "m-plain", reasoning: false },
      ],
    },
  };
  const out = applyThinking(providers, { rules, openRouter, modelsDev });
  assert.deepEqual(profile(out, "acme", "m-rule").levels, ["off", "high"]);
  assert.deepEqual(profile(out, "acme", "m-up").levels, ["medium"]);
  assert.deepEqual(profile(out, "acme", "m-or"), {
    levels: ["medium", "xhigh"],
    default: "xhigh",
    labels: undefined,
  });
  // OpenRouter wins the ladder, but the upstream default must fit it to survive.
  assert.deepEqual(profile(out, "acme", "m-md"), { levels: ["max"], default: "max", labels: undefined });
  assert.equal(profile(out, "acme", "m-budget").levels, undefined);
  assert.equal(out.acme.models.find((m) => m.id === "m-plain").compat, undefined);
});

test("models.dev ladders keep off only when the model can turn thinking off", () => {
  const modelsDev = {
    acme: {
      models: {
        a: { reasoning_options: [{ type: "toggle" }, { type: "effort", values: ["medium", "high"] }] },
        b: { reasoning_options: [{ type: "effort", values: ["none", "low", "default"] }] },
        c: { reasoning_options: [{ type: "effort", values: ["high", "max"] }] },
        d: { reasoning_options: [{ type: "toggle" }] },
      },
    },
  };
  const out = applyThinking({ acme: { models: ["a", "b", "c", "d"].map((id) => row(id)) } }, { modelsDev });
  assert.deepEqual(profile(out, "acme", "a").levels, ["off", "medium", "high"]);
  assert.deepEqual(profile(out, "acme", "b").levels, ["off", "low"]);
  assert.deepEqual(profile(out, "acme", "c").levels, ["high", "max"]);
  assert.deepEqual(profile(out, "acme", "d").labels, { low: "on" });
  // models.dev never states a default.
  assert.equal(profile(out, "acme", "c").default, undefined);
});

test("upstream null map entries and conflicting defaults are dropped", () => {
  const openRouter = [
    { id: "acme/m", reasoning: { mandatory: false, supported_efforts: ["low", "high", "none"], default_effort: "high" } },
  ];
  const providers = {
    acme: {
      models: [
        row("m", { thinkingLevelMap: { off: null } }),
        row("n", { compat: { thinkingLevels: ["low", "high"], defaultThinkingLevel: "max" } }),
      ],
    },
  };
  const out = applyThinking(providers, { openRouter });
  assert.deepEqual(profile(out, "acme", "m").levels, ["low", "high"]);
  assert.equal(profile(out, "acme", "n").default, undefined);
});

test("model keys link the same model across gateways, and ambiguity links nothing", () => {
  for (const id of [
    "anthropic/claude-opus-5.5",
    "us.anthropic.claude-opus-5-5",
    "claude-opus-5-5@default",
    "anthropic.claude-opus-5-5-v1:0",
  ]) {
    assert.equal(modelKey(id), "claude-opus-5-5", id);
  }
  const reasoning = { mandatory: true, supported_efforts: ["high"], default_effort: "high" };
  const openRouter = [
    { id: "a/dup-model", reasoning },
    { id: "b/dup-model", reasoning },
    { id: "a/solo:free", reasoning },
    { id: "~a/solo-latest", reasoning },
  ];
  const providers = { gw: { models: [row("x/dup-model"), row("solo"), row("~a/solo-latest")] } };
  const out = applyThinking(providers, { openRouter });
  assert.equal(profile(out, "gw", "x/dup-model").levels, undefined);
  assert.equal(profile(out, "gw", "solo").levels, undefined);
  assert.deepEqual(profile(out, "gw", "~a/solo-latest").levels, ["high"]);
});

test("a * rule names the model key and covers every gateway; earlier rules win", () => {
  const rule = (provider, model, levels) => ({
    provider,
    model,
    levels,
    default: levels[0],
    source: "https://example.com/doc",
  });
  const rules = [
    rule("openrouter", "anthropic/claude-opus-5.5", ["max"]),
    rule("*", "claude-opus-5-5", ["low", "high"]),
    rule("*", "glm-4-6*", ["off", "low"]),
  ];
  const providers = {
    openrouter: { models: [row("anthropic/claude-opus-5.5"), row("anthropic/claude-opus-5.5-fast")] },
    "amazon-bedrock": { models: [row("us.anthropic.claude-opus-5-5")] },
    kilocode: { models: [row("anthropic/claude-opus-5.5")] },
    zai: { models: [row("glm-4.6v"), row("glm-4.5")] },
  };
  const out = applyThinking(providers, { rules });
  assert.deepEqual(profile(out, "openrouter", "anthropic/claude-opus-5.5").levels, ["max"]);
  assert.deepEqual(profile(out, "kilocode", "anthropic/claude-opus-5.5").levels, ["low", "high"]);
  assert.deepEqual(profile(out, "amazon-bedrock", "us.anthropic.claude-opus-5-5").levels, ["low", "high"]);
  assert.equal(profile(out, "openrouter", "anthropic/claude-opus-5.5-fast").levels, undefined);
  assert.deepEqual(profile(out, "zai", "glm-4.6v").levels, ["off", "low"]);
  assert.equal(profile(out, "zai", "glm-4.5").levels, undefined);
});

test("coverage counts active reasoning rows without a complete profile", () => {
  const bundle = {
    providers: {
      acme: {
        models: [
          row("ok", { compat: { thinkingLevels: ["low"], defaultThinkingLevel: "low" } }),
          row("no-default", { compat: { thinkingLevels: ["low"] } }),
          row("retired", { status: "disabled" }),
          { id: "plain", reasoning: false },
        ],
      },
    },
  };
  assert.deepEqual(thinkingCoverage(bundle), { total: 2, complete: 1, missing: ["acme/no-default"] });
});

test("supplement thinking rules are validated", () => {
  const base = {
    schemaVersion: 1,
    provenance: { acme: { source: "s", revision: "r", files: ["f"], notes: "n" } },
    providers: {
      acme: {
        api: "openai-completions",
        models: [{ id: "m", name: "m", input: ["text"], reasoning: true, contextWindow: 1, maxTokens: 1 }],
      },
    },
  };
  const rule = { provider: "acme", model: "m", levels: ["low", "high"], default: "high", source: "https://e.com" };
  validateSupplement({ ...base, thinking: [rule] });
  validateSupplement({
    ...base,
    thinking: [{ ...rule, levels: ["off", "low"], default: "low", labels: { low: "on" }, note: "switch" }],
  });
  for (const bad of [
    { ...rule, default: "max" },
    { ...rule, levels: ["high", "low"] },
    { ...rule, levels: ["low", "low", "high"] },
    { ...rule, levels: ["low", "turbo"] },
    { ...rule, source: "not a url" },
    { ...rule, extra: true },
    { ...rule, labels: { turbo: "on" } },
  ]) {
    assert.throws(() => validateSupplement({ ...base, thinking: [bad] }), JSON.stringify(bad));
  }
});

test("models.dev input is bounded and must look complete", () => {
  const ok = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`p${i}`, { models: {} }]));
  assert.equal(Object.keys(parseModelsDev(Buffer.from(JSON.stringify(ok)))).length, 60);
  assert.throws(() => parseModelsDev(Buffer.from(JSON.stringify({ p: { models: {} } }))), /partial/);
  assert.throws(() => parseModelsDev(Buffer.from(JSON.stringify({ p: {} }))));
  assert.throws(() => parseModelsDev(Buffer.alloc(32 * 1024 * 1024 + 1)), /exceeds/);
});

test("the gap report groups missing models by provider, largest first", () => {
  const report = thinkingReport({
    total: 5,
    complete: 2,
    missing: ["kilocode/kilo-auto/free", "openrouter/openrouter/auto", "kilocode/a/b"],
  });
  assert.match(report, /\*\*2\/5\*\* \(3 missing\)/);
  assert.ok(report.indexOf("### kilocode (2)") < report.indexOf("### openrouter (1)"));
  assert.match(report, /- `a\/b`\n- `kilo-auto\/free`/);
});

test("overrides replace or remove upstream values, and reasoning:false drops the profile", () => {
  const source = "https://example.com/doc";
  const providers = {
    gw: {
      models: [
        {
          id: "vendor/coder-next",
          reasoning: true,
          compat: { thinkingLevels: ["off", "low"], defaultThinkingLevel: "low", supportsTools: true },
        },
        { id: "plan-model", cost: { input: 0, output: 0 }, replacedBy: "gone" },
      ],
    },
    other: { models: [{ id: "coder-next", reasoning: true, compat: { thinkingLevels: ["low"] } }] },
  };
  const out = applyOverrides(providers, [
    { provider: "*", model: "coder-next", set: { reasoning: false }, source },
    { provider: "gw", model: "plan-model", set: { cost: null, replacedBy: null, name: "Plan" }, source },
    { provider: "gw", model: "plan*", set: { maxTokens: 10 }, source },
  ]);
  assert.deepEqual(out.gw.models[0], {
    id: "vendor/coder-next",
    reasoning: false,
    compat: { supportsTools: true },
  });
  assert.deepEqual(out.other.models[0], { id: "coder-next", reasoning: false });
  assert.deepEqual(out.gw.models[1], { id: "plan-model", name: "Plan", maxTokens: 10 });
  assert.equal(providers.gw.models[1].cost.input, 0, "input is not mutated");
});

test("override rules are validated", () => {
  const base = {
    schemaVersion: 1,
    provenance: { acme: { source: "s", revision: "r", files: ["f"], notes: "n" } },
    providers: {
      acme: {
        api: "openai-completions",
        models: [{ id: "m", name: "m", input: ["text"], reasoning: true, contextWindow: 1, maxTokens: 1 }],
      },
    },
  };
  const ok = { provider: "*", model: "m", set: { reasoning: false }, source: "https://e.com" };
  validateSupplement({ ...base, overrides: [ok] });
  validateSupplement({
    ...base,
    overrides: [
      {
        ...ok,
        set: {
          cost: {
            input: 1,
            output: 2,
            cacheRead: 0.1,
            tieredPricing: [
              { input: 1, output: 2, range: [0, 128000] },
              { input: 2, output: 4, range: [128000] },
            ],
          },
        },
      },
    ],
  });
  for (const bad of [
    { ...ok, set: {} },
    { ...ok, set: { status: "disabled" } },
    { ...ok, set: { cost: { input: -1, output: 1 } } },
    { ...ok, set: { contextWindow: 0 } },
    { ...ok, set: { cost: { input: 1, output: 2, tieredPricing: [{ input: 1, output: 2, range: [] }] } } },
    { ...ok, set: { cost: { input: 1, output: 2, tieredPricing: [{ input: 1, output: 2, range: [0], extra: 1 }] } } },
    { ...ok, source: "nope" },
  ]) {
    assert.throws(() => validateSupplement({ ...base, overrides: [bad] }), JSON.stringify(bad));
  }
});
