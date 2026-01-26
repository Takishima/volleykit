/* eslint-disable import-x/order -- Imports are split to manage circular dependencies */
import type { components } from './schema'

import {
  assignmentsResponseSchema,
  compensationsResponseSchema,
  exchangesResponseSchema,
  refereeBackupResponseSchema,
  validateResponse,
} from './validation'
import { mockApi } from './mock-api'

import { calendarApi } from '@/features/assignments/api/calendar-client'

import {
  buildFormData,
  setCsrfToken as setToken,
  clearCsrfToken,
  getCsrfToken,
  setSessionToken,
  getSessionToken,
  clearSessionToken,
} from './form-serialization'

// Base URL configuration - uses proxy URL if set, otherwise empty string for relative URLs
const API_BASE = import.meta.env.VITE_API_PROXY_URL || ''

if (!import.meta.env.DEV && !API_BASE) {
  console.warn('VITE_API_PROXY_URL is not configured for production. API calls will fail.')
}

// Re-export schema types
export type Schemas = components['schemas']
export type Assignment = Schemas['Assignment']
export type CompensationRecord = Schemas['CompensationRecord']
export type ConvocationCompensationDetailed = Schemas['ConvocationCompensationDetailed']
export type GameExchange = Schemas['GameExchange']
export type RefereeGame = Schemas['RefereeGame']
export type AssociationSettings = Schemas['AssociationSettings']
export type Season = Schemas['Season']
export type AssignmentsResponse = Schemas['AssignmentsResponse']
export type CompensationsResponse = Schemas['CompensationsResponse']
export type ExchangesResponse = Schemas['ExchangesResponse']
export type NominationList = Schemas['NominationList']
export type IndoorPlayerNomination = Schemas['IndoorPlayerNomination']
export type PossibleNomination = Schemas['PossibleNomination']
export type PossibleNominationsResponse = Schemas['PossibleNominationsResponse']
export type NominationListFinalizeResponse = Schemas['NominationListFinalizeResponse']
export type Scoresheet = Schemas['Scoresheet']
export type FileResource = Schemas['FileResource']
export type GameDetails = Schemas['GameDetails']
export type PersonSearchResult = Schemas['PersonSearchResult']
export type PersonSearchResponse = Schemas['PersonSearchResponse']
export type RefereeBackupEntry = Schemas['RefereeBackupEntry']
export type RefereeBackupSearchResponse = Schemas['RefereeBackupSearchResponse']
export type BackupRefereeAssignment = Schemas['BackupRefereeAssignment']
export type PickExchangeResponse = Schemas['PickExchangeResponse']

export interface PersonSearchFilter {
  firstName?: string
  lastName?: string
  yearOfBirth?: string
}

export interface SearchConfiguration {
  offset?: number
  limit?: number
  propertyFilters?: PropertyFilter[]
  propertyOrderings?: PropertyOrdering[]
}

export interface PropertyFilter {
  propertyName: string
  values?: string[]
  enumValues?: string[]
  dateRange?: { from: string; to: string }
}

export interface PropertyOrdering {
  propertyName: string
  descending: boolean
  isSetByUser?: boolean
}

// CSRF token management - re-export for external use
export function setCsrfToken(token: string | null) {
  setToken(token)
}

/**
 * Session token header name used by the Cloudflare Worker for iOS Safari PWA.
 * The worker sends session cookies via this header to bypass ITP cookie blocking.
 */
const SESSION_TOKEN_HEADER = 'X-Session-Token'

/**
 * Header to request session token capture from redirect responses.
 * When this header is present, the worker converts redirect responses with session tokens
 * to JSON, allowing the client to capture tokens from redirects (which would otherwise
 * be opaque due to redirect: 'manual').
 */
export const CAPTURE_SESSION_TOKEN_HEADER = 'X-Capture-Session-Token'

/**
 * Capture session token from response headers.
 * The Cloudflare Worker sends session cookies as X-Session-Token header
 * to bypass iOS Safari ITP blocking third-party cookies in PWA mode.
 */
