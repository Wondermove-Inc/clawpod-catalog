// Save models.dev's public catalog for scripts/publish-catalog.mjs --modelsdev-file.
// Usage: node scripts/fetch-models-dev.mjs --out <file>
import fs from "node:fs";
import path from "node:path";
import { fetchModelsDev } from "./models-dev.mjs";

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--out") {
  console.error("usage: node scripts/fetch-models-dev.mjs --out <file>");
  process.exit(2);
}
try {
  const body = await fetchModelsDev();
  fs.writeFileSync(path.resolve(args[1]), body);
  console.log(`saved models.dev catalog (${body.byteLength} bytes) to ${args[1]}`);
} catch (error) {
  console.error(`fetch-models-dev: ${error.message}`);
  process.exitCode = 1;
}
