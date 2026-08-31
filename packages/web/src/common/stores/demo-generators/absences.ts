/**
 * Demo absence generators for creating sample referee absence data.
 * Absences are per association, so each association code gets its own set,
 * including one read-only association-imposed blocking.
 */
/* eslint-disable @typescript-eslint/no-magic-numbers -- Demo data uses hardcoded day offsets */

import { addDays, subDays, startOfDay, endOfDay } from 'date-fns'

import type { RefereeAbsence } from '@/api/client'
import { generateDemoUuid } from '@/common/utils/demo-uuid'

import type { DemoAssociationCode } from './shared'

const EDITABLE_PERMISSIONS = {
  object: { delete: true, update: true, create: true },
}
const READ_ONLY_PERMISSIONS = {
  object: { delete: false, update: false, create: false },
}

/** Per-association day offset so switching associations shows different data. */
const ASSOCIATION_DAY_OFFSETS: Record<DemoAssociationCode, number> = {
  SV: 0,
  SVRBA: 2,
  SVRZ: 4,
}

export function generateAbsences(
  associationCode: DemoAssociationCode,
  now: Date
): RefereeAbsence[] {
  const offset = ASSOCIATION_DAY_OFFSETS[associationCode]

  // Ordered fromDate descending, matching the live endpoint's server-default
  // ordering, so demo mode feeds the page the same input shape as production.
  return [
    {
      __identity: generateDemoUuid(`demo-absence-vacation-${associationCode}`),
      fromDate: startOfDay(addDays(now, 14 + offset)).toISOString(),
      toDate: endOfDay(addDays(now, 21 + offset)).toISOString(),
      detailedReason: 'Vacation',
      _permissions: EDITABLE_PERMISSIONS,
    },
    {
      __identity: generateDemoUuid(`demo-absence-blocking-${associationCode}`),
      fromDate: startOfDay(addDays(now, 7 + offset)).toISOString(),
      toDate: endOfDay(addDays(now, 7 + offset)).toISOString(),
      detailedReason: 'National squad duty',
      _permissions: READ_ONLY_PERMISSIONS,
    },
    {
      __identity: generateDemoUuid(`demo-absence-past-${associationCode}`),
      fromDate: startOfDay(subDays(now, 10)).toISOString(),
      toDate: endOfDay(subDays(now, 9)).toISOString(),
      detailedReason: '',
      _permissions: EDITABLE_PERMISSIONS,
    },
  ]
}
