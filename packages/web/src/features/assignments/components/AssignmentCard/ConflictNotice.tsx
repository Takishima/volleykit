import { ConflictDetails } from './ConflictWarning'
import { useAssignmentCardContext } from './context'

/**
 * Conflict notice for the expanded details view.
 * Uses the assignment card context to get conflicts and displays them.
 */
export function ConflictNotice() {
  const { conflicts } = useAssignmentCardContext()
  return <ConflictDetails conflicts={conflicts} />
}
