// Flat ESLint config for ESLint v9
const js = require('@eslint/js');
const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const svelte = require('eslint-plugin-svelte');
const svelteParser = require('svelte-eslint-parser');
const unusedImports = require('eslint-plugin-unused-imports');
const importPlugin = require('eslint-plugin-import');

module.exports = [
  js.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    files: ['**/*.{ts,js,svelte}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'unused-imports': unusedImports,
      import: importPlugin,
      svelte
    },
    rules: {
      // Prefer TS/unused-imports variants
      'no-unused-vars': 'off',
      // Avoid blocking on intentional empty blocks; still visible as warnings elsewhere
      'no-empty': 'warn',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'import/no-unused-modules': ['warn', { unusedExports: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: { parser: tsParser },
      globals: { ...globals.browser, ...globals.node }
    }
  },
  {
    ignores: ['.svelte-kit/**', 'node_modules/**', 'static/**', 'dist/**']
  }
];


