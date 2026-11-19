import assert from "node:assert/strict";
import { test } from "node:test";
import { auditCatalog, gapReport } from "../scripts/audit-catalog.mjs";
import { codexIdsFromPage, findCandidates } from "../scripts/find-model-candidates.mjs";

test("candidates are models.dev text models our provider lacks, by model key", () => {
  const catalog = {
    providers: {
      "amazon-bedrock": { models: [{ id: "us.anthropic.claude-opus-5-5" }] },
      "google-vertex": { models: [] },
    },
  };
  const modelsDev = {
    "amazon-bedrock": {
      models: {
        a: { id: "anthropic.claude-opus-5-5", release_date: "2026-11-01" },
        b: { id: "openai.gpt-6.2-sol", name: "GPT-6.2 Sol", release_date: "2026-11-17" },
        c: { id: "old.model", release_date: "2026-01-01" },
        d: { id: "gone.model", release_date: "2026-11-02", status: "deprecated" },
        e: { id: "image.model", release_date: "2026-11-03", modalities: { output: ["image"] } },
      },
    },
    "google-vertex": {
      models: {
        f: { id: "claude-x@default", release_date: "2026-11-05" },
        g: { id: "xai/grok-4.7", release_date: "2026-11-05" },
        h: { id: "gemini-nano-banana-2.1", release_date: "2026-11-05" },
        i: { id: "gemini-4-neon", release_date: "2026-11-18" },
      },
    },
  };
  const out = findCandidates(catalog, modelsDev, { since: "2026-10-01" });
  assert.deepEqual(out["amazon-bedrock"], [{ id: "openai.gpt-6.2-sol", name: "GPT-6.2 Sol", released: "2026-11-17" }]);
  assert.deepEqual(out["google-vertex"].map((m) => m.id), ["gemini-4-neon"]);
});

test("Codex page parsing keeps real model IDs only", () => {
  const html =
    '<a href="#gpt-61-sol">x</a> codex -m gpt-6.2-sol <img src="gpt-6.1-sol-texture.webp"> gpt-6-family ' +
    "gpt-6-2-astra gpt-5.3-codex-spark gpt-6-astra gpt-55-retirement";
  assert.deepEqual(codexIdsFromPage(html), ["gpt-5.3-codex-spark", "gpt-6-astra", "gpt-6.2-sol"]);
});

test("the audit separates known (intended or reviewed) findings from open ones", () => {
  const catalog = {
    schemaVersion: 1,
    generatedAt: 1,
    sourceGeneratedAt: 1,
    supplementDigest: "x",
    minVersion: "1",
    providers: {
      "openai-codex": {
        api: "a",
        models: [{ id: "gpt", name: "g", input: ["text"], reasoning: false, contextWindow: 9, maxTokens: 9 }],
      },
      gw: {
        api: "a",
        models: [
          { id: "kilo-auto/free", name: "r", input: ["text"], reasoning: true, contextWindow: 9, maxTokens: 9 },
          { id: "paid", name: "p", input: ["text"], reasoning: false, contextWindow: 9, maxTokens: 99, cost: { input: 0, output: 0 } },
          { id: "old", status: "deprecated", replacedBy: "older" },
          {
            id: "claude-x",
            name: "c",
            input: ["text"],
            reasoning: false,
            contextWindow: 9,
            maxTokens: 9,
            cost: { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 0 },
            baseUrl: "https://leak",
          },
        ],
      },
    },
  };
  const supplement = { knownGaps: [{ provider: "gw", model: "paid", check: "zero-price", reason: "free" }] };
  const findings = auditCatalog(catalog, supplement);
  const pick = (check, ref) => findings.find((f) => f.check === check && f.ref === ref);
  assert.equal(pick("required: cost", "openai-codex/gpt").known, true);
  assert.equal(pick("required: cost", "gw/kilo-auto/free").known, true);
  assert.equal(pick("thinking: missing levels/default", "gw/kilo-auto/free").known, true);
  assert.equal(pick("value: zero price", "gw/paid").known, true);
  assert.equal(pick("value: maxTokens > contextWindow", "gw/paid").known, false);
  assert.equal(pick("value: Claude cacheWrite 0", "gw/claude-x").known, false);
  assert.ok(pick("security: transport/credential key", "providers.gw.models[3].baseUrl"));
  assert.equal(pick("lifecycle: replacedBy missing or retired", "gw/old").detail, "older (missing)");

  const report = gapReport(findings, { total: 1, complete: 0 });
  const open = findings.filter((f) => !f.known);
  assert.match(report, new RegExp(`\\*\\*Open gaps: ${open.length}\\*\\*`));
  const [openPart, knownPart] = report.split("<details>");
  assert.match(openPart, /### value: Claude cacheWrite 0 \(1\)\n\n- `gw\/claude-x`/);
  assert.ok(!openPart.includes("openai-codex/gpt"));
  assert.match(knownPart, /- `openai-codex\/gpt`/);
});
