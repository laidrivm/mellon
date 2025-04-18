import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig, globalIgnores } from "eslint/config";


export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: { js },
    extends: [
      "js/recommended",
    ]
  },
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"], languageOptions: { globals: {...globals.browser, ...globals.node} } },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    ...pluginReact.configs.flat.recommended,
    settings: {
      react: {
        version: "19",
      },
    },
  },
  globalIgnores([
    "dist/*"
  ])
]);