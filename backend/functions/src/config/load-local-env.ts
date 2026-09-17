import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

/**
 * Resolve backend/functions regardless of process.cwd()
 * (serve:local is often started from repo root or backend/).
 */
function resolveFunctionsRoot(): string {
  const candidates = [
    process.cwd(),
    path.resolve(__dirname, "../.."), // src/config -> functions (ts-node)
    path.resolve(__dirname, ".."), // lib/config -> functions (compiled)
    path.resolve(process.cwd(), "functions"),
    path.resolve(process.cwd(), "backend/functions"),
  ];

  for (const candidate of candidates) {
    if (
      fs.existsSync(path.join(candidate, "package.json")) &&
      (fs.existsSync(path.join(candidate, ".env.local")) ||
        fs.existsSync(path.join(candidate, ".env")) ||
        fs.existsSync(path.join(candidate, "src", "local-server.ts")))
    ) {
      return candidate;
    }
  }

  return process.cwd();
}

export function loadLocalEnvIfNeeded(): void {
  if (process.env.K_SERVICE || process.env.FUNCTION_TARGET) return;

  const root = resolveFunctionsRoot();
  dotenv.config({ path: path.join(root, ".env.local") });
  dotenv.config({ path: path.join(root, ".env") });
}
