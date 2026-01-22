import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import sonarjs from 'eslint-plugin-sonarjs';
import importX from 'eslint-plugin-import-x';
import security from 'eslint-plugin-security';

export default tseslint.config(
  {
    ignores: ['node_modules/', 'dist/', 'ios/', 'android/', '.expo/', 'coverage/'],
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      sonarjs.configs.recommended,
    ],
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
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
      react: {
        version: 'detect',
      },
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      // React hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',

      // Import ordering - consistent import structure across codebase
      'import-x/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'type',
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

      // Security rules - prevent common vulnerabilities
      ...security.configs.recommended.rules,
      // Disable security rules that produce false positives:
      // - detect-object-injection: TypeScript's type system ensures bracket notation
      //   is only used with known keys (string literals, enums, typed arrays)
      // - detect-non-literal-fs-filename: Not applicable in React Native context
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',

      // Magic numbers - disabled for mobile as existing codebase has many
      // time constants and configuration values that would require significant refactoring
      '@typescript-eslint/no-magic-numbers': 'off',

      // SonarJS rules - code quality and complexity
      // Disable rules with high false positive rates:
      'sonarjs/todo-tag': 'off',
      'sonarjs/no-hardcoded-passwords': 'off',
      'sonarjs/class-name': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/no-nested-template-literals': 'off',
      'sonarjs/no-intrusive-permissions': 'off',
      'sonarjs/public-static-readonly': 'off',
      'sonarjs/no-nested-functions': 'off',
      'sonarjs/no-unused-vars': 'off',
      'sonarjs/pseudo-random': 'off',
      'sonarjs/use-type-alias': 'off',
      'sonarjs/slow-regex': 'off',
      // cognitive-complexity threshold set to 25 for complex React patterns
      'sonarjs/cognitive-complexity': ['error', 25],
    },
  },
  // Relaxed rules for test files
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off',
      'sonarjs/no-nested-functions': 'off',
      'sonarjs/pseudo-random': 'off',
      'sonarjs/void-use': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/assertions-in-tests': 'off',
      'import-x/order': 'off',
    },
  }
);
