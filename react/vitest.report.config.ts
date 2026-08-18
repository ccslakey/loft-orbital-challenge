import {defineConfig} from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      all: true,
      enabled: true,
      provider: "v8",
      include: ["apps/**"],
      exclude: [
        "**/*.{config,*rc}.*",
        "**/{__tests__,build,dist,coverage,packages/config}/**",
      ],
      reporter: ["text", "cobertura"],
    },
    reporters: ["basic", "junit"],
    outputFile: "./report/junit-report.xml",
    passWithNoTests: true,
  },
});
