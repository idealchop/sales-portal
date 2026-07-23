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
  /**
   * Prevent year-long CDN caching of HTML shells after deploys.
   * Stale HTML + new `/_next/static` hashes → ChunkLoadError 404s on login.
   * Hashed static assets remain immutable.
   */
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
