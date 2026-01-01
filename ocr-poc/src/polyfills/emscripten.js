/**
 * Emscripten WASM polyfills for browser
 *
 * Provides the global Module object that Emscripten-compiled
 * WebAssembly modules (like OpenCV.js used by PaddleOCR) expect.
 */

// Create a comprehensive Module object that Emscripten expects
const EmscriptenModule = {
  // File location
  locateFile: (path, prefix) => {
    // Return the path as-is for CDN loading
    return prefix ? prefix + path : path;
  },

  // Runtime callbacks
  onRuntimeInitialized: () => {
    console.log('[Emscripten] Runtime initialized');
  },
  onAbort: (what) => {
    console.error('[Emscripten] Aborted:', what);
  },

  // Console output
  print: (...args) => console.log('[Emscripten]', ...args),
  printErr: (...args) => console.error('[Emscripten]', ...args),

  // Memory configuration
  INITIAL_MEMORY: 134217728, // 128MB

  // Prevent automatic running
  noInitialRun: true,
  noExitRuntime: true,
};

// Set up global Module before any Emscripten code runs
// Note: Do NOT set window.cv here - PaddleOCR bundles its own OpenCV and will set cv
if (typeof window !== 'undefined') {
  // Only set if not already defined
  if (typeof window.Module === 'undefined') {
    window.Module = EmscriptenModule;
  }
}

// Set on globalThis as well
if (typeof globalThis !== 'undefined') {
  if (typeof globalThis.Module === 'undefined') {
    globalThis.Module = EmscriptenModule;
  }
}

export default EmscriptenModule;
