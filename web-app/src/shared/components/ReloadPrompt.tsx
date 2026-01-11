import { lazy, Suspense } from 'react'

// Lazy load the actual PWA component only when PWA is enabled
// This prevents the virtual:pwa-register/react import from being resolved
// when the VitePWA plugin is disabled (PR preview builds)
const ReloadPromptPWA = lazy(() =>
  __PWA_ENABLED__ ? import('./ReloadPromptPWA') : Promise.resolve({ default: () => null })
)

export function ReloadPrompt() {
  return (
    <Suspense fallback={null}>
      <ReloadPromptPWA />
    </Suspense>
  )
}
