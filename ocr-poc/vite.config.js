import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Base path for GitHub Pages subdirectory deployment
// In production, this app is served from /volleykit/ocr-poc/
const BASE_PATH = process.env.VITE_BASE_PATH || '/ocr-poc/';

// Cache expiration constants
const SECONDS_PER_DAY = 60 * 60 * 24;
const CACHE_MAX_AGE_DAYS = 7;

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      workbox: {
        // Precache app shell assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Runtime caching strategies
        runtimeCaching: [
          {
            // Cache same-origin requests (assets, etc.)
            urlPattern: ({ sameOrigin }) => sameOrigin,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ocr-poc-assets',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: SECONDS_PER_DAY * CACHE_MAX_AGE_DAYS,
              },
            },
          },
          // TODO: Add caching rules for external OCR service assets when integrated
        ],
      },
      manifest: {
        name: 'Scoresheet Scanner',
        short_name: 'Scanner',
        description: 'OCR tool for volleyball scoresheets',
        theme_color: '#1e40af',
        background_color: '#f8fafc',
        display: 'standalone',
        scope: BASE_PATH,
        start_url: BASE_PATH,
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  build: {
    // Output directory for production build
    outDir: 'dist',
    // Generate source maps for debugging
    sourcemap: false,
  },
});
