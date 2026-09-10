// Shared ESLint flat config for JS/MJS tooling files (TS is covered by tsc typecheck).
export default [
  { ignores: ["node_modules/**", "dist/**", "coverage/**"] },
  {
    files: ["**/*.mjs", "**/*.js", "**/*.cjs"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module" },
    rules: { "no-unused-vars": "warn", "no-console": "off" }
  }
];
