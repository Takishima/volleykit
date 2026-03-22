/**
 * Test setup: Register minimal auth actions stubs for tests.
 *
 * This imports from auth-actions-registry (NOT auth.ts) to avoid loading
 * the auth store's dependencies (@/api/session, etc.) which would poison
 * the module cache and prevent vi.mock() from working in test files
 * that mock those modules.
 */

import { registerAuthActions } from '@/common/stores/auth-actions-registry'

registerAuthActions({
  performLogin: async () => false,
  performLogout: async () => {},
  performSessionCheck: async () => true,
  performCalendarLogin: async () => {},
  filterRefereeOccupations: (occs) => occs.filter((o: { type: string }) => o.type === 'referee'),
  hasMultipleAssociations: () => false,
  sessionCheckGracePeriodMs: 5_000,
})
