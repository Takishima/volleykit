import type { RefereeAbsence } from '@/api/client'
import { MS_PER_DAY } from '@/common/utils/constants'

/**
 * An absence the referee cannot edit: association-imposed blockings (e.g.
 * national-squad duty dates) come back with all object permissions false.
 * Entries without permission data are treated as editable-unknown, not locked.
 */
export function isAbsenceReadOnly(absence: RefereeAbsence): boolean {
  const objectPermissions = absence._permissions?.object
  if (!objectPermissions) {
    return false
  }
  return objectPermissions.update !== true && objectPermissions.delete !== true
}

export interface GroupedAbsences {
  /** Absences that have not ended yet, soonest first */
  upcoming: RefereeAbsence[]
  /** Absences that have fully ended, most recent first */
  past: RefereeAbsence[]
}

// Ordering goes through Date rather than string comparison so any RFC3339
// offset is handled (captured payloads are all +00:00; only the wall-clock
// anchor shifts across DST, but Date comparison stays correct either way).
// The schema requires fromDate/toDate; the ?? fallbacks only satisfy the
// generated types, and a missing date yields NaN, which every comparison
// treats as "not past".
function compareByFromDate(a: RefereeAbsence, b: RefereeAbsence): number {
  return new Date(a.fromDate ?? '').getTime() - new Date(b.fromDate ?? '').getTime()
}

/**
 * Whether an absence covers a single day. Duration-based instead of a
 * calendar-day comparison: the API anchors full Swiss local days (e.g.
 * 05:00Z-22:59Z), so a device in a different timezone could see the two
 * instants on different local days even for a one-day absence.
 */
export function isSingleDayAbsence(from: Date, to: Date): boolean {
  return to.getTime() - from.getTime() < MS_PER_DAY
}

/**
 * Splits absences into upcoming (still running or in the future) and past.
 */
export function groupAbsences(absences: RefereeAbsence[], now: Date): GroupedAbsences {
  const upcoming: RefereeAbsence[] = []
  const past: RefereeAbsence[] = []

  for (const absence of absences) {
    if (new Date(absence.toDate ?? '').getTime() < now.getTime()) {
      past.push(absence)
    } else {
      upcoming.push(absence)
    }
  }

  upcoming.sort(compareByFromDate)
  past.sort((a, b) => compareByFromDate(b, a))

  return { upcoming, past }
}
