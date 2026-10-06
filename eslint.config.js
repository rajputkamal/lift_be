import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/**", ".git/**"] },
  {
    files: [
      "src/grower/**/*.js",
      "src/config/microgreens.js",
      "scripts/*Grower*.js",
      "scripts/expireGrowerOrders.js",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      eqeqeq: "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
];
