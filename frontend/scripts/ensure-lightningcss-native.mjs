import { access, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(frontendRoot, "package.json"));

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

if (process.platform !== "linux") {
  process.exit(0);
}

try {
  require.resolve("lightningcss-linux-x64-gnu");
  process.exit(0);
} catch {
  // Optional binding missing — try copying from a hoisted install path.
}

const target = join(
  frontendRoot,
  "node_modules/lightningcss/lightningcss.linux-x64-gnu.node",
);

for (const root of [
  join(frontendRoot, "node_modules"),
  join(frontendRoot, "..", "node_modules"),
]) {
  const source = join(
    root,
    "lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node",
  );
  if (await exists(source)) {
    await copyFile(source, target);
    console.log(`Installed lightningcss Linux binding at ${target}`);
    process.exit(0);
  }
}

console.error(
  "lightningcss-linux-x64-gnu is missing. Ensure optional dependencies are installed.",
);
process.exit(1);
