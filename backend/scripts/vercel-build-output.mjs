/**
 * Vercel may require a JS entry under outputDirectory (dashboard sometimes
 * inherits monorepo "frontend/dist"). Emit dist/index.js that re-exports the
 * Express app so the build phase can resolve an entrypoint.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, "..");
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });
writeFileSync(
  join(dist, "index.js"),
  'import app from "../src/app.js";\nexport default app;\n'
);
console.log("backend: wrote dist/index.js for Vercel outputDirectory");
