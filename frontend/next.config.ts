import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(projectDir, "..");

const nextConfig: NextConfig = {
  output: "standalone",
  // Trace deps from monorepo root when App Hosting builds with --prefix frontend.
  outputFileTracingRoot: monorepoRoot,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
