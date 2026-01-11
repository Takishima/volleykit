import { Badge } from '@/shared/components/Badge'
import { useTranslation } from '@/shared/hooks/useTranslation'

import { useAssignmentCardContext } from './context'

/** Displays assignment status badge in details view */
export function Status() {
  const { t } = useTranslation()
  const { status } = useAssignmentCardContext()

  const statusConfig: Record<string, { label: string; variant: 'success' | 'danger' | 'neutral' }> =
    {
      active: { label: t('assignments.confirmed'), variant: 'success' },
      cancelled: { label: t('assignments.cancelled'), variant: 'danger' },
      archived: { label: t('assignments.archived'), variant: 'neutral' },
    }

  return (
    <div className="flex items-center gap-2 text-sm pt-1">
      <Badge variant={statusConfig[status]?.variant || 'success'} className="rounded-full">
        {statusConfig[status]?.label || t('assignments.active')}
      </Badge>
    </div>
  )
}
