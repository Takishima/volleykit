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

  ignoreExportsUsedInFile: true,

  rules: {
    duplicates: 'off',
    unlisted: 'off',
    unresolved: 'off',
  },
}

export default config
