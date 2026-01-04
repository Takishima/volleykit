// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://takishima.github.io',
  base: '/volleykit/help',
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
