import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // A leading underscore is the standard signal for "destructured out on
      // purpose, not a mistake" (e.g. `const { auction: _auction, ...rest } = input`
      // to exclude a field from a spread) — don't flag those as unused.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // One-off Node maintenance scripts, run directly with `node`, never
    // imported by the app — plain CommonJS is the right tool here.
    "scripts/**",
  ]),
]);

export default eslintConfig;
