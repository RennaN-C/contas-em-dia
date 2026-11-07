import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config(
  { ignores: ['node_modules/**', 'dist/**', 'tests/docker-smoke.mjs'] },
  js.configs.recommended, ...ts.configs.recommended,
  { files: ['**/*.ts'], rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-namespace': 'off'
  } }
);
