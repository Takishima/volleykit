// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://takishima.github.io',
  base: '/volleykit/help',
  integrations: [tailwindcss()],
});
