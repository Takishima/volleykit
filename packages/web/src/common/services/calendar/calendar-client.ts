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
 * - Exchanges (searchExchanges, applyForExchange, addToExchange, removeOwnExchange)
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
  ApiClient,
  SearchConfiguration,
  Assignment,
  AssignmentsResponse,
  CompensationsResponse,
  ConvocationCompensationDetailed,
  ExchangesResponse,
  AssociationSettings,
  Season,
  NominationList,
  NominationListResponse,
  Scoresheet,
  ScoresheetValidation,
  FileResource,
  GameDetails,
  PossibleNominationsResponse,
  PersonSearchResponse,
  RefereeBackupSearchResponse,
  PickExchangeResponse,
} from '@/api/client'
import type { components } from '@/api/schema'
import { useAuthStore } from '@/common/stores/auth'

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
  async searchAssignments(_config: SearchConfiguration = {}): Promise<AssignmentsResponse> {
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

  async getAssignmentDetails(convocationId: string, _properties: string[]): Promise<Assignment> {
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
  searchCompensations(): Promise<CompensationsResponse> {
    return Promise.reject(new CalendarModeNotSupportedError('Compensations'))
  },

  getCompensationDetails(): Promise<ConvocationCompensationDetailed> {
    return Promise.reject(new CalendarModeNotSupportedError('Compensation details'))
  },

  updateCompensation(): Promise<void> {
    return Promise.reject(new CalendarModeNotSupportedError('Compensation updates'))
  },

  // Exchanges - not supported in calendar mode
  searchExchanges(): Promise<ExchangesResponse> {
    return Promise.reject(new CalendarModeNotSupportedError('Exchanges'))
  },

  applyForExchange(): Promise<PickExchangeResponse> {
    return Promise.reject(new CalendarModeNotSupportedError('Exchange applications'))
  },

  addToExchange(): Promise<void> {
    return Promise.reject(new CalendarModeNotSupportedError('Adding to exchange'))
  },

  removeOwnExchange(): Promise<void> {
    return Promise.reject(new CalendarModeNotSupportedError('Removing own exchange'))
  },

  // Settings - return mock data for UI compatibility
  getAssociationSettings(): Promise<AssociationSettings> {
    // Return sensible defaults for calendar mode
    return Promise.resolve({
      hoursAfterGameStartForRefereeToEditGameList: DEFAULT_REFEREE_EDIT_HOURS,
    })
  },

  getActiveSeason(): Promise<Season> {
    // Return a season spanning the current volleyball year
    // Season typically runs September to June
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    // If we're before September, we're in the previous season
    const seasonStartYear = currentMonth < SEASON_START_MONTH ? currentYear - 1 : currentYear

    const seasonStart = new Date(seasonStartYear, SEASON_START_MONTH, SEASON_START_DAY)
    const seasonEnd = new Date(seasonStartYear + 1, SEASON_END_MONTH, SEASON_END_DAY)

    return Promise.resolve({
      seasonStartDate: seasonStart.toISOString(),
      seasonEndDate: seasonEnd.toISOString(),
    })
  },

  // Nominations - not supported in calendar mode
  getPossiblePlayerNominations(): Promise<PossibleNominationsResponse> {
    return Promise.reject(new CalendarModeNotSupportedError('Player nominations'))
  },

  searchPersons(): Promise<PersonSearchResponse> {
    return Promise.reject(new CalendarModeNotSupportedError('Person search'))
  },

  getGameWithScoresheet(): Promise<GameDetails> {
    return Promise.reject(new CalendarModeNotSupportedError('Scoresheet access'))
  },

  updateNominationList(): Promise<NominationList> {
    return Promise.reject(new CalendarModeNotSupportedError('Nomination list updates'))
  },

  finalizeNominationList(): Promise<NominationListResponse> {
    return Promise.reject(new CalendarModeNotSupportedError('Nomination list finalization'))
  },

  updateScoresheet(): Promise<Scoresheet> {
    return Promise.reject(new CalendarModeNotSupportedError('Scoresheet updates'))
  },

  validateScoresheet(): Promise<ScoresheetValidation> {
    return Promise.reject(new CalendarModeNotSupportedError('Scoresheet validation'))
  },

  finalizeScoresheet(): Promise<Scoresheet> {
    return Promise.reject(new CalendarModeNotSupportedError('Scoresheet finalization'))
  },

  uploadResource(): Promise<FileResource[]> {
    return Promise.reject(new CalendarModeNotSupportedError('File uploads'))
  },

  switchRoleAndAttribute(): Promise<void> {
    return Promise.reject(new CalendarModeNotSupportedError('Role switching'))
  },

  searchRefereeBackups(): Promise<RefereeBackupSearchResponse> {
    return Promise.reject(new CalendarModeNotSupportedError('Referee backups'))
  },
} satisfies ApiClient