export function captureSessionToken(response: Response): void {
  const token = response.headers.get(SESSION_TOKEN_HEADER)
  if (token) {
    setSessionToken(token)
  }
}

/**
 * Get headers for sending session token with requests.
 * Returns the X-Session-Token header if a token is stored.
 */
export function getSessionHeaders(): Record<string, string> {
  const token = getSessionToken()
  return token ? { [SESSION_TOKEN_HEADER]: token } : {}
}

// Re-export getSessionToken for use in login flow
export { getSessionToken }

export function clearSession() {
  clearCsrfToken()
  clearSessionToken()
}

// Generic fetch wrapper
async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>
): Promise<T> {
  let url = `${API_BASE}${endpoint}`

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...getSessionHeaders(),
  }

  if (method === 'GET' && body) {
    const params = buildFormData(body, { includeCsrfToken: false })
    url = `${url}?${params.toString()}`
  }

  if (method !== 'GET' && body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: method !== 'GET' && body ? buildFormData(body) : undefined,
  })

  // Capture session token from response headers (iOS Safari PWA)
  captureSessionToken(response)

  if (!response.ok) {
    if (
      response.status === HttpStatus.UNAUTHORIZED ||
      response.status === HttpStatus.FORBIDDEN ||
      response.status === HttpStatus.NOT_ACCEPTABLE
    ) {
      clearSession()
      throw new Error('Session expired. Please log in again.')
    }
    const errorMessage = await parseErrorResponse(response)
    throw new Error(`${method} ${endpoint}: ${errorMessage}`)
  }

  const contentType = response.headers.get('Content-Type') || ''

  // Try to parse JSON first, regardless of Content-Type header.
  // The VolleyManager API sometimes returns JSON with incorrect Content-Type: text/html header.
  try {
    return await response.json()
  } catch {
    // JSON parsing failed - now check if this looks like a stale session
    // Detect stale session: when the API returns HTML instead of JSON with status 200,
    // it means the session expired and the server is returning a login page.
    // This commonly happens with TYPO3 Neos/Flow backends that don't return proper 401.
    if (contentType.includes('text/html')) {
      // Check if pathname ends with "/login" to avoid false positives on paths
      // like "/api/v2/login-history" or "/user/login-preferences"
      const pathname = new URL(response.url).pathname.toLowerCase()
      const isLoginPage = pathname === '/login' || pathname.endsWith('/login')
      if (isLoginPage) {
        clearSession()
        throw new Error('Session expired. Please log in again.')
      }
    }

    throw new Error(
      `${method} ${endpoint}: Invalid JSON response (Content-Type: ${contentType || 'unknown'}, status: ${response.status})`
    )
  }
}

