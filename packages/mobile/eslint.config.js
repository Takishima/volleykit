import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import sonarjs from 'eslint-plugin-sonarjs'
import { importX } from 'eslint-plugin-import-x'
import security from 'eslint-plugin-security'
import jest from 'eslint-plugin-jest'
import reactNativeA11y from 'eslint-plugin-react-native-a11y'
import oxlint from 'eslint-plugin-oxlint'

// Size and naming rules from CLAUDE.md "Code Standards". Pre-existing hits are
// grandfathered in eslint-suppressions.json (ESLint bulk suppressions); new
// code must comply. `pnpm run lint:fix` prunes suppressions that no longer apply.
const MAX_FUNCTION_LINES = 30
const MAX_PARAMS = 4

export default tseslint.config(
  {
    ignores: ['node_modules/', 'dist/', 'ios/', 'android/', '.expo/', 'coverage/'],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, sonarjs.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooksPlugin,
      'import-x': importX,
      security,
    },
    languageOptions: {
      ecmaVersion: 2020,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      // React hooks + React Compiler diagnostics (refs, purity, set-state-in-effect, ...)
      ...reactHooksPlugin.configs.recommended.rules,

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'error',

      // Import ordering - consistent import structure across codebase
      'import-x/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'type'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'react-native',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@volleykit/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['react', 'react-native'],
        },
      ],
      'import-x/no-duplicates': 'error',
      'import-x/no-unresolved': 'off', // TypeScript handles this better
      'import-x/no-cycle': 'error',

      // Security rules - prevent common vulnerabilities
      ...security.configs.recommended.rules,
      // Disable security rules that produce false positives:
      // - detect-object-injection: TypeScript's type system ensures bracket notation
      //   is only used with known keys (string literals, enums, typed arrays)
      // - detect-non-literal-fs-filename: Not applicable in React Native context
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',

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

      // SonarJS rules - code quality and complexity
      // Disable rules with high false positive rates (same set as web):
      // - no-nested-conditional: Common pattern in JSX for conditional rendering
      // - no-intrusive-permissions: Location is an intentional core feature
      // - no-unused-vars: Already covered by @typescript-eslint/no-unused-vars
      // - pseudo-random: Math.random() is acceptable for non-security contexts (jitter, ids)
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/no-intrusive-permissions': 'off',
      'sonarjs/no-unused-vars': 'off',
      'sonarjs/pseudo-random': 'off',
      // Test-only assertion style rules new in eslint-plugin-sonarjs 4.1.0.
      // no-floating-point-equality / super-linear-regex are NOT muted globally so
      // they still catch real float-comparison and ReDoS bugs in production code.
      'sonarjs/prefer-specific-assertions': 'off',
      'sonarjs/no-trivial-assertions': 'off',
      // cognitive-complexity threshold set to 25 for complex React patterns
      'sonarjs/cognitive-complexity': ['error', 25],
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
      // Style-only type-aware sonarjs rules: readonly on every props type and
      // RegExp#exec over String#match add churn without catching bugs.
      'sonarjs/prefer-read-only-props': 'off',
      'sonarjs/prefer-regexp-exec': 'off',
    },
  },
  // React Native accessibility (the mobile counterpart of jsx-a11y).
  {
    files: ['src/**/*.tsx'],
    plugins: { 'react-native-a11y': reactNativeA11y },
    rules: {
      ...reactNativeA11y.configs.all.rules,
      // A hint on every labelled element is more noise than help for screen
      // reader users; labels and roles are what the rest of the set enforces.
      'react-native-a11y/has-accessibility-hint': 'off',
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: { '@typescript-eslint/naming-convention': 'off' },
  },
  // Relaxed rules for test files
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    extends: [jest.configs['flat/recommended']],
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off',
      'max-lines-per-function': 'off',
      'max-params': 'off',
      'sonarjs/pseudo-random': 'off',
      'sonarjs/void-use': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/assertions-in-tests': 'off',
      // Exact float equality is fine in tests with deterministic fixture values
      'sonarjs/no-floating-point-equality': 'off',
      'import-x/order': 'off',
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
