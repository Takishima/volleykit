import { format, isSameMonth, isSameYear } from 'date-fns'

import { useDateLocale } from '@/shared/hooks/useDateFormat'
import type { WeekInfo } from '@/shared/utils/date-helpers'

interface WeekSeparatorProps {
  week: WeekInfo
}

export function WeekSeparator({ week }: WeekSeparatorProps) {
  const locale = useDateLocale()
  const { weekStart, weekEnd } = week

  let dateRange: string
  if (isSameMonth(weekStart, weekEnd)) {
    dateRange = `${format(weekStart, 'MMM d', { locale })} – ${format(weekEnd, 'd', { locale })}`
  } else if (isSameYear(weekStart, weekEnd)) {
    dateRange = `${format(weekStart, 'MMM d', { locale })} – ${format(weekEnd, 'MMM d', { locale })}`
  } else {
    dateRange = `${format(weekStart, 'MMM d, yyyy', { locale })} – ${format(weekEnd, 'MMM d, yyyy', { locale })}`
  }

  return (
    <div className="col-span-full flex items-center gap-3 py-1.5">
      <div className="h-px flex-1 bg-border-default dark:bg-border-default-dark" />
      <span className="text-xs text-text-muted dark:text-text-muted-dark whitespace-nowrap">
        {dateRange}
      </span>
      <div className="h-px flex-1 bg-border-default dark:bg-border-default-dark" />
    </div>
  )
}
