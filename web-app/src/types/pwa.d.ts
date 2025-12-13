// Global flag set by vite.config.ts to indicate if PWA is enabled
// This is false for PR preview builds to avoid service worker scope conflicts
declare const __PWA_ENABLED__: boolean;

// Type declarations for vite-plugin-pwa's vanilla register module
declare module "virtual:pwa-register" {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisteredSW?: (
      swScriptUrl: string,
      registration: ServiceWorkerRegistration | undefined,
    ) => void;
    onRegisterError?: (error: Error) => void;
  }

  export function registerSW(
    options?: RegisterSWOptions,
  ): (reloadPage?: boolean) => Promise<void>;
}
