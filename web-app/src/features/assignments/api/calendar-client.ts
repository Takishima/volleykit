/**
 * Calendar API client for Calendar Mode.
 *
 * This module implements the same API interface as the real API client,
 * but uses the iCal calendar feed instead of authenticated API calls.
 * Calendar mode provides read-only access to assignments.
 *
 * Features supported in calendar mode:
 * - searchAssignments: Returns assignments from the iCal feed
 * - getAssociationSettings: Returns mock settings (for UI compatibility)
 * - getActiveSeason: Returns mock season (for UI compatibility)
 *
 * Features NOT supported in calendar mode (will throw errors):
 * - Compensations (searchCompensations, getCompensationDetails, updateCompensation)
 * - Exchanges (searchExchanges, applyForExchange, withdrawFromExchange)
 * - Nominations (getPossiblePlayerNominations, updateNominationList, finalizeNominationList)
 * - Scoresheet operations (getGameWithScoresheet, submitScorer, finalizeScoresheet, uploadResource)
 * - Person search (searchPersons)
 * - Role switching (switchRoleAndAttribute)
 */

// Calendar mode settings constants
/** Default hours after game start when referees can edit game list */
export const DEFAULT_REFEREE_EDIT_HOURS = 6

// Volleyball season date constants (0-indexed months)
/** September - month when volleyball season starts */
const SEASON_START_MONTH = 8
/** June - month when volleyball season ends */
const SEASON_END_MONTH = 5
/** Day of month when season starts (September 1st) */
const SEASON_START_DAY = 1
/** Day of month when season ends (June 30th) */
const SEASON_END_DAY = 30

import type {
  SearchConfiguration,
  Assignment,
  AssignmentsResponse,
  CompensationsResponse,
  ConvocationCompensationDetailed,
  ExchangesResponse,
  AssociationSettings,
  Season,
  NominationList,
  NominationListFinalizeResponse,
  Scoresheet,
  FileResource,
  GameDetails,
  PossibleNominationsResponse,
  PersonSearchResponse,
  RefereeBackupSearchResponse,
  PickExchangeResponse,
} from '@/api/client'
import type { components } from '@/api/schema'
import { useAuthStore } from '@/shared/stores/auth'

import { fetchCalendarAssignments, type CalendarAssignment } from './calendar-api'

/**
 * Error thrown when an operation is not supported in calendar mode.
 */
export class CalendarModeNotSupportedError extends Error {
  constructor(operation: string) {
    super(
      `${operation} is not available in Calendar Mode. Please log in with your VolleyManager credentials to access this feature.`
    )
    this.name = 'CalendarModeNotSupportedError'
  }
}

type RefereePosition = components['schemas']['RefereePosition']
type RefereeRole = CalendarAssignment['role']

/**
 * Maps iCal referee role to API RefereePosition enum value.
 */
function mapRoleToPosition(role: RefereeRole): RefereePosition {
  const roleMap: Record<RefereeRole, RefereePosition> = {
    referee1: 'head-one',
    referee2: 'head-two',
    lineReferee: 'linesman-one',
    scorer: 'head-one', // Scorer doesn't have a dedicated position, use head-one as fallback
    unknown: 'head-one',
  }
  return roleMap[role]
}

/**
 * Converts a CalendarAssignment to the Assignment format used by the app.
 * This mapping preserves as much information as possible from the iCal data.
 */
function calendarAssignmentToAssignment(calendarAssignment: CalendarAssignment): Assignment {
  // Map gender to team gender format
  const genderMap: Record<string, 'm' | 'f' | undefined> = {
    men: 'm',
    women: 'f',
    mixed: undefined,
    unknown: undefined,
  }

  const teamGender = genderMap[calendarAssignment.gender]

  return {
    // Use gameId as the assignment identity (since we don't have a real convocation ID)
    __identity: `calendar-${calendarAssignment.gameId}`,
    refereeConvocationStatus: 'active',
    refereePosition: mapRoleToPosition(calendarAssignment.role),
    refereeGame: {
      __identity: `calendar-game-${calendarAssignment.gameId}`,
      game: {
        __identity: calendarAssignment.gameId,
        number: parseInt(calendarAssignment.gameId, 10) || undefined,
        startingDateTime: calendarAssignment.startTime,
        encounter: {
          teamHome: {
            name: calendarAssignment.homeTeam,
            displayName: calendarAssignment.homeTeam,
            gender: teamGender,
          },
          teamAway: {
            name: calendarAssignment.awayTeam,
            displayName: calendarAssignment.awayTeam,
            gender: teamGender,
          },
        },
        group: {
          displayName: calendarAssignment.league,
        },
        hall: calendarAssignment.hallName
          ? {
              name: calendarAssignment.hallName,
              primaryPostalAddress: calendarAssignment.address
                ? {
                    combinedAddress: calendarAssignment.address,
                    geographicalLocation: calendarAssignment.coordinates
                      ? {
                          latitude: calendarAssignment.coordinates.latitude,
                          longitude: calendarAssignment.coordinates.longitude,
                        }
                      : undefined,
                  }
                : undefined,
            }
          : undefined,
      },
      // Determine if game is in future based on start time
      isGameInFuture: new Date(calendarAssignment.startTime) > new Date() ? '1' : '0',
    },
  }
}

