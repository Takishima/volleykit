// Public API for compensations feature
export { CompensationsPage } from './CompensationsPage'

// Hooks
export {
  useCompensations,
  usePaidCompensations,
  useUnpaidCompensations,
  useUpdateCompensation,
  useUpdateAssignmentCompensation,
  useBatchUpdateCompensations,
  COMPENSATION_ERROR_KEYS,
  type CompensationErrorKey,
  type CompensationUpdateData,
  type BatchUpdateResult,
} from './hooks/useCompensations'
export { useCompensationActions } from './hooks/useCompensationActions'

// Components
export { CompensationCard } from './components/CompensationCard'
export { EditCompensationModal } from './components/EditCompensationModal'
export { TwintPaymentModal } from './components/TwintPaymentModal'

// Utils
export {
  isAssignmentCompensationEditable,
  isCompensationLocked,
  type ConvocationCompensationWithLockFlags,
  type DisbursementMethod,
} from './utils/compensation-helpers'

// Tour
export { compensationsTour } from './compensations'
