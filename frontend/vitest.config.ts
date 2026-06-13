import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup/vitest-setup.ts"],
    globals: true,
    include: [
      "src/__tests__/unit/**/*.{test,spec}.{ts,tsx}",
      "src/__tests__/integration/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["src/__tests__/bdd/**", "node_modules/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
