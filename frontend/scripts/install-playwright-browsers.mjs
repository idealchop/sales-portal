#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "npx",
  ["playwright", "install", "chromium"],
  { stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);
