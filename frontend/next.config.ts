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
   * Do not set Cache-Control on `/_next/static` — Next.js already immutable-caches
   * hashed assets, and a custom header breaks `next dev`.
   */
  async redirects() {
    return [
      {
        source: "/dashboard/smartrefill",
        destination: "/webapp/smartrefill",
        permanent: false,
      },
    ];
  },
  async headers() {
    if (process.env.NODE_ENV !== "production") {
      return [];
    }
    return [
      {
        source: "/((?!_next/static|_next/image).*)",
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
