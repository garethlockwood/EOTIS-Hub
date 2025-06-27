// eslint.config.js
import eslintPluginTs from '@typescript-eslint/eslint-plugin';
import parserTs from '@typescript-eslint/parser';

/** @type {import("eslint").Linter.FlatConfig} */
export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: parserTs,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': eslintPluginTs,
    },
    rules: {
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      'object-curly-spacing': ['error', 'never'],
      'camelcase': 'off',
      'max-len': ['warn', {code: 120}],
      'no-trailing-spaces': 'warn',
      'padded-blocks': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
