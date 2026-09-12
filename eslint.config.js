import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config(
  globalIgnores(['netlify/functions/**', 'dist/**', 'node_modules/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // The design system is a direct port of legacy CSS — allow verbatim
      // artifacts like object-curly patterns; keep new code clean.
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Context providers export their hook alongside the component — a
    // legitimate pattern that react-refresh can't hot-swap anyway.
    files: [
      'src/hooks/useAuth.tsx',
      'src/hooks/useToast.tsx',
      'src/components/layout/Chrome.tsx',
      'src/lib/seo.tsx',
    ],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
)
