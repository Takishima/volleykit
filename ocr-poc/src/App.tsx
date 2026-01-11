import { CaptureScreen } from './components/CaptureScreen'
import { CropScreen } from './components/CropScreen'
import { Header } from './components/Header'
import { ManuscriptOptionsScreen } from './components/ManuscriptOptionsScreen'
import { ProcessingScreen } from './components/ProcessingScreen'
import { ResultsScreen } from './components/ResultsScreen'
import { SheetTypeSelector } from './components/SheetTypeSelector'
import { useAppStore } from './stores/appStore'

export function App() {
  const state = useAppStore((s) => s.state)

  return (
    <div className="app-shell min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 flex flex-col">
        {state === 'select-type' && <SheetTypeSelector />}
        {state === 'manuscript-options' && <ManuscriptOptionsScreen />}
        {state === 'capture' && <CaptureScreen />}
        {state === 'crop' && <CropScreen />}
        {state === 'roster-crop' && <CropScreen isRosterCrop />}
        {state === 'processing' && <ProcessingScreen />}
        {(state === 'results' || state === 'roster-display') && <ResultsScreen />}
      </main>
    </div>
  )
}
