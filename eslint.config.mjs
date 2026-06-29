import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// ESLint 9 flat config. eslint-config-next still ships in eslintrc format, so
// we bridge it with FlatCompat (the create-next-app default for ESLint 9).
// Invoked via the ESLint CLI (`eslint .`) rather than the deprecated
// `next lint`, which is removed in Next 16.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "node_modules/**",
      ".stryker-tmp/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
