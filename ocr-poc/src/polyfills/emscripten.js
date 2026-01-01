/**
 * Emscripten WASM polyfills for browser
 *
 * Provides the global Module object that Emscripten-compiled
 * WebAssembly modules expect to exist.
 */

// Create Module global if it doesn't exist
if (typeof window !== 'undefined' && typeof window.Module === 'undefined') {
  window.Module = {
    // Emscripten module configuration
    locateFile: (path) => path,
    onRuntimeInitialized: () => {},
    print: (...args) => console.log(...args),
    printErr: (...args) => console.error(...args),
  };
}

// Ensure global is available
if (typeof globalThis !== 'undefined' && typeof globalThis.Module === 'undefined') {
  globalThis.Module = window.Module;
}

export default window.Module;
