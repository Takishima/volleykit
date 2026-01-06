/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { normalizeBasePath } from './src/shared/utils/basePath'
import packageJson from './package.json' with { type: 'json' }

// Plugin to exclude Zod v4 locale files from the bundle.
// Zod v4 includes ~50 locale files for i18n error messages that we don't use.
// This saves ~12-15 KB gzipped. The app uses default English error messages.
function zodLocalesStubPlugin(): Plugin {
  const ZOD_LOCALES_INDEX = /[/\\]zod[/\\]v4[/\\]locales[/\\]index\.js$/;
  const STUB_CODE = 'export {};'; // Empty module - only English locale is loaded by default

  return {
    name: 'zod-locales-stub',
    enforce: 'pre',
    load(id) {
      // Replace zod's locales index with an empty module to exclude all non-English locales
      if (ZOD_LOCALES_INDEX.test(id)) {
        return STUB_CODE;
      }
      return null;
    },
  };
}

// Plugin to handle 404.html for GitHub Pages SPA routing
function spaFallbackPlugin(basePath: string): Plugin {
  return {
    name: 'spa-fallback',
    apply: 'build', // Only run during build, not during tests or dev
    closeBundle() {
      try {
        const source404Path = path.resolve(__dirname, '404.html');
        const dist404Path = path.resolve(__dirname, 'dist', '404.html');

        if (!existsSync(source404Path)) {
          throw new Error('404.html not found - SPA fallback is required for GitHub Pages deployment');
        }

        const content = readFileSync(source404Path, 'utf-8');
        const processedContent = content.replaceAll('{{BASE_URL}}', basePath);

        writeFileSync(dist404Path, processedContent);

        console.log(`✓ Generated 404.html with base path: "${basePath}"`);
      } catch (error) {
        console.error('Failed to generate 404.html:', error);
        throw error;  // Fail build if this critical file can't be created
      }
    },
  };
}

// Target API server for development proxy
const VOLLEYMANAGER_API = 'https://volleymanager.volleyball.ch';

/**
 * Creates proxy configuration for development server.
 * All paths are proxied to the VolleyManager API with CORS bypass.
 *
 * Important: Uses a bypass function to skip proxying browser page navigation
 * (HTML requests). This prevents conflicts with SPA routes like /login that
 * are also API endpoints. Browser navigation should serve index.html, while
 * fetch() API calls should be proxied.
 */
