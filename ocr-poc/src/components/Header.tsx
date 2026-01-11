import { ArrowLeft, ScanLine } from 'lucide-react'

import { useAppStore } from '@/stores/appStore'

export function Header() {
  const state = useAppStore((s) => s.state)
  const goBack = useAppStore((s) => s.goBack)
  const reset = useAppStore((s) => s.reset)

  const showBack = state !== 'select-type'

  return (
    <header className="flex-shrink-0 bg-blue-800 text-white px-4 py-3 flex items-center gap-3 shadow-md">
      {showBack ? (
        <button
          type="button"
          onClick={goBack}
          className="p-2 -ml-2 rounded-full hover:bg-blue-700 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      ) : (
        <ScanLine className="w-6 h-6" />
      )}

      <h1 className="text-lg font-semibold flex-1">Scoresheet Scanner</h1>

      {state !== 'select-type' && (
        <button
          type="button"
          onClick={reset}
          className="text-sm text-blue-200 hover:text-white transition-colors"
        >
          Start Over
        </button>
      )}
    </header>
  )
}
