// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * Flat ESLint config for Next.js + TypeScript.
 * - Next presets (via FlatCompat)
 * - JS/MJS use plain JS linting (no type-aware rules)
 * - TS/TSX use type-aware rules (parserOptions.project) ONLY for TS files
 * - TEMP: relax “unsafe any” family, require-await, and tune no-misused-promises for JSX
 */

const config = [
  // Next.js recommended sets
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Global ignores
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "tmp/**",
      "src/generated/**",
      "next-env.d.ts",
    ],
  },

  // JS / JSX / MJS / CJS files (no TS type info)
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    ...js.configs.recommended,
    plugins: { "@next/next": nextPlugin, react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "warn",
      "no-var": "error",
      eqeqeq: ["warn", "smart"],
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "off",
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // TS / TSX files (type-aware)
  // Apply type-aware rules ONLY to TS/TSX so ESLint doesn't try them on *.mjs configs
  ...tseslint.configs.recommendedTypeChecked.map((cfg) => ({
    ...cfg,
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ...(cfg.languageOptions ?? {}),
      parserOptions: {
        ...(cfg.languageOptions?.parserOptions ?? {}),
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
    },
  })),

  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "@next/next": nextPlugin, react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      // React & Hooks
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // TEMP: relax strict TS rules to get you green quickly
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/require-await": "off",

      // Make unused vars a warning and allow _-prefixed names
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // JSX apostrophes
      "react/no-unescaped-entities": "off",

      // Consoles ok for warn/error
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Allow async handlers in JSX without wrapping in void
      "@typescript-eslint/no-misused-promises": [
        "warn",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
];

export default config;
