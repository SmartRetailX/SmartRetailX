import nx from '@nx/eslint-plugin';
import baseConfig from '../eslint.config.mjs';
// import { fixupConfigRules } from '@eslint/compat';
import eslintPluginImport from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
// import reactJsx from 'eslint-plugin-react/configs/jsx-runtime.js';
// import react from 'eslint-plugin-react/configs/recommended.js';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import ts from 'typescript-eslint';

export default [
  { languageOptions: { globals: globals.browser } },
  ...baseConfig,
  ...nx.configs['flat/react'],
  ...ts.configs.recommended,
  //   ...fixupConfigRules([
  //     {
  //       ...react,
  //       settings: {
  //         react: { version: 'detect' },
  //       },
  //     },
  //     reactJsx,
  //   ]),
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    plugins: {
      'react-hooks': reactHooks,
      prettier,
      'simple-import-sort': simpleImportSort,
      import: eslintPluginImport,
    },
    // Override or add rules here
    rules: {
      ...reactHooks.configs.recommended.rules,

      'import/order': 'off',
      'sort-imports': 'off',

      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/no-duplicates': 'error',

      'prettier/prettier': 'error',
    },
  },
];
