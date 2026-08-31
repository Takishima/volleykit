import type { RefereeAbsence } from '@/api/client'

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

// The API varies the UTC offset it serializes with, so ordering goes through
// Date rather than string comparison. The schema requires fromDate/toDate;
// the ?? fallbacks only satisfy the generated types, and a missing date
// yields NaN, which every comparison treats as "not past".
function compareByFromDate(a: RefereeAbsence, b: RefereeAbsence): number {
  return new Date(a.fromDate ?? '').getTime() - new Date(b.fromDate ?? '').getTime()
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
