/**
 * Configuración de ESLint (flat config).
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 */
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "_recon/**", "_audit/**", "coverage/**", "playwright-report/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-empty": ["error", { allowEmptyCatch: true }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "warn",
    },
  },
  {
    files: ["tests/**/*.{ts,mjs}", "scripts/**/*.mjs", "server/**/*.mjs", "api/**/*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.builtin } },
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
);
