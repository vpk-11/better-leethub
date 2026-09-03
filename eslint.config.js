import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'scripts/jquery-*.min.js',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.js', '**/*.ts'],
    languageOptions: {
      globals: {
        chrome: 'readonly',
        browser: 'readonly',
      },
    },
  }
);
