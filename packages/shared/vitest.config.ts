/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    // Use happy-dom for React testing (faster than jsdom)
    environment: 'happy-dom',
    environmentMatchGlobs: [
      // Pure unit tests don't need DOM - run in faster node environment
      ['src/api/**/*.test.ts', 'node'],
      ['src/utils/**/*.test.ts', 'node'],
    ],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/types/**',
        '**/index.ts', // Re-export files
      ],
    },
  },
})
