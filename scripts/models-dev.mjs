// models.dev's public catalog (https://models.dev/api.json) supplies each model's
// reasoning_options, used as the last automatic source of thinking levels.
import { z } from "zod";

export const MODELS_DEV_URL = "https://models.dev/api.json";
export const MAX_MODELS_DEV_BYTES = 32 * 1024 * 1024;
// A healthy response lists hundreds of providers; far fewer means a partial response.
export const MIN_MODELS_DEV_PROVIDERS = 50;
const FETCH_TIMEOUT_MS = 60_000;

const responseSchema = z.record(z.string(), z.object({ models: z.record(z.string(), z.unknown()) }).loose());

export function parseModelsDev(body) {
  if (body.byteLength > MAX_MODELS_DEV_BYTES) {
    throw new Error(`models.dev response exceeds ${MAX_MODELS_DEV_BYTES} bytes (${body.byteLength})`);
  }
  const parsed = responseSchema.parse(JSON.parse(body.toString("utf8")));
  const providers = Object.keys(parsed).length;
  if (providers < MIN_MODELS_DEV_PROVIDERS) {
    throw new Error(
      `models.dev returned ${providers} providers (< ${MIN_MODELS_DEV_PROVIDERS}); refusing a partial list`,
    );
  }
  return parsed;
}

export async function fetchModelsDev(fetchImpl = fetch) {
  const response = await fetchImpl(MODELS_DEV_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`models.dev request failed: HTTP ${response.status}`);
  const body = Buffer.from(await response.arrayBuffer());
  // Validate before saving so a broken response fails the fetch step, not publishing.
  parseModelsDev(body);
  return body;
}
