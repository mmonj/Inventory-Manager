import { default as reactivated } from "reactivated/dist/eslint.config";
import tseslint from "typescript-eslint";

type Config = typeof reactivated;

export default [
  ...reactivated,
  { ignores: ["collected/"] },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.ts", "vite.config.ts", "vitest.config.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "unused-imports/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-use-before-define": "off",
      "import/order": "off",
      "react/no-unescaped-entities": "off",
    },
  },
  // Runs as a service worker, which the project's DOM types don't describe
  { ...tseslint.configs.disableTypeChecked, files: ["client/html/sw.js"] },
  {
    files: ["client/html/sw.js"],
    languageOptions: { globals: { self: "readonly", URL: "readonly" } },
  },
] satisfies Config;
