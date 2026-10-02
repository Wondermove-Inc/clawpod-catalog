// Save OpenRouter's public model list for scripts/publish-catalog.mjs --openrouter-file.
// Usage: node scripts/fetch-openrouter.mjs --out <file>
import fs from "node:fs";
import path from "node:path";
import { fetchOpenRouterModels } from "./openrouter.mjs";

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--out") {
  console.error("usage: node scripts/fetch-openrouter.mjs --out <file>");
  process.exit(2);
}
try {
  const body = await fetchOpenRouterModels();
  fs.writeFileSync(path.resolve(args[1]), body);
  console.log(`saved OpenRouter model list (${body.byteLength} bytes) to ${args[1]}`);
} catch (error) {
  console.error(`fetch-openrouter: ${error.message}`);
  process.exitCode = 1;
}
