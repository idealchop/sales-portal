import * as dotenv from "dotenv";

export function loadLocalEnvIfNeeded(): void {
  if (process.env.K_SERVICE || process.env.FUNCTION_TARGET) return;
  dotenv.config();
}
