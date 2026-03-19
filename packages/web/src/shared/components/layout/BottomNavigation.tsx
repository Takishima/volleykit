import { NavLink, useLocation } from 'react-router-dom'

import { useTranslation } from '@/shared/hooks/useTranslation'
import { useTourStore } from '@/shared/stores/tour'

import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  path: string
  labelKey: 'nav.assignments' | 'nav.compensations' | 'nav.exchange' | 'nav.settings'
  icon: LucideIcon
  testId: string
}

interface BottomNavigationProps {
  navItems: NavItem[]
}

export function BottomNavigation({ navItems }: BottomNavigationProps) {
  const location = useLocation()
  const { t } = useTranslation()
  const activeTour = useTourStore((state) => state.activeTour)

  return (
    <nav className="bg-surface-card dark:bg-surface-card-dark border-t border-border-default dark:border-border-default-dark fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            const isDisabled = activeTour !== null && !isActive
            return (
              <NavLink
                key={item.path}
                to={item.path}
                data-testid={item.testId}
                onClick={(e) => {
                  if (isDisabled) {
                    e.preventDefault()
                  }
                }}
                className={`
                    flex flex-col items-center py-2 px-4 text-[10px] font-medium
                    transition-all duration-150 rounded-lg mx-1
                    ${
                      isActive
                        ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30'
                        : isDisabled
                          ? 'text-text-muted/50 dark:text-text-muted-dark/50 cursor-not-allowed'
                          : 'text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark'
                    }
                  `}
                aria-disabled={isDisabled}
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`}
                  aria-hidden="true"
                />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
