import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // ...reactHooks.configs.recommended.rules,

      ...reactHooks.configs.recommended.rules,
      // ✅ Add this rule configuration:
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      "useUnknownInCatchVariables": false,
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      "no-useless-catch": "off",

      // ✅ 2. Stop ESLint from suggesting 'const' over 'let'
      'prefer-const': 'off',
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/exhaustive-deps": "off",
      'react-refresh/only-export-components': 'off',
      "no-unused-vars": "off",

    },
  },
])
