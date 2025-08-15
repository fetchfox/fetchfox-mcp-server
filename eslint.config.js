import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginPromise from 'eslint-plugin-promise';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        jest: 'readonly',
        test: 'readonly',
        xtest: 'readonly',
        describe: 'readonly',
        xdescribe: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
      },
    },
    plugins: {
      promise: pluginPromise,
    },
    rules: {
      ...pluginPromise.configs.recommended.rules,
      'promise/catch-or-return': 'error',
      'promise/always-return': 'off',
      'promise/param-names': 'off',
      'promise/no-nesting': 'off',
    },
  },
  pluginJs.configs.recommended,
];
