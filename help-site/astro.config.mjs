// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Base path can be overridden via environment variable for PR previews
// Default: /volleykit/help (production)
// PR preview: /volleykit/pr-{number}/help
const basePath = process.env.ASTRO_BASE_PATH || '/volleykit/help';

// https://astro.build/config
export default defineConfig({
  site: 'https://takishima.github.io',
  base: basePath,
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        // Pagefind JS is generated after build, so we need to externalize it
        external: [/\/_pagefind\//],
      },
    },
  },
});
