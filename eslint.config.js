import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // Guardia di purezza: l'engine non può importare nulla di esterno
  // (solo import relativi). Questo garantisce che resti riusabile identico
  // per bot, hot-seat e server.
  {
    files: ['packages/engine/src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^[^.]',
              message: 'Engine puro: sono ammessi solo import relativi.',
            },
          ],
        },
      ],
    },
  },
  // I bot possono dipendere solo dall'engine (oltre ai propri moduli).
  {
    files: ['packages/bots/src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!\\.)(?!@vikiland/engine$)',
              message: 'I bot dipendono solo da @vikiland/engine.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/web/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  }
);
