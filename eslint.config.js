const eslint = require('@eslint/js');

module.exports = [
  {
    ignores: ['node_modules/**', 'dist/**', 'dist-game/**', 'client/**', 'game/**'],
  },
  eslint.configs.recommended,
  {
    files: ['src/js/**/*.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        Buffer: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        process: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
