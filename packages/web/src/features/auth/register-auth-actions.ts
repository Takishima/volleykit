/**
 * Auth actions registration — wires feature-specific auth implementations
 * into the platform-agnostic auth store.
 *
 * This module bridges the gap between the auth store (common/stores/auth.ts)
 * and the auth feature implementations, using dependency inversion to avoid
 * the store importing from features/ directly.
 *
 * Must be called before the app renders (see main.tsx).
 */

import { registerAuthActions } from '@/common/stores/auth-actions-registry'
import { performCalendarLogin } from '@/features/auth/services/calendar-auth'
import { hasMultipleAssociations } from '@/features/auth/utils/active-party-parser'
import {
  performApiLogin,
  performApiLogout,
  performApiSessionCheck,
  SESSION_CHECK_GRACE_PERIOD_MS,
} from '@/features/auth/utils/api-auth-flow'
import { filterRefereeOccupations } from '@/features/auth/utils/parseOccupations'

registerAuthActions({
  performLogin: performApiLogin,
  performLogout: performApiLogout,
  performSessionCheck: performApiSessionCheck,
  performCalendarLogin,
  filterRefereeOccupations,
  hasMultipleAssociations,
  sessionCheckGracePeriodMs: SESSION_CHECK_GRACE_PERIOD_MS,
})
