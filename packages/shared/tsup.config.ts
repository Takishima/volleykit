import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'api/index': 'src/api/index.ts',
    'stores/index': 'src/stores/index.ts',
    'hooks/index': 'src/hooks/index.ts',
    'utils/index': 'src/utils/index.ts',
    'i18n/index': 'src/i18n/index.ts',
    'types/index': 'src/types/index.ts',
    'adapters/index': 'src/adapters/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', '@tanstack/react-query', 'zustand', 'zod', 'date-fns'],
})
