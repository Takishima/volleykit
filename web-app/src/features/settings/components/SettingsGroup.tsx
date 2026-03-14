import { type ReactNode, useCallback, useId } from 'react'

import { useShallow } from 'zustand/react/shallow'

import { Card } from '@/shared/components/Card'
import { ExpandArrow } from '@/shared/components/ExpandArrow'
import { useSettingsStore } from '@/shared/stores/settings'

interface SettingsGroupProps {
  /** Unique key for persisting expansion state */
  groupKey: string
  icon?: ReactNode
  title: string
  /** Default expansion state when no persisted state exists */
  defaultExpanded?: boolean
  children: ReactNode
  'data-tour'?: string
  /** Optional badge/icon next to the title (e.g., warning icon) */
  badge?: ReactNode
}

export function SettingsGroup({
  groupKey,
  icon,
  title,
  defaultExpanded = true,
  children,
  'data-tour': dataTour,
  badge,
}: SettingsGroupProps) {
  const detailsId = useId()

  const { expandedMap, setExpanded } = useSettingsStore(
    useShallow((state) => ({
      expandedMap: state.settingsGroupExpanded,
      setExpanded: state.setSettingsGroupExpanded,
    }))
  )

  const isExpanded = expandedMap?.[groupKey] ?? defaultExpanded

  const handleToggle = useCallback(() => {
    setExpanded?.(groupKey, !isExpanded)
  }, [groupKey, isExpanded, setExpanded])

  return (
    <Card data-tour={dataTour}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        className="w-full text-left px-4 py-3 flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset rounded-xl"
      >
        {icon}
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark flex-1">
          {title}
        </h2>
        {badge}
        <ExpandArrow isExpanded={isExpanded} className="shrink-0" />
      </button>

      <div
        id={detailsId}
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 space-y-6">{children}</div>
        </div>
      </div>
    </Card>
  )
}
