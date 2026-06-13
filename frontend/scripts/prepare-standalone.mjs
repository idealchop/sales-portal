import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const standaloneAppDir = path.join(frontendDir, ".next/standalone/frontend");

if (!existsSync(path.join(standaloneAppDir, "server.js"))) {
  console.error(
    `[prepare-standalone] Expected server at ${standaloneAppDir}/server.js`,
  );
  process.exit(1);
}

const staticSrc = path.join(frontendDir, ".next/static");
const staticDest = path.join(standaloneAppDir, ".next/static");

if (!existsSync(staticSrc)) {
  console.error("[prepare-standalone] Missing .next/static — run next build first.");
  process.exit(1);
}

cpSync(staticSrc, staticDest, { recursive: true });
console.log("[prepare-standalone] Copied .next/static");

const publicSrc = path.join(frontendDir, "public");
const publicDest = path.join(standaloneAppDir, "public");

if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
  console.log("[prepare-standalone] Copied public/");
}
