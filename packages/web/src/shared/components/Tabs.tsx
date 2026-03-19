import { Check, Circle } from '@/shared/components/icons'
import { useTabNavigation } from '@/shared/hooks/useTabNavigation'

/** Tab completion status for visual indicators */
export type TabStatus = 'complete' | 'incomplete' | 'optional'

export interface Tab {
  id: string
  label: string
  badge?: string
  /** Completion status for visual indicator */
  status?: TabStatus
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  ariaLabel: string
  /** Optional content to render at the end of the tab bar (e.g., filters, toggles) */
  endContent?: React.ReactNode
}

export function Tabs({ tabs, activeTab, onTabChange, ariaLabel, endContent }: TabsProps) {
  const { getTabProps } = useTabNavigation({
    tabs: tabs.map((tab) => tab.id),
    activeTab,
    onTabChange,
  })

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border-default dark:border-border-default-dark pb-2">
      <div className="overflow-x-auto scrollbar-hide" role="tablist" aria-label={ariaLabel}>
        <div className="flex gap-1 min-w-max">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id
            const tabProps = getTabProps(tab.id, index)
            return (
              <button
                key={tab.id}
                {...tabProps}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
                  dark:focus-visible:ring-offset-surface-card-dark
                  ${
                    isActive
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark hover:border-border-strong dark:hover:border-border-strong-dark'
                  }
                `}
              >
                {tab.status === 'complete' && (
                  <Check
                    className="w-4 h-4 mr-1.5 text-success-500 dark:text-success-400"
                    aria-hidden="true"
                  />
                )}
                {tab.status === 'incomplete' && (
                  <Circle
                    className="w-3 h-3 mr-1.5 text-warning-500 dark:text-warning-400 fill-current"
                    aria-hidden="true"
                  />
                )}
                {tab.label}
                {tab.badge && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-surface-subtle dark:bg-surface-subtle-dark text-text-secondary dark:text-text-muted-dark">
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      {endContent}
    </div>
  )
}

interface TabPanelProps {
  tabId: string
  activeTab: string
  children: React.ReactNode
}

export function TabPanel({ tabId, activeTab, children }: TabPanelProps) {
  const isActive = activeTab === tabId

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      hidden={!isActive}
    >
      {isActive && children}
    </div>
  )
}
