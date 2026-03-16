import js from "@eslint/js";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
  { ignores: ["dist", "node_modules", "vite.config.ts", "tailwind.config.ts"] },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslintParser,
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslintPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...tseslintPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...(reactRefresh.configs.recommended?.rules ?? {}),

      // TypeScript's type-checker handles undefined identifiers.
      "no-undef": "off",

      // `npm run lint` uses `--max-warnings 0`, so avoid warn-level rules by default.
      "react-hooks/exhaustive-deps": "error",

      // `npm run lint` uses `--max-warnings 0`, so avoid warn-level rules by default.
      "react-refresh/only-export-components": "off",
    },
  },
];
