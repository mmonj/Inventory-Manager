import reactivated from "reactivated/dist/eslint.config";

export default [
  ...reactivated,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "unused-imports/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-use-before-define": "off",
      "import/order": "off",
    },
  },
];
