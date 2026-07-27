import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // The numbers sit just below the coverage of the current suite, so a
      // change that drops coverage fails the check. A threshold far below the
      // real number accepts a silent loss of tests.
      thresholds: {
        statements: 93,
        branches: 84,
        functions: 99,
        lines: 93,
      },
    },
    environment: "node",
  },
});
