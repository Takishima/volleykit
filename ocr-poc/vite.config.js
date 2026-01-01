import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Base path for GitHub Pages subdirectory deployment
// In production, this app is served from /volleykit/ocr-poc/
const BASE_PATH = process.env.VITE_BASE_PATH || '/ocr-poc/';

// Cache expiration constants
const SECONDS_PER_DAY = 60 * 60 * 24;
const CACHE_MAX_AGE_DAYS = 7;
const CDN_CACHE_DAYS = 30;

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      workbox: {
        // Precache app shell assets (exclude WASM files - they're too large)
        globPatterns: ['**/*.{css,html,ico,png,svg,woff,woff2}'],
        // Allow larger files for precaching (ONNX runtime is ~24MB)
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024, // 30MB
        // Runtime caching strategies
        runtimeCaching: [
          {
            // Cache same-origin JS files (including large ONNX runtime)
            urlPattern: /\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ocr-poc-js',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: SECONDS_PER_DAY * CACHE_MAX_AGE_DAYS,
              },
            },
          },
          {
            // Cache WASM files (ONNX runtime)
            urlPattern: /\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ocr-poc-wasm',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: SECONDS_PER_DAY * CACHE_MAX_AGE_DAYS,
              },
            },
          },
          {
            // Cache PaddleOCR ONNX models from Hugging Face
            urlPattern: /^https:\/\/huggingface\.co\/.*\.(onnx|txt)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'paddleocr-models',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: SECONDS_PER_DAY * CDN_CACHE_DAYS,
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
    // Increase chunk size warning limit for ONNX runtime
    chunkSizeWarningLimit: 15000, // 15MB
    rollupOptions: {
      output: {
        // Split large dependencies into separate chunks
        manualChunks: {
          'onnx-runtime': ['onnxruntime-web'],
          'opencv': ['@techstark/opencv-js'],
        },
      },
    },
  },
  // Optimize dependency handling
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
});