// API Methods
export const api = {
  // Assignments
  async searchAssignments(config: SearchConfiguration = {}): Promise<AssignmentsResponse> {
    const data = await apiRequest<unknown>(
      '/indoorvolleyball.refadmin/api%5crefereeconvocation/searchMyRefereeConvocations',
      'POST',
      {
        searchConfiguration: config,
        propertyRenderConfiguration: ASSIGNMENT_PROPERTIES,
      }
    )
    validateResponse(data, assignmentsResponseSchema, 'searchAssignments')
    return data as AssignmentsResponse
  },

  async getAssignmentDetails(convocationId: string, properties: string[]): Promise<Assignment> {
    const query = new URLSearchParams()
    query.set('convocation', convocationId)
    properties.forEach((prop, i) => query.set(`nestedPropertyNames[${i}]`, prop))

    return apiRequest<Assignment>(
      `/indoorvolleyball.refadmin/api%5crefereeconvocation/showWithNestedObjects?${query}`
    )
  },

  // Compensations
  async searchCompensations(config: SearchConfiguration = {}): Promise<CompensationsResponse> {
    const data = await apiRequest<unknown>(
      '/indoorvolleyball.refadmin/api%5crefereeconvocationcompensation/search',
      'POST',
      {
        searchConfiguration: config,
        propertyRenderConfiguration: COMPENSATION_PROPERTIES,
      }
    )
    validateResponse(data, compensationsResponseSchema, 'searchCompensations')
    return data as CompensationsResponse
  },

  async getCompensationDetails(compensationId: string): Promise<ConvocationCompensationDetailed> {
    const query = new URLSearchParams()
    query.set('convocationCompensation[__identity]', compensationId)
    query.append('propertyRenderConfiguration[]', 'correctionReason')
    query.append('propertyRenderConfiguration[]', 'distanceInMetres')
    query.append('propertyRenderConfiguration[]', 'distanceFormatted')
    query.append('propertyRenderConfiguration[]', 'hasFlexibleTravelExpenses')

    return apiRequest<ConvocationCompensationDetailed>(
      `/indoorvolleyball.refadmin/api%5cconvocationcompensation/showWithNestedObjects?${query}`
    )
  },

  async updateCompensation(
    compensationId: string,
    data: { distanceInMetres?: number; correctionReason?: string }
  ): Promise<void> {
    // The __identity must be nested inside convocationCompensation, not at root level
    const convocationCompensation: Record<string, unknown> = {
      __identity: compensationId,
    }

    if (data.distanceInMetres !== undefined) {
      convocationCompensation.distanceInMetres = data.distanceInMetres
    }

    if (data.correctionReason !== undefined) {
      convocationCompensation.correctionReason = data.correctionReason
    }

    return apiRequest('/indoorvolleyball.refadmin/api%5cconvocationcompensation', 'PUT', {
      convocationCompensation,
    })
  },

  // Game Exchanges
  async searchExchanges(config: SearchConfiguration = {}): Promise<ExchangesResponse> {
    const data = await apiRequest<unknown>(
      '/indoorvolleyball.refadmin/api%5crefereegameexchange/search',
      'POST',
      {
        searchConfiguration: config,
        propertyRenderConfiguration: EXCHANGE_PROPERTIES,
      }
    )
    validateResponse(data, exchangesResponseSchema, 'searchExchanges')
    return data as ExchangesResponse
  },

  async applyForExchange(exchangeId: string): Promise<PickExchangeResponse> {
    return apiRequest<PickExchangeResponse>(
      '/indoorvolleyball.refadmin/api%5crefereegameexchange/pickFromRefereeGameExchange',
      'PUT',
      {
        'refereeGameExchange[__identity]': exchangeId,
      }
    )
  },

  async withdrawFromExchange(exchangeId: string): Promise<void> {
    return apiRequest('/indoorvolleyball.refadmin/api%5crefereegameexchange', 'PUT', {
      __identity: exchangeId,
      withdrawApplication: '1',
    })
  },

  /**
   * Add an assignment to the exchange marketplace (bourse aux arbitrages).
   * This puts your own assignment on the exchange so another referee can take it over.
   *
   * @param convocationId - The UUID of the referee convocation (assignment) to add to exchange
   * @returns Promise that resolves when the assignment is added to the exchange
   */
  async addToExchange(convocationId: string): Promise<void> {
    return apiRequest(
      '/indoorvolleyball.refadmin/api%5crefereeconvocation/putRefereeConvocationIntoRefereeGameExchange',
      'POST',
      {
        refereeConvocation: convocationId,
      }
    )
  },

  // Settings
  async getAssociationSettings(): Promise<Schemas['AssociationSettings']> {
    return apiRequest(
      '/indoorvolleyball.refadmin/api%5crefereeassociationsettings/getRefereeAssociationSettingsOfActiveParty'
    )
  },

  async getActiveSeason(): Promise<Schemas['Season']> {
    return apiRequest('/sportmanager.indoorvolleyball/api%5cindoorseason/getActiveIndoorSeason')
  },

  // Nominations
  async getPossiblePlayerNominations(
    nominationListId: string,
    options?: { onlyFromMyTeam?: boolean; onlyRelevantGender?: boolean }
  ): Promise<PossibleNominationsResponse> {
    return apiRequest(
      '/sportmanager.indoorvolleyball/api%5cnominationlist/getPossibleIndoorPlayerNominationsForNominationList',
      'POST',
      {
        nominationList: nominationListId,
        onlyFromMyTeam: options?.onlyFromMyTeam ?? true,
        onlyRelevantGender: options?.onlyRelevantGender ?? true,
      }
    )
  },

  // Person search
  async searchPersons(
    filters: PersonSearchFilter,
    options?: { offset?: number; limit?: number }
  ): Promise<PersonSearchResponse> {
    const propertyFilters: Array<{ propertyName: string; text: string }> = []

    const { firstName, lastName, yearOfBirth } = filters

    if (firstName && !lastName) {
      propertyFilters.push(
        { propertyName: 'firstName', text: firstName },
        { propertyName: 'lastName', text: firstName }
      )
    } else if (lastName && !firstName) {
      propertyFilters.push(
        { propertyName: 'firstName', text: lastName },
        { propertyName: 'lastName', text: lastName }
      )
    } else {
      if (firstName) {
        propertyFilters.push({ propertyName: 'firstName', text: firstName })
      }
      if (lastName) {
        propertyFilters.push({ propertyName: 'lastName', text: lastName })
      }
    }

    if (yearOfBirth) {
      propertyFilters.push({
        propertyName: 'yearOfBirth',
        text: yearOfBirth,
      })
    }

    const searchConfig: Record<string, unknown> = {
      propertyFilters,
      offset: options?.offset ?? 0,
      limit: options?.limit ?? DEFAULT_SEARCH_RESULTS_LIMIT,
    }

    return apiRequest<PersonSearchResponse>(
      '/sportmanager.core/api%5celasticsearchperson/search',
      'GET',
      {
        searchConfiguration: searchConfig,
        propertyRenderConfiguration: [
          'displayName',
          'firstName',
          'lastName',
          'associationId',
          'birthday',
          'gender',
        ],
      }
    )
  },

  // Game details and scoresheet
  async getGameWithScoresheet(gameId: string): Promise<Schemas['GameDetails']> {
    const properties = [
      // Scoresheet properties
      'scoresheet',
      'scoresheet.__identity',
      'scoresheet.game.__identity',
      'scoresheet.isSimpleScoresheet',
      'scoresheet.writerPerson',
      'scoresheet.writerPerson.displayName',
      'scoresheet.writerPerson.birthday',
      'scoresheet.file',
      'scoresheet.hasFile',
      'scoresheet.closedAt',
      'scoresheet.scoresheetValidation',
      // Home team nomination list with full player details
      'nominationListOfTeamHome',
      'nominationListOfTeamHome.__identity',
      'nominationListOfTeamHome.game.__identity',
      'nominationListOfTeamHome.team',
      'nominationListOfTeamHome.closed',
      'nominationListOfTeamHome.closedAt',
      'nominationListOfTeamHome.checked',
      'nominationListOfTeamHome.isClosedForTeam',
      'nominationListOfTeamHome.nominationListValidation',
      'nominationListOfTeamHome.indoorPlayerNominations',
      'nominationListOfTeamHome.indoorPlayerNominations.*.__identity',
      // Request base indoorPlayer and person before nested properties (similar to group pattern)
      'nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayer',
      'nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayer.person',
      'nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayer.person.displayName',
      'nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayer.person.firstName',
      'nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayer.person.lastName',
      'nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayer.person.birthday',
      'nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayerLicenseCategory',
      'nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayerLicenseCategory.shortName',
      // Validation status for each player nomination
      'nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayerNominationValidation',
      'nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayerNominationValidation.indoorPlayerNominationValidationIssues',
      'nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayerNominationValidation.indoorPlayerNominationValidationIssues.*',
      'nominationListOfTeamHome.coachPerson',
      'nominationListOfTeamHome.firstAssistantCoachPerson',
      'nominationListOfTeamHome.secondAssistantCoachPerson',
      // Away team nomination list with full player details
      'nominationListOfTeamAway',
      'nominationListOfTeamAway.__identity',
      'nominationListOfTeamAway.game.__identity',
      'nominationListOfTeamAway.team',
      'nominationListOfTeamAway.closed',
      'nominationListOfTeamAway.closedAt',
      'nominationListOfTeamAway.checked',
      'nominationListOfTeamAway.isClosedForTeam',
      'nominationListOfTeamAway.nominationListValidation',
      'nominationListOfTeamAway.indoorPlayerNominations',
      'nominationListOfTeamAway.indoorPlayerNominations.*.__identity',
      // Request base indoorPlayer and person before nested properties (similar to group pattern)
      'nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayer',
      'nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayer.person',
      'nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayer.person.displayName',
      'nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayer.person.firstName',
      'nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayer.person.lastName',
      'nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayer.person.birthday',
      'nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayerLicenseCategory',
      'nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayerLicenseCategory.shortName',
      // Validation status for each player nomination
      'nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayerNominationValidation',
      'nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayerNominationValidation.indoorPlayerNominationValidationIssues',
      'nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayerNominationValidation.indoorPlayerNominationValidationIssues.*',
      'nominationListOfTeamAway.coachPerson',
      'nominationListOfTeamAway.firstAssistantCoachPerson',
      'nominationListOfTeamAway.secondAssistantCoachPerson',
      // Group must be requested before nested properties to avoid 500 errors
      // when group is null (e.g., for already validated games)
      'group',
      'group.phase.league.leagueCategory.writersCanUseSimpleScoresheetForThisLeagueCategory',
    ]

    const response = await apiRequest<{ game: Schemas['GameDetails'] }>(
      '/sportmanager.indoorvolleyball/api%5cgame/showWithNestedObjects',
      'GET',
      {
        'game[__identity]': gameId,
        propertyRenderConfiguration: properties,
      }
    )

    return response.game
  },

  async updateNominationList(
    nominationListId: string,
    gameId: string,
    teamId: string,
    playerNominationIds: string[],
    coachIds?: { head?: string; firstAssistant?: string; secondAssistant?: string }
  ): Promise<NominationList> {
    const body: Record<string, unknown> = {
      'nominationList[__identity]': nominationListId,
      'nominationList[game][__identity]': gameId,
      'nominationList[team][__identity]': teamId,
      'nominationList[closed]': 'false',
      'nominationList[isClosedForTeam]': 'true',
    }

    playerNominationIds.forEach((id, index) => {
      body[`nominationList[indoorPlayerNominations][${index}][__identity]`] = id
    })

    // Add coach assignments
    if (coachIds?.head) {
      body['nominationList[coachPerson][__identity]'] = coachIds.head
    }
    if (coachIds?.firstAssistant) {
      body['nominationList[firstAssistantCoachPerson][__identity]'] = coachIds.firstAssistant
    }
    // secondAssistantCoachPerson: use [__identity] with UUID, or plain field when clearing
    if (coachIds?.secondAssistant !== undefined) {
      if (coachIds.secondAssistant) {
        body['nominationList[secondAssistantCoachPerson][__identity]'] = coachIds.secondAssistant
      } else {
        body['nominationList[secondAssistantCoachPerson]'] = ''
      }
    }

    return apiRequest<NominationList>(
      '/sportmanager.indoorvolleyball/api%5cnominationlist',
      'PUT',
      body
    )
  },

  async finalizeNominationList(
    nominationListId: string,
    gameId: string,
    teamId: string,
    playerNominationIds: string[],
    validationId?: string,
    coachIds?: { head?: string; firstAssistant?: string; secondAssistant?: string }
  ): Promise<NominationListFinalizeResponse> {
    const body: Record<string, unknown> = {
      'nominationList[__identity]': nominationListId,
      'nominationList[game][__identity]': gameId,
      'nominationList[team][__identity]': teamId,
      'nominationList[closed]': 'false',
      'nominationList[isClosedForTeam]': 'true',
    }

    playerNominationIds.forEach((id, index) => {
      body[`nominationList[indoorPlayerNominations][${index}][__identity]`] = id
    })

    if (validationId) {
      body['nominationList[nominationListValidation][__identity]'] = validationId
    }

    // Add coach assignments
    if (coachIds?.head) {
      body['nominationList[coachPerson][__identity]'] = coachIds.head
    }
    if (coachIds?.firstAssistant) {
      body['nominationList[firstAssistantCoachPerson][__identity]'] = coachIds.firstAssistant
    }
    // secondAssistantCoachPerson: use [__identity] with UUID, or plain field when clearing
    if (coachIds?.secondAssistant !== undefined) {
      if (coachIds.secondAssistant) {
        body['nominationList[secondAssistantCoachPerson][__identity]'] = coachIds.secondAssistant
      } else {
        body['nominationList[secondAssistantCoachPerson]'] = ''
      }
    }

    return apiRequest<NominationListFinalizeResponse>(
      '/sportmanager.indoorvolleyball/api%5cnominationlist/finalize',
      'POST',
      body
    )
  },

  async updateScoresheet(
    scoresheetId: string,
    gameId: string,
    scorerPersonId: string,
    isSimpleScoresheet: boolean = false
  ): Promise<Scoresheet> {
    return apiRequest<Scoresheet>('/sportmanager.indoorvolleyball/api%5cscoresheet', 'PUT', {
      'scoresheet[__identity]': scoresheetId,
      'scoresheet[game][__identity]': gameId,
      'scoresheet[writerPerson][__identity]': scorerPersonId,
      'scoresheet[isSimpleScoresheet]': isSimpleScoresheet ? 'true' : 'false',
      'scoresheet[hasFile]': 'false',
    })
  },

  async finalizeScoresheet(
    scoresheetId: string,
    gameId: string,
    scorerPersonId: string,
    fileResourceId?: string,
    validationId?: string,
    isSimpleScoresheet: boolean = false
  ): Promise<Scoresheet> {
    const body: Record<string, unknown> = {
      'scoresheet[__identity]': scoresheetId,
      'scoresheet[game][__identity]': gameId,
      'scoresheet[writerPerson][__identity]': scorerPersonId,
      'scoresheet[hasFile]': fileResourceId ? 'true' : 'false',
      'scoresheet[isSimpleScoresheet]': isSimpleScoresheet ? 'true' : 'false',
    }

    if (fileResourceId) {
      body['scoresheet[file][__identity]'] = fileResourceId
    }

    if (validationId) {
      body['scoresheet[scoresheetValidation][__identity]'] = validationId
    }

    return apiRequest<Scoresheet>(
      '/sportmanager.indoorvolleyball/api%5cscoresheet/finalize',
      'POST',
      body
    )
  },

  async uploadResource(file: File): Promise<FileResource[]> {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(
        `Invalid file type: ${file.type || 'unknown'}. Only JPEG, PNG, or PDF files are allowed.`
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (BYTES_PER_KB * BYTES_PER_KB)).toFixed(1)
      throw new Error(`File too large: ${sizeMB} MB. Maximum size is 10 MB.`)
    }

    const formData = new FormData()
    formData.append('resource', file)
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      formData.append('__csrfToken', csrfToken)
    }

    const url = `${API_BASE}/sportmanager.resourcemanagement/api%5cpersistentresource/upload`

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: getSessionHeaders(),
      body: formData,
    })

    // Capture session token from response headers (iOS Safari PWA)
    captureSessionToken(response)

    if (!response.ok) {
      if (response.status === HttpStatus.UNAUTHORIZED || response.status === HttpStatus.FORBIDDEN) {
        clearSession()
        throw new Error('Session expired. Please log in again.')
      }
      const errorMessage = await parseErrorResponse(response)
      throw new Error(`POST ${url}: ${errorMessage}`)
    }

    return response.json()
  },

  /**
   * Switch the active role/association on the server.
   * This changes which association's data is returned by subsequent API calls.
   *
   * Note: This endpoint requires Content-Type: text/plain to match the real
   * volleymanager site (not application/x-www-form-urlencoded).
   *
   * @param attributeValueId - The __identity UUID of the AttributeValue (occupation) to switch to
   * @returns Promise that resolves when the switch is complete
   */
  async switchRoleAndAttribute(attributeValueId: string): Promise<void> {
    const csrfToken = getCsrfToken()
    const body = new URLSearchParams()
    body.append('attributeValueAsArray[0]', attributeValueId)
    if (csrfToken) {
      body.append('__csrfToken', csrfToken)
    }

    const response = await fetch(
      `${API_BASE}/sportmanager.security/api%5cparty/switchRoleAndAttribute`,
      {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          // The real site uses text/plain, not application/x-www-form-urlencoded
          'Content-Type': 'text/plain;charset=UTF-8',
          ...getSessionHeaders(),
        },
        credentials: 'include',
        body: body.toString(),
      }
    )

    // Capture session token from response headers (iOS Safari PWA)
    captureSessionToken(response)

    if (!response.ok) {
      // 406 indicates session expiry in TYPO3 Neos/Flow (same as apiRequest)
      if (
        response.status === HttpStatus.UNAUTHORIZED ||
        response.status === HttpStatus.FORBIDDEN ||
        response.status === HttpStatus.NOT_ACCEPTABLE
      ) {
        clearSession()
        throw new Error('Session expired. Please log in again.')
      }
      const errorMessage = await parseErrorResponse(response)
      throw new Error(`PUT switchRoleAndAttribute: ${errorMessage}`)
    }
  },

  // Referee Backup (Pikett)
  /**
   * Search referee backup (Pikett) assignments.
   * Returns on-call referees for NLA and NLB games within the specified date range.
   *
   * @param config - Search configuration with date filters
   * @returns Promise with referee backup entries
   */
  async searchRefereeBackups(
    config: SearchConfiguration = {}
  ): Promise<RefereeBackupSearchResponse> {
    const data = await apiRequest<unknown>(
      '/indoorvolleyball.refadmin/api%5crefereeconvocationrefereebackup/search',
      'POST',
      {
        searchConfiguration: {
          ...config,
          customFilters: [{ name: 'myReferees' }],
        },
        propertyRenderConfiguration: REFEREE_BACKUP_PROPERTIES,
      }
    )
    validateResponse(data, refereeBackupResponseSchema, 'searchRefereeBackups')
    return data as RefereeBackupSearchResponse
  },
}

