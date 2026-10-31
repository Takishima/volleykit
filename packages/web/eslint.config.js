import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefreshPlugin from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import security from 'eslint-plugin-security'
import noUnsanitized from 'eslint-plugin-no-unsanitized'
import sonarjs from 'eslint-plugin-sonarjs'
import { importX } from 'eslint-plugin-import-x'
import vitest from '@vitest/eslint-plugin'
import testingLibrary from 'eslint-plugin-testing-library'
import playwright from 'eslint-plugin-playwright'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import oxlint from 'eslint-plugin-oxlint'
import tseslint from 'typescript-eslint'

// Size and naming rules from CLAUDE.md "Code Standards". Pre-existing hits are
// grandfathered in eslint-suppressions.json (ESLint bulk suppressions); new
// code must comply. `pnpm run lint:fix` prunes suppressions that no longer apply.
const MAX_FUNCTION_LINES = 30
const MAX_PARAMS = 4

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
    extends: [js.configs.recommended, ...tseslint.configs.recommended, sonarjs.configs.recommended],
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
      'react-refresh': reactRefreshPlugin,
      'jsx-a11y': jsxA11y,
      security,
      'no-unsanitized': noUnsanitized,
      'import-x': importX,
    },
    settings: {
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      // eslint-plugin-react-hooks 6+ bundles the React Compiler diagnostics
      // (react-hooks/refs, set-state-in-effect, purity, ...), so the separate
      // eslint-plugin-react-compiler is not needed.
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      // Import ordering - consistent import structure across codebase
      'import-x/order': [
        'warn',
        {
          groups: [
            'builtin', // Node.js built-ins
            'external', // npm packages
            'internal', // @/ aliased imports
            ['parent', 'sibling', 'index'], // Relative imports
            'type', // Type imports
          ],
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
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
        },
      ],
      // Prevent duplicate imports from the same module
      'import-x/no-duplicates': 'error',
      // Circular module graphs break iOS Safari PWA standalone mode (see the
      // cross-feature barrel rule below); keep the graph acyclic.
      'import-x/no-cycle': 'error',
      // Ensure imports resolve to actual files
      'import-x/no-unresolved': 'off', // TypeScript handles this better
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Naming (CLAUDE.md): components PascalCase, hooks useCamelCase, constants
      // SCREAMING_SNAKE_CASE. Object/type properties are exempt because API payload
      // keys (__identity, Set-Cookie, ...) are dictated by the backend.
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
      // Size limits (CLAUDE.md): functions > 30 lines or > 4 parameters.
      'max-params': ['error', MAX_PARAMS],
      'max-lines-per-function': [
        'error',
        { max: MAX_FUNCTION_LINES, skipBlankLines: true, skipComments: true, IIFEs: false },
      ],
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
      // Magic numbers - enforce named constants for clarity
      // Use HttpStatus enum and time/size constants from @/shared/utils/constants
      '@typescript-eslint/no-magic-numbers': [
        'warn',
        {
          ignore: [-1, 0, 1, 2, 100], // Only basic math operations and percentages
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
          enforceConst: true,
        },
      ],
      // Allow underscore-prefixed unused variables (standard pattern for intentionally unused params)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // SonarJS rules - code quality and complexity
      // Disable rules with high false positive rates in this codebase:
      // - no-nested-conditional: Common pattern in JSX for conditional rendering
      // - no-intrusive-permissions: Geolocation is an intentional core feature
      // - no-unused-vars: Already covered by @typescript-eslint/no-unused-vars
      // - pseudo-random: Math.random() is acceptable for non-security contexts (jitter, UI)
      // Every other sonarjs rule that used to be muted here (class-name,
      // no-hardcoded-passwords, no-nested-template-literals, no-nested-functions,
      // public-static-readonly) has zero hits in the codebase, so it stays on.
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/no-intrusive-permissions': 'off',
      'sonarjs/no-unused-vars': 'off',
      'sonarjs/pseudo-random': 'off',
      // Test-only assertion style rules new in eslint-plugin-sonarjs 4.1.0.
      // no-floating-point-equality / super-linear-regex are NOT muted globally so
      // they still catch real float-comparison and ReDoS bugs in production code.
      'sonarjs/prefer-specific-assertions': 'off',
      'sonarjs/no-trivial-assertions': 'off',
      // Code quality rules - enabled to catch complexity and potential issues
      // cognitive-complexity threshold set to 25 to accommodate complex React patterns
      // (gesture handlers, async hooks with caching). Default of 15 is too strict for React.
      'sonarjs/cognitive-complexity': ['error', 25],
    },
  },
  // The raw real API client bypasses the association guard (src/api/association-guard.ts).
  // Everything must go through the guarded `api` / `getApiClient()` from @/api/client,
  // otherwise a request can run while the server session is on another association.
  // Type-only imports are allowed since they are erased at compile time.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/api/client.ts',
      'src/api/association-guard.ts',
      'src/api/association-guard.test.ts',
      'src/api/real-api.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(@/api/real-api|\\.{1,2}/(api/)?real-api)$',
              message:
                'Import the guarded client from @/api/client (api or getApiClient) instead of the raw real-api module. ' +
                'The guard keeps the server session on the selected association (see docs/CODE_PATTERNS.md).',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  // Prevent deep cross-feature imports from shared/ code.
  // Shared hooks/utils/components should not import from feature internals.
  // They should import from feature barrel files (index.ts) if needed at all.
  {
    files: ['src/common/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'src/common/stores/**'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: [
                '@/features/*/hooks/*',
                '@/features/*/utils/*',
                '@/features/*/services/*',
                '@/features/*/components/*',
                '@/features/*/api/*',
              ],
              message:
                'Shared code should not import feature internals. Import from the feature barrel (@/features/X) or promote the utility to shared/.',
            },
          ],
        },
      ],
    },
  },
  // Prevent cross-feature barrel imports that defeat lazy-loading code splitting.
  // Feature code must use direct file paths when importing from other features.
  // Barrel imports (e.g., '@/features/exchanges') pull in page components,
  // creating circular module graphs that break iOS Safari PWA standalone mode.
  // Type-only imports are allowed since they are erased at compile time.
  {
    files: ['src/features/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@/features/[^/]+$',
              message:
                'Cross-feature barrel imports defeat code splitting and break iOS PWA. ' +
                'Use direct file paths instead (e.g., @/features/X/hooks/useY).',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  // Type-aware rules. projectService maps each file to the tsconfig that
  // includes it (app / node / test; the two config files are in node).
  {
    files: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts', 'vite.config.ts', 'playwright.config.ts'],
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
  // Tailwind 4: flag classes that do not exist in the design system / config
  // and conflicting utilities. Class ordering is left to the author.
  {
    files: ['src/**/*.tsx'],
    plugins: { 'better-tailwindcss': betterTailwindcss },
    settings: {
      'better-tailwindcss': { entryPoint: 'src/index.css' },
    },
    rules: {
      ...betterTailwindcss.configs['correctness-error'].rules,
    },
  },
  // Ambient declarations carry names dictated by the libraries they describe.
  {
    files: ['**/*.d.ts'],
    rules: { '@typescript-eslint/naming-convention': 'off' },
  },
  // Vitest + Testing Library conventions for unit tests.
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    extends: [vitest.configs.recommended, testingLibrary.configs['flat/react']],
    settings: {
      vitest: { typecheck: true },
      // Without this the plugin reports every `.debug()` call, including the
      // app logger under test, as a leftover `screen.debug()`.
      'testing-library/utils-module': '@testing-library/react',
    },
    rules: {
      // Existing tests assert on classes and DOM structure through
      // container.querySelector on purpose (Tailwind class checks); the
      // Testing Library "query by role" guidance is kept for new interactions,
      // not retrofitted onto every structural assertion.
      'testing-library/no-node-access': 'off',
      'testing-library/no-container': 'off',
      // `vi.mocked(obj.method)` and `expect(obj.method)` are not `this`-sensitive;
      // the vitest-aware variant understands those call sites.
      '@typescript-eslint/unbound-method': 'off',
      'vitest/unbound-method': 'error',
      // `async` test bodies without an await are harmless and common when a
      // test awaits nothing but keeps the signature uniform.
      '@typescript-eslint/require-await': 'off',
    },
  },
  // Playwright conventions for e2e specs.
  {
    files: ['e2e/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      // Fixed waits and networkidle are deliberate in the PWA/screenshot flows
      // (same reasoning as the muted sonarjs equivalents below).
      'playwright/no-wait-for-timeout': 'off',
      'playwright/no-networkidle': 'off',
      // Screenshot capture specs branch on viewport/locale and skip per project.
      'playwright/no-conditional-in-test': 'off',
      'playwright/no-skipped-test': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },
  // The screenshot capture suite produces images, not assertions.
  {
    files: ['e2e/capture-screenshots.spec.ts'],
    rules: { 'playwright/expect-expect': 'off' },
  },
  // Relaxed rules for test files - testing patterns require different constraints
  {
    files: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      'e2e/**/*.{ts,tsx}',
      'src/test/**/*.{ts,tsx}',
    ],
    rules: {
      // Magic numbers are common in test data and assertions
      '@typescript-eslint/no-magic-numbers': 'off',
      // describe/it callbacks are long by nature; fixtures take many args
      'max-lines-per-function': 'off',
      'max-params': 'off',
      // Math.random() is safe in tests for generating test data
      'sonarjs/pseudo-random': 'off',
      // void operator is sometimes used intentionally in test assertions
      'sonarjs/void-use': 'off',
      // Nested conditionals in test setup/assertions are acceptable
      'sonarjs/no-nested-conditional': 'off',
      // Some tests verify "no throw" behavior without explicit assertions
      'sonarjs/assertions-in-tests': 'off',
      // Exact float equality is fine in tests with deterministic fixture values
      'sonarjs/no-floating-point-equality': 'off',
      // New in eslint-plugin-sonarjs 4.2.0 - test-only style rules.
      // parameterized-tests would force test.each on intentionally explicit,
      // readable per-case tests; fixed waits are sometimes needed in e2e flows.
      'sonarjs/parameterized-tests': 'off',
      'sonarjs/no-fixed-wait-in-tests': 'off',
      // New in eslint-plugin-sonarjs 4.2.1 - networkidle waits are intentional
      // in e2e/screenshot specs to let the PWA settle before capturing.
      'sonarjs/no-networkidle-wait': 'off',
      // Import ordering is relaxed for tests - mocks need to be set up before imports
      'import-x/order': 'off',
    },
  },
  // oxlint (root .oxlintrc.json) runs first as the fast pass; switch off every
  // ESLint rule it already enforces so the two cannot disagree. Must stay last.
  ...(await oxlint.buildFromConfigFile('../../.oxlintrc.json')),
  // ESLint owns every react-hooks rule: the compiler diagnostics exist only
  // here, and rules-of-hooks/exhaustive-deps are switched off in .oxlintrc.json
  // so each rule has exactly one implementation reporting it.
  {
    files: ['**/*.{ts,tsx}'],
    rules: { ...reactHooks.configs.recommended.rules },
  }
)