function createDevProxy(paths: string[]): Record<string, object> {
  const proxyConfig: Record<string, object> = {};
  for (const proxyPath of paths) {
    proxyConfig[proxyPath] = {
      target: VOLLEYMANAGER_API,
      changeOrigin: true,
      secure: true,
      cookieDomainRewrite: 'localhost',
      // Skip proxying for HTML page navigation - serve SPA's index.html instead.
      // Browser navigation sends Accept headers starting with "text/html".
      // API fetch calls send "*/*" or specific content types.
      // Return a path string to serve that file instead of proxying.
      bypass(req: { headers: { accept?: string } }) {
        const accept = req.headers.accept || '';
        if (accept.startsWith('text/html')) {
          // Return index.html path to serve SPA for page navigation
          return '/index.html';
        }
        // Return undefined to proceed with proxying for API calls
        return undefined;
      },
    };
  }
  return proxyConfig;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Warn if proxy URL is not configured for production (runtime check in client.ts handles the actual failure)
  if (mode === 'production' && !process.env.VITE_API_PROXY_URL) {
    console.warn(
      '\x1b[33m⚠ Warning: VITE_API_PROXY_URL is not set for production build.\n' +
      '  API calls will fail unless configured. Set it to your Cloudflare Worker URL.\x1b[0m'
    );
  }

  // Normalize base path for deployment
  const rawBasePath = process.env.VITE_BASE_PATH;
  const basePath = normalizeBasePath(rawBasePath);

  // Detect if this is a PR preview build (path contains /pr-{number}/)
  // PR previews don't need service workers - they're for testing only
  // Also, the main site's service worker scope (/volleykit/) would intercept
  // PR preview requests (/volleykit/pr-XX/), causing navigation issues
  // Note: normalizeBasePath() guarantees trailing slash, so we can safely require it in the regex
  const isPrPreview = /\/pr-\d+\//.test(basePath);

  if (mode === 'production') {
    if (!rawBasePath) {
      console.warn(
        '\x1b[33m⚠ Warning: VITE_BASE_PATH is not set for production build.\n' +
        '  Defaulting to "/" - set VITE_BASE_PATH in deployment workflow for GitHub Pages.\n' +
        '  Example: VITE_BASE_PATH="/volleykit/"\x1b[0m'
      );
    } else if (basePath !== rawBasePath) {
      // Log the normalized path for debugging
      console.log(
        `\x1b[36mℹ VITE_BASE_PATH normalized: "${rawBasePath}" → "${basePath}"\x1b[0m`
      );
    }

    console.log(`\x1b[32m✓ Building with base path: "${basePath}"\x1b[0m`);

    if (isPrPreview) {
      console.log(`\x1b[36mℹ PR preview detected - service worker disabled\x1b[0m`);
    }
  }

  return {
    define: {
      // Expose PWA enabled state to the app
      '__PWA_ENABLED__': JSON.stringify(!isPrPreview),
      // Expose app version from package.json
      '__APP_VERSION__': JSON.stringify(packageJson.version),
    },
    build: {
      rollupOptions: {
        output: {
          // Lazy-loaded chunks get "chunk-" prefix to distinguish from main "index-" bundle.
          // This ensures size-limit's "index-*.js" pattern only matches the main bundle.
          chunkFileNames: 'assets/chunk-[name]-[hash].js',
          // Merge small chunks (under 5KB) to reduce HTTP overhead.
          // Very small chunks add module wrapper overhead without significant lazy-loading benefit.
          experimentalMinChunkSize: 5_000,
          // Manual chunks for bundle splitting. Names must match size-limit config in package.json.
          // Current sizes (gzipped) and limits:
          //   - Main App Bundle (index-*.js):     ~110 kB, limit 145 kB (+35 kB headroom)
          //   - Vendor Chunks (combined):         ~46 kB,  limit 50 kB  (+4 kB headroom)
          //   - PDF Library (pdf-lib-*.js):       ~181 kB, limit 185 kB (+4 kB headroom) - lazy-loaded
          //   - Total JS Bundle:                  ~440 kB, limit 460 kB (+20 kB headroom)
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'router': ['react-router-dom'],
            'state': ['zustand', '@tanstack/react-query'],
            'validation': ['zod'],
            'pdf-lib': ['pdf-lib'],
          },
        },
      },
    },
    plugins: [
      zodLocalesStubPlugin(),
      react(),
      tailwindcss(),
      // Disable PWA for PR previews to avoid service worker scope conflicts
      // The main site's SW scope (/volleykit/) would intercept PR preview requests
      !isPrPreview && VitePWA({
        registerType: 'autoUpdate',
        // Include the service worker in development for testing
        devOptions: {
          enabled: true,
        },
        workbox: {
          // Precache all static assets (app shell)
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // Don't precache API responses or large files
          globIgnores: ['**/node_modules/**/*'],
          // Use NetworkFirst for navigation requests to ensure fresh content
          // but fall back to cache during deployment/network issues
          // navigateFallback defaults to 'index.html' with correct base path handling
          navigateFallbackDenylist: [
            // Don't intercept API routes (with or without basePath)
            /\/neos/,
            /\/indoorvolleyball\.refadmin/,
            /\/sportmanager\.indoorvolleyball/,
            // Don't intercept security/auth routes - critical for login flow
            /\/sportmanager\.security/,
            /\/login$/,
            /\/logout$/,
            // Don't intercept PR preview routes - let them load their own assets
            /\/pr-\d+/,
            // Don't intercept OCR POC routes - it's a separate app
            /\/ocr-poc/,
            // Don't intercept help site routes - it's a separate Astro app
            /\/help/,
            // Don't intercept PDF files - let browser handle natively
            /\.pdf$/,
          ],
          // Runtime caching for API responses
          runtimeCaching: [
            {
              // Cache API responses with NetworkFirst strategy
              // This ensures fresh data when online, cached data when offline/deploying
              urlPattern: /^https:\/\/volleymanager\.volleyball\.ch\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
                networkTimeoutSeconds: 10,
              },
            },
          ],
        },
        manifest: {
          name: 'VolleyKit',
          short_name: 'VolleyKit',
          description: 'Swiss Volleyball Referee Management PWA',
          theme_color: '#ff6b00',
          background_color: '#ffffff',
          display: 'standalone',
          scope: basePath,
          start_url: basePath,
          icons: [
            {
              src: 'pwa-64x64.png',
              sizes: '64x64',
              type: 'image/png',
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
      spaFallbackPlugin(basePath),
      // Bundle analyzer - generates stats.html after build
      visualizer({
        filename: 'stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
    // Base path for deployment - normalized from VITE_BASE_PATH env var
    base: basePath,
    test: {
      globals: true,
      // Default to happy-dom, but pure unit tests use faster node environment
      environment: 'happy-dom',
      environmentMatchGlobs: [
        // Pure unit tests don't need DOM - run in faster node environment
        ['src/api/**/*.test.ts', 'node'],
        ['src/i18n/**/*.test.ts', 'node'],
        ['src/shared/stores/**/*.test.ts', 'node'],
        ['src/shared/utils/**/*.test.ts', 'node'],
        ['src/shared/services/**/*.test.ts', 'node'],
        ['src/features/**/utils/**/*.test.ts', 'node'],
        ['src/features/**/api/**/*.test.ts', 'node'],
        ['src/test/**/*.test.ts', 'node'],
      ],
      setupFiles: './src/test/setup.ts',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      // Performance: vmThreads is much faster than default forks
      pool: 'vmThreads',
      // Fix react-router ESM/CJS compatibility with vmThreads
      server: {
        deps: {
          inline: [/react-router/],
          fallbackCJS: true,
        },
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.test.{ts,tsx}',
          '**/types/**',
        ],
        thresholds: {
          // Prevent coverage regressions - enforce minimum coverage
          // Current coverage: ~54% statements, ~74% branches, ~72% functions
          // Target: 70% to encourage incremental improvement
          lines: 50,
          functions: 70,
          branches: 70,
          statements: 50,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      // Fix dual package hazard with react-router in Node v22.12+
      // See: https://github.com/vitest-dev/vitest/issues/7692
      conditions: ['module-sync'],
    },
    server: {
      proxy: createDevProxy([
        // Authentication endpoints
        '/login',
        '/logout',
        '/sportmanager.security',
        '/sportmanager.volleyball',
        // API endpoints
        '/neos',
        '/indoorvolleyball.refadmin',
        '/sportmanager.indoorvolleyball',
      ]),
    },
  };
})
