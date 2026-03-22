// @ts-check
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

// Base path can be overridden via environment variable for PR previews
// Default: /volleykit/help (production)
// PR preview: /volleykit/pr-{number}/help
const basePath = process.env.ASTRO_BASE_PATH || '/help'

// https://astro.build/config
export default defineConfig({
  site: process.env.ASTRO_SITE_URL || 'https://volleykit.ch',
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
})
