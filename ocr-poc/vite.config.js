import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Base path for GitHub Pages subdirectory deployment
// In production, this app is served from /volleykit/ocr-poc/
const BASE_PATH = process.env.VITE_BASE_PATH || '/ocr-poc/';

// Cache expiration constants
const SECONDS_PER_DAY = 60 * 60 * 24;
const CACHE_MAX_AGE_DAYS = 7;

// OCR service caching constants
const API_CACHE_MAX_ENTRIES = 20;
const MODEL_CACHE_MAX_ENTRIES = 10;
const NETWORK_TIMEOUT_SECONDS = 10;
const MODEL_CACHE_MAX_AGE_DAYS = 30;

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
          // External OCR service caching rules
          {
            // Google Cloud Vision API responses
            // Uses NetworkFirst since OCR results are dynamic, but cache for offline fallback
            urlPattern: /^https:\/\/vision\.googleapis\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ocr-google-vision-api',
              expiration: {
                maxEntries: API_CACHE_MAX_ENTRIES,
                maxAgeSeconds: SECONDS_PER_DAY,
              },
              networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // AWS Textract API responses
            urlPattern: /^https:\/\/textract\.[a-z0-9-]+\.amazonaws\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ocr-aws-textract-api',
              expiration: {
                maxEntries: API_CACHE_MAX_ENTRIES,
                maxAgeSeconds: SECONDS_PER_DAY,
              },
              networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // PaddleOCR or other self-hosted OCR model files (WASM, ONNX, etc.)
            // These static assets can be cached aggressively
            urlPattern: /\.(wasm|onnx|bin|pb|pth|pt|weights)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ocr-model-files',
              expiration: {
                maxEntries: MODEL_CACHE_MAX_ENTRIES,
                maxAgeSeconds: SECONDS_PER_DAY * MODEL_CACHE_MAX_AGE_DAYS,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
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
