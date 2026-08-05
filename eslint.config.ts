import { default as reactivated } from "reactivated/dist/eslint.config";

type Config = typeof reactivated;

export default [
  ...reactivated,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.ts", "vite.config.ts"],
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
] satisfies Config;
