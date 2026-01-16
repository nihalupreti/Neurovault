import { config } from "@neurovault/eslint-config/base";

export default [
  ...config,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
      "turbo/no-undeclared-env-vars": "off",
    },
  },
];
