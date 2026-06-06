import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
  },
  resolve: {
    alias: {
      "@verime/sdk": path.resolve(__dirname, "../sdk/src"),
      "@verime/sdk/commitment": path.resolve(__dirname, "../sdk/src/commitment.ts"),
      "@verime/sdk/predicate": path.resolve(__dirname, "../sdk/src/predicate.ts"),
      "@verime/sdk/secret": path.resolve(__dirname, "../sdk/src/secret.ts"),
    },
  },
});
