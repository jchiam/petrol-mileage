import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      // New in react-hooks v7 (via eslint-config-next 16); existing fetch-in-effect
      // patterns trip it — kept non-blocking until those are refactored
      'react-hooks/set-state-in-effect': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**', 'next-env.d.ts', 'scripts/**'],
  },
];

export default config;
