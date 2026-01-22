import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['App.tsx', 'src/**/*.{ts,tsx}', 'app.json'],
  project: ['src/**/*.{ts,tsx}', '*.{ts,tsx,js,cjs}'],
  ignore: ['src/types/**/*.d.ts', 'nativewind-env.d.ts'],

  ignoreDependencies: [
    // Monorepo workspace dependency - used via path alias, not detected by static analysis
    '@volleykit/shared',

    // Expo/React Native dependencies configured in app.json or used via native modules
    // These are loaded dynamically by Expo's plugin system, not via direct imports
    'expo-linking', // Deep linking configured in app.json
    'expo-router', // File-based routing configured in app.json
    'expo-updates', // OTA updates configured in app.json
    'expo-system-ui', // System UI theming configured in app.json

    // React Navigation peer dependency - required by @react-navigation but not directly imported
    'react-native-screens',

    // Shared package re-exports - used indirectly via @volleykit/shared
    'zod', // Schema validation, re-exported from shared
    'zustand', // State management, re-exported from shared

    // External SDK with dynamic imports
    'ojp-sdk-next', // Swiss public transport API, dynamically imported in route-calculator

    // Dev tooling - used by their respective CLIs, not directly imported
    '@babel/core', // Used by babel.config.cjs
    'eslint', // Used by eslint CLI
    'jest', // Used by jest CLI
    'jest-expo', // Jest preset for Expo
    'react-test-renderer', // Used by jest-expo for component testing
  ],

  ignoreBinaries: [
    'expo', // Expo CLI
    'tsc', // TypeScript compiler
    'eslint', // ESLint CLI
    'jest', // Jest CLI
    'knip', // Knip CLI
  ],

  ignoreExportsUsedInFile: true,

  rules: {
    // Expo/RN projects have many dynamic imports and plugin-based dependencies
    // that static analysis cannot detect
    duplicates: 'off',
    unlisted: 'off',
    unresolved: 'off',
  },
};

export default config;
