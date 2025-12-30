import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import security from 'eslint-plugin-security'
import noUnsanitized from 'eslint-plugin-no-unsanitized'
import sonarjs from 'eslint-plugin-sonarjs'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'playwright-report', 'src/api/schema.ts'] },
  // Enforce useTranslation hook in React components (issue #287)
  {
    files: ['**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/i18n',
              importNames: ['t', 'tInterpolate'],
              message:
                'Use the useTranslation() hook instead of direct imports. Import { useTranslation } from "@/hooks/useTranslation".',
            },
          ],
        },
      ],
    },
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      sonarjs.configs.recommended,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
      'security': security,
      'no-unsanitized': noUnsanitized,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Security rules - prevent common vulnerabilities
      ...security.configs.recommended.rules,
      // Disable security rules that produce false positives in TypeScript codebases:
      // - detect-object-injection: TypeScript's type system ensures bracket notation
      //   is only used with known keys (string literals, enums, typed arrays).
      //   All dynamic access in this codebase uses typed keys with fallback values.
      // - detect-non-literal-fs-filename: Only used in vite.config.ts with
      //   controlled paths (import.meta.dirname, not user input).
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      // XSS prevention - flag unsafe DOM manipulation
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',
      // SonarJS rules - code quality and complexity
      // Disable rules with high false positive rates in this codebase:
      // - no-hardcoded-passwords: Flags translation labels like "Password:" in locale files
      // - class-name: Conflicts with OpenAPI-generated types naming conventions
      // - no-nested-conditional: Common pattern in JSX for conditional rendering
      // - no-nested-template-literals: Used in dynamic Tailwind class names
      // - no-intrusive-permissions: Geolocation is an intentional core feature
      // - public-static-readonly: Too pedantic for this codebase
      // - no-nested-functions: Common in React for callbacks passed to child components
      // - no-unused-vars: Already covered by @typescript-eslint/no-unused-vars
      // - pseudo-random: Math.random() is acceptable for non-security contexts (jitter, UI)
      'sonarjs/no-hardcoded-passwords': 'off',
      'sonarjs/class-name': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/no-nested-template-literals': 'off',
      'sonarjs/no-intrusive-permissions': 'off',
      'sonarjs/public-static-readonly': 'off',
      'sonarjs/no-nested-functions': 'off',
      'sonarjs/no-unused-vars': 'off',
      'sonarjs/pseudo-random': 'off',
      // Code quality rules - enabled to catch complexity and potential issues
      // cognitive-complexity threshold set to 25 to accommodate complex React patterns
      // (gesture handlers, async hooks with caching). Default of 15 is too strict for React.
      'sonarjs/cognitive-complexity': ['error', 25],
    },
  },
  // Relaxed rules for test files - testing patterns require different constraints
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'e2e/**/*.{ts,tsx}'],
    rules: {
      // Testing frameworks use nested describe/it blocks which trigger this rule
      'sonarjs/no-nested-functions': 'off',
      // Math.random() is safe in tests for generating test data
      'sonarjs/pseudo-random': 'off',
      // void operator is sometimes used intentionally in test assertions
      'sonarjs/void-use': 'off',
      // Nested conditionals in test setup/assertions are acceptable
      'sonarjs/no-nested-conditional': 'off',
      // Some tests verify "no throw" behavior without explicit assertions
      'sonarjs/assertions-in-tests': 'off',
    },
  },
)