/**
 * Calendar API client implementation.
 * Implements the same interface as the regular API client but uses iCal data.
 */
export const calendarApi = {
  async searchAssignments(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required for API interface compatibility
    _config: SearchConfiguration = {}
  ): Promise<AssignmentsResponse> {
    // Get calendar code from auth store
    const calendarCode = useAuthStore.getState().calendarCode

    if (!calendarCode) {
      return { items: [], totalItemsCount: 0 }
    }

    // Fetch assignments from iCal feed
    const calendarAssignments = await fetchCalendarAssignments(calendarCode)

    // Convert to Assignment format
    const assignments = calendarAssignments.map(calendarAssignmentToAssignment)

    // Note: We ignore the search configuration filters since iCal doesn't support them
    // The hook-level filtering will handle date range filtering client-side

    return {
      items: assignments,
      totalItemsCount: assignments.length,
    }
  },

  async getAssignmentDetails(
    convocationId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required for API interface compatibility
    _properties: string[]
  ): Promise<Assignment> {
    // Get calendar code from auth store
    const calendarCode = useAuthStore.getState().calendarCode

    if (!calendarCode) {
      throw new Error('Calendar code not available')
    }

    // Fetch all assignments and find the one matching the ID
    const calendarAssignments = await fetchCalendarAssignments(calendarCode)

    // Extract the gameId from the convocation ID (format: "calendar-{gameId}")
    const gameId = convocationId.replace(/^calendar-/, '')

    const calendarAssignment = calendarAssignments.find((a) => a.gameId === gameId)

    if (!calendarAssignment) {
      throw new Error(`Assignment not found: ${convocationId}`)
    }

    return calendarAssignmentToAssignment(calendarAssignment)
  },

  // Compensations - not supported in calendar mode
  async searchCompensations(): Promise<CompensationsResponse> {
    throw new CalendarModeNotSupportedError('Compensations')
  },

  async getCompensationDetails(): Promise<ConvocationCompensationDetailed> {
    throw new CalendarModeNotSupportedError('Compensation details')
  },

  async updateCompensation(): Promise<void> {
    throw new CalendarModeNotSupportedError('Compensation updates')
  },

  // Exchanges - not supported in calendar mode
  async searchExchanges(): Promise<ExchangesResponse> {
    throw new CalendarModeNotSupportedError('Exchanges')
  },

  async applyForExchange(): Promise<PickExchangeResponse> {
    throw new CalendarModeNotSupportedError('Exchange applications')
  },

  async withdrawFromExchange(): Promise<void> {
    throw new CalendarModeNotSupportedError('Exchange withdrawals')
  },

  // Settings - return mock data for UI compatibility
  async getAssociationSettings(): Promise<AssociationSettings> {
    // Return sensible defaults for calendar mode
    return {
      hoursAfterGameStartForRefereeToEditGameList: DEFAULT_REFEREE_EDIT_HOURS,
    } as AssociationSettings
  },

  async getActiveSeason(): Promise<Season> {
    // Return a season spanning the current volleyball year
    // Season typically runs September to June
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    // If we're before September, we're in the previous season
    const seasonStartYear = currentMonth < SEASON_START_MONTH ? currentYear - 1 : currentYear

    const seasonStart = new Date(seasonStartYear, SEASON_START_MONTH, SEASON_START_DAY)
    const seasonEnd = new Date(seasonStartYear + 1, SEASON_END_MONTH, SEASON_END_DAY)

    return {
      seasonStartDate: seasonStart.toISOString(),
      seasonEndDate: seasonEnd.toISOString(),
    } as Season
  },

  // Nominations - not supported in calendar mode
  async getPossiblePlayerNominations(): Promise<PossibleNominationsResponse> {
    throw new CalendarModeNotSupportedError('Player nominations')
  },

  async searchPersons(): Promise<PersonSearchResponse> {
    throw new CalendarModeNotSupportedError('Person search')
  },

  async getGameWithScoresheet(): Promise<GameDetails> {
    throw new CalendarModeNotSupportedError('Scoresheet access')
  },

  async updateNominationList(): Promise<NominationList> {
    throw new CalendarModeNotSupportedError('Nomination list updates')
  },

  async finalizeNominationList(): Promise<NominationListFinalizeResponse> {
    throw new CalendarModeNotSupportedError('Nomination list finalization')
  },

  async submitScorer(): Promise<Scoresheet> {
    throw new CalendarModeNotSupportedError('Scorer submission')
  },

  async updateScoresheet(): Promise<Scoresheet> {
    throw new CalendarModeNotSupportedError('Scoresheet updates')
  },

  async finalizeScoresheet(): Promise<Scoresheet> {
    throw new CalendarModeNotSupportedError('Scoresheet finalization')
  },

  async uploadResource(): Promise<FileResource[]> {
    throw new CalendarModeNotSupportedError('File uploads')
  },

  async switchRoleAndAttribute(): Promise<void> {
    throw new CalendarModeNotSupportedError('Role switching')
  },

  async searchRefereeBackups(): Promise<RefereeBackupSearchResponse> {
    throw new CalendarModeNotSupportedError('Referee backups')
  },
}
