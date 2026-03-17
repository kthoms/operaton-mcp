import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@generated": path.resolve(__dirname, "src/generated"),
    },
  },
  test: {
    include: [
      "test/unit/**/*.test.ts",
      "test/smoke/**/*.test.ts",
      "test/integration/**/*.test.ts",
    ],
  },
});
