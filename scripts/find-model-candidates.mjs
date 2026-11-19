// List new-model CANDIDATES for the hand-maintained providers, which the 6-hour job
// never adds by itself. Candidates come from secondary sources (models.dev, the Codex
// models page); confirm each one in the provider's official docs before adding it
// (MAINTAINING.md, "신모델 대응").
// Usage: node scripts/find-model-candidates.mjs [--since YYYY-MM-DD] [--models-dev file]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchModelsDev, parseModelsDev } from "./models-dev.mjs";
import { modelKey } from "./thinking.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CODEX_MODELS_URL = "https://learn.chatgpt.com/docs/models";
// Our hand-maintained provider -> models.dev provider key(s). amazon-bedrock-mantle has
// no models.dev counterpart: check the AWS model cards for bedrock-mantle model IDs.
export const MODELS_DEV_KEYS = {
  "amazon-bedrock": ["amazon-bedrock"],
  "anthropic-vertex": ["google-vertex-anthropic"],
  "google-vertex": ["google-vertex"],
  minimax: ["minimax"],
  "minimax-portal": ["minimax-coding-plan"],
};

/** models.dev text models of each mapped provider that our catalog row set lacks. */
export function findCandidates(catalog, modelsDev, { since = "" } = {}) {
  const result = {};
  for (const [provider, keys] of Object.entries(MODELS_DEV_KEYS)) {
    const ours = new Set((catalog.providers[provider]?.models ?? []).map((m) => modelKey(m.id)));
    const found = [];
    for (const key of keys) {
      for (const m of Object.values(modelsDev[key]?.models ?? {})) {
        if (m.status === "deprecated" || (m.release_date ?? "") < since) continue;
        if (Array.isArray(m.modalities?.output) && !m.modalities.output.includes("text")) continue;
        // google-vertex holds Gemini/Gemma text models only: Claude rows belong to
        // anthropic-vertex, other partner models (xai/..) are out of scope, and image
        // generators (nano-banana) are not chat models.
        if (provider === "google-vertex" && (!/^(gemini|gemma)/.test(m.id) || /nano-banana|image/.test(m.id))) {
          continue;
        }
        if (!ours.has(modelKey(m.id))) found.push({ id: m.id, name: m.name, released: m.release_date ?? "" });
      }
    }
    result[provider] = found.sort((a, b) => b.released.localeCompare(a.released));
  }
  return result;
}

/** Codex model IDs named on the Codex models page (HTML), e.g. gpt-6.2-sol. */
export function codexIdsFromPage(html) {
  const words = new Set(html.match(/gpt-[0-9][a-z0-9.-]*[a-z0-9]/g) ?? []);
  // Real IDs: gpt-<major>[.<minor>]-<name>[-<name>]; page slugs (gpt-61-sol, gpt-6-2-astra)
  // and image/section names (texture, family, retirement) are not models.
  return [...words]
    .filter((w) => /^gpt-\d(\.\d+)?(-[a-z]+)+$/.test(w))
    .filter((w) => !/-(texture|block|family|retirement|and|other|models|in|chatgpt)\b/.test(w))
    .sort();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const arg = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const since = arg("--since") ?? new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "models/v1/catalog.json"), "utf8"));
  const file = arg("--models-dev");
  const modelsDev = parseModelsDev(file ? fs.readFileSync(file) : await fetchModelsDev());
  console.log(`models.dev candidates released on or after ${since} (verify in official docs):`);
  for (const [provider, list] of Object.entries(findCandidates(catalog, modelsDev, { since }))) {
    console.log(`\n${provider}: ${list.length}`);
    for (const m of list) console.log(`  ${m.released}  ${m.id}  (${m.name ?? ""})`);
  }
  console.log("\namazon-bedrock-mantle: not in models.dev; check AWS model cards for bedrock-mantle IDs.");
  try {
    const response = await fetch(CODEX_MODELS_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const ours = new Set(catalog.providers["openai-codex"].models.map((m) => m.id));
    const ids = codexIdsFromPage(await response.text());
    console.log(`\nopenai-codex: IDs on ${CODEX_MODELS_URL} not in the catalog: ${ids.filter((id) => !ours.has(id)).join(", ") || "(none)"}`);
    console.log("  (the page also names retired models; read its retirement section before adding or disabling)");
  } catch (error) {
    console.log(`\nopenai-codex: could not read ${CODEX_MODELS_URL} (${error.message}); check it by hand.`);
  }
}
