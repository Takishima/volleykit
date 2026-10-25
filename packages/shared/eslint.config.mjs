import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import vitest from '@vitest/eslint-plugin'
import testingLibrary from 'eslint-plugin-testing-library'
import oxlint from 'eslint-plugin-oxlint'

// Size and naming rules from CLAUDE.md "Code Standards". Pre-existing hits are
// grandfathered in eslint-suppressions.json (ESLint bulk suppressions); new
// code must comply. `pnpm run lint:fix` prunes suppressions that no longer apply.
const MAX_FUNCTION_LINES = 30
const MAX_PARAMS = 4

export default tseslint.config(
  { ignores: ['node_modules/', 'dist/'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // React hooks + React Compiler diagnostics (refs, purity, set-state-in-effect, ...)
      ...reactHooksPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allowSingleOrDouble',
        },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'parameter', format: ['camelCase', 'PascalCase'], leadingUnderscore: 'allow' },
        { selector: 'typeLike', format: ['PascalCase'] },
        {
          selector: ['objectLiteralProperty', 'typeProperty', 'enumMember', 'classProperty'],
          format: null,
        },
        {
          selector: ['objectLiteralMethod', 'typeMethod', 'classMethod'],
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        { selector: 'import', format: null },
      ],
      'max-params': ['error', MAX_PARAMS],
      'max-lines-per-function': [
        'error',
        { max: MAX_FUNCTION_LINES, skipBlankLines: true, skipComments: true, IIFEs: false },
      ],
      // Magic numbers: same options as web; existing hits are grandfathered in
      // eslint-suppressions.json.
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1, 2, 100],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
          enforceConst: true,
        },
      ],
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: { '@typescript-eslint/naming-convention': 'off' },
  },
  {
    files: ['src/**/*.test.{ts,tsx}'],
    extends: [vitest.configs.recommended, testingLibrary.configs['flat/react']],
    settings: { vitest: { typecheck: true } },
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off',
      'max-lines-per-function': 'off',
      'max-params': 'off',
    },
  },
  // Type-aware rules. projectService picks tsconfig.json up automatically;
  // every linted file must be covered by it.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeCheckedOnly],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
  // oxlint (root .oxlintrc.json) runs first as the fast pass; switch off every
  // ESLint rule it already enforces so the two cannot disagree. Must stay last.
  ...(await oxlint.buildFromConfigFile('../../.oxlintrc.json')),
  {
    files: ['**/*.{ts,tsx}'],
    rules: { ...reactHooksPlugin.configs.recommended.rules },
  }
)
