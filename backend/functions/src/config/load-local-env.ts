import * as dotenv from "dotenv";
import path from "path";

export function loadLocalEnvIfNeeded(): void {
  if (process.env.K_SERVICE || process.env.FUNCTION_TARGET) return;
  // Prefer .env.local (never dotenv-deployed by Firebase). Fall back to .env.
  const root = process.cwd();
  dotenv.config({ path: path.join(root, ".env.local") });
  dotenv.config({ path: path.join(root, ".env") });
}