export type ApiClient = typeof api

// Export the API client directly for use in auth store
// (auth store calls switchRoleAndAttribute after login to sync server state)
export { api as apiClient }

// Re-export DataSource from auth store for consumers that import from client
export type { DataSource } from '@/shared/stores/auth'

// Import for internal use
import type { DataSource } from '@/shared/stores/auth'
import { HttpStatus, BYTES_PER_KB } from '@/shared/utils/constants'

import { MAX_FILE_SIZE_BYTES, ALLOWED_FILE_TYPES, DEFAULT_SEARCH_RESULTS_LIMIT } from './constants'
import { parseErrorResponse } from './error-handling'
import {
  ASSIGNMENT_PROPERTIES,
  EXCHANGE_PROPERTIES,
  COMPENSATION_PROPERTIES,
  REFEREE_BACKUP_PROPERTIES,
} from '@volleykit/shared/api'

/**
 * Returns the appropriate API client based on the data source.
 *
 * @param dataSource - The data source to use. Accepts either:
 *   - DataSource string: 'api', 'demo', or 'calendar'
 *   - boolean (deprecated): true = demo mode, false = api mode
 *
 * @returns The API client for the specified data source
 */
export function getApiClient(dataSource: DataSource | boolean): ApiClient {
  // Handle legacy boolean parameter for backwards compatibility
  if (typeof dataSource === 'boolean') {
    return dataSource ? mockApi : api
  }

  switch (dataSource) {
    case 'demo':
      return mockApi
    case 'calendar':
      return calendarApi
    case 'api':
      return api
    default: {
      const _exhaustive: never = dataSource
      throw new Error(`Unknown data source: ${_exhaustive}`)
    }
  }
}
