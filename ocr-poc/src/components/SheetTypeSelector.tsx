import { FileText, PenLine } from 'lucide-react'

import { useAppStore } from '@/stores/appStore'

import type { SheetType } from '@/stores/appStore'

interface SheetTypeOption {
  type: SheetType
  icon: React.ReactNode
  title: string
  description: string
}

const options: SheetTypeOption[] = [
  {
    type: 'electronic',
    icon: <FileText className="w-8 h-8" />,
    title: 'Electronic Scoresheet',
    description: 'Digital scoresheet displayed on a tablet or screen',
  },
  {
    type: 'manuscript',
    icon: <PenLine className="w-8 h-8" />,
    title: 'Manuscript Scoresheet',
    description: 'Physical paper scoresheet filled by hand',
  },
]

export function SheetTypeSelector() {
  const selectSheetType = useAppStore((s) => s.selectSheetType)

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Select Scoresheet Type</h2>
          <p className="mt-2 text-slate-600">Choose the type of scoresheet you want to scan</p>
        </div>

        <div className="space-y-4">
          {options.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => selectSheetType(option.type)}
              className="w-full flex items-start gap-4 p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="flex-shrink-0 p-3 bg-blue-100 text-blue-700 rounded-lg group-hover:bg-blue-200 transition-colors">
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 group-hover:text-blue-900">
                  {option.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
