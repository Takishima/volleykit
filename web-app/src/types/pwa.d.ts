// Global constants set by vite.config.ts at build time
// __PWA_ENABLED__ is false for PR preview builds to avoid service worker scope conflicts
declare const __PWA_ENABLED__: boolean
// __APP_VERSION__ is the version from package.json
declare const __APP_VERSION__: string
// __GIT_HASH__ is the short git commit hash at build time (for PWA update detection)
declare const __GIT_HASH__: string

// Type declarations for vite-plugin-pwa's vanilla register module
declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegisteredSW?: (
      swScriptUrl: string,
      registration: ServiceWorkerRegistration | undefined
    ) => void
    onRegisterError?: (error: Error) => void
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>
}
