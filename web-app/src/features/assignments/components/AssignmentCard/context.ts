import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

import type { Assignment } from '@/api/client'
import type { AssignmentConflict } from '@/features/assignments/utils/conflict-detection'

/** Helper to extract referee display name from deep nested structure */
export function getRefereeDisplayName(
  convocation:
    | {
        indoorAssociationReferee?: {
          indoorReferee?: {
            person?: { displayName?: string }
          }
        }
      }
    | null
    | undefined
): string | undefined {
  return convocation?.indoorAssociationReferee?.indoorReferee?.person?.displayName
}

export interface AssignmentCardContextValue {
  /** The assignment data */
  assignment: Assignment
  /** The game from the assignment */
  game: Assignment['refereeGame']['game'] | undefined
  /** Formatted date label */
  dateLabel: string
  /** Formatted time label */
  timeLabel: string
  /** Whether the game is today */
  isToday: boolean
  /** Whether the game is in the past */
  isPast: boolean
  /** Home team name */
  homeTeam: string
  /** Away team name */
  awayTeam: string
  /** Hall name */
  hallName: string
  /** City name */
  city: string | undefined
  /** Full address for display */
  fullAddress: string | null
  /** Google Maps URL */
  googleMapsUrl: string | null
  /** Native maps app URL */
  addressMapsUrl: string | null
  /** Assignment status */
  status: string
  /** Position label */
  position: string
  /** Gender indicator ('m' | 'f' | undefined) */
  gender: string | undefined
  /** First head referee name */
  headReferee1: string | undefined
  /** Second head referee name */
  headReferee2: string | undefined
  /** Linesmen names array */
  linesmen: string[]
  /** Whether to show SBB button */
  showSbbButton: boolean
  /** Whether SBB connection is loading */
  isSbbLoading: boolean
  /** Function to open SBB connection */
  openSbbConnection: () => Promise<void>
  /** Single-ball hall match info */
  singleBallMatch: { isConditional: boolean } | null
  /** Path to single-ball halls PDF */
  singleBallPdfPath: string
  /** Pre-rendered expand arrow element */
  expandArrow: ReactNode | null
  /** Scheduling conflicts with other assignments */
  conflicts: AssignmentConflict[]
}

export const AssignmentCardContext = createContext<AssignmentCardContextValue | null>(null)

export function useAssignmentCardContext(): AssignmentCardContextValue {
  const context = useContext(AssignmentCardContext)
  if (!context) {
    throw new Error('useAssignmentCardContext must be used within an AssignmentCard')
  }
  return context
}
