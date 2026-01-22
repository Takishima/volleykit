/** @type {import('knip').KnipConfig} */
const config = {
  entry: ['App.tsx', 'src/**/*.{ts,tsx}'],
  project: ['src/**/*.{ts,tsx}', '*.{ts,tsx,js,cjs}'],
  ignore: ['src/types/**/*.d.ts', 'nativewind-env.d.ts'],

  // Enable tool plugins to detect their dependencies
  babel: {
    config: ['babel.config.cjs'],
  },
  eslint: true,
  jest: true,

  ignoreDependencies: [
    // Workspace dependency resolved via path alias
    '@volleykit/shared',

    // Expo plugins in app.json - loaded dynamically by Expo
    'expo-linking',
    'expo-router',

    // Peer dependency of @react-navigation/native-stack
    'react-native-screens',

    // Peer dependencies required by @volleykit/shared
    'zod',
    'zustand',

    // Dynamic import() in route-calculator.ts
    'ojp-sdk-next',

    // Dev tool dependencies - used by CLIs, not imported
    '@babel/core',
    'eslint',
    'jest',
    'jest-expo',
    'react-test-renderer',
  ],

  ignoreBinaries: ['expo', 'tsc', 'eslint', 'jest', 'knip'],

  ignoreExportsUsedInFile: true,

  rules: {
    duplicates: 'off',
    unlisted: 'off',
    unresolved: 'off',
  },
};

export default config;
