/**
 * Real API client implementation for the SwissVolley VolleyManager backend.
 *
 * This module contains the concrete HTTP fetch logic for communicating with
 * the production API via the Cloudflare Worker CORS proxy. It implements the
 * ApiClient interface defined by the `api` object's shape.
 *
 * Other data sources (demo, calendar) have their own implementations in
 * mock-api.ts and calendar-client.ts respectively.
 */
/* eslint-disable import-x/order -- Imports are grouped by concern */
import type { components } from './schema'

import {
  assignmentSchema,
  assignmentsResponseSchema,
  compensationsResponseSchema,
  exchangesResponseSchema,
  personSearchResponseSchema,
  compensationDetailedSchema,
  pickExchangeResponseSchema,
  fileResourceArraySchema,
  scoresheetValidationSchema,
  scoresheetSchema,
  nominationListSchema,
  nominationListResponseSchema,
  gameDetailsResponseSchema,
  associationSettingsSchema,
  seasonSchema,
  possibleNominationsResponseSchema,
  refereeBackupResponseSchema,
  validateResponse,
} from './validation'
import { scoreNameMatch } from './search-utils'

import { getCsrfToken } from './form-serialization'

import { BYTES_PER_KB } from '@/shared/utils/constants'
import { MAX_FILE_SIZE_BYTES, ALLOWED_FILE_TYPES, DEFAULT_SEARCH_RESULTS_LIMIT } from './constants'
import { apiRequest, apiRequestFormData, apiRequestVoid } from './transport'
import {
  ASSIGNMENT_PROPERTIES,
  EXCHANGE_PROPERTIES,
  COMPENSATION_PROPERTIES,
  REFEREE_BACKUP_PROPERTIES,
} from '@volleykit/shared/api'

import type { SearchConfiguration, PersonSearchFilter } from './client'

// Re-import schema types locally
type Schemas = components['schemas']
type AssignmentsResponse = Schemas['AssignmentsResponse']
type CompensationsResponse = Schemas['CompensationsResponse']
type ExchangesResponse = Schemas['ExchangesResponse']
type ConvocationCompensationDetailed = Schemas['ConvocationCompensationDetailed']
type Assignment = Schemas['Assignment']
type PickExchangeResponse = Schemas['PickExchangeResponse']
type PossibleNominationsResponse = Schemas['PossibleNominationsResponse']
type PersonSearchResponse = Schemas['PersonSearchResponse']
type PersonSearchResult = Schemas['PersonSearchResult']
type NominationList = Schemas['NominationList']
type NominationListResponse = Schemas['NominationListResponse']
type Scoresheet = Schemas['Scoresheet']
type ScoresheetValidation = Schemas['ScoresheetValidation']
type FileResource = Schemas['FileResource']
type RefereeBackupSearchResponse = Schemas['RefereeBackupSearchResponse']

/** Properties requested from the Elasticsearch person search endpoint */
const PERSON_SEARCH_PROPERTIES = [
  'displayName',
  'firstName',
  'lastName',
  'associationId',
  'birthday',
  'gender',
] as const

// API Methods — checked against the shared ApiClient interface for type safety
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
    return validateResponse(
      data,
      assignmentsResponseSchema,
      'searchAssignments'
    ) as AssignmentsResponse
  },

  async getAssignmentDetails(convocationId: string, properties: string[]): Promise<Assignment> {
    const query = new URLSearchParams()
    query.set('convocation', convocationId)
    properties.forEach((prop, i) => query.set(`nestedPropertyNames[${i}]`, prop))

    const data = await apiRequest<unknown>(
      `/indoorvolleyball.refadmin/api%5crefereeconvocation/showWithNestedObjects?${query}`
    )
    return validateResponse(data, assignmentSchema, 'getAssignmentDetails') as Assignment
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
    return validateResponse(
      data,
      compensationsResponseSchema,
      'searchCompensations'
    ) as CompensationsResponse
  },

  async getCompensationDetails(compensationId: string): Promise<ConvocationCompensationDetailed> {
    const query = new URLSearchParams()
    query.set('convocationCompensation[__identity]', compensationId)
    query.append('propertyRenderConfiguration[]', 'correctionReason')
    query.append('propertyRenderConfiguration[]', 'distanceInMetres')
    query.append('propertyRenderConfiguration[]', 'distanceFormatted')
    query.append('propertyRenderConfiguration[]', 'hasFlexibleTravelExpenses')

    const data = await apiRequest<unknown>(
      `/indoorvolleyball.refadmin/api%5cconvocationcompensation/showWithNestedObjects?${query}`
    )
    return validateResponse(
      data,
      compensationDetailedSchema,
      'getCompensationDetails'
    ) as ConvocationCompensationDetailed
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
    return validateResponse(data, exchangesResponseSchema, 'searchExchanges') as ExchangesResponse
  },

  async applyForExchange(exchangeId: string): Promise<PickExchangeResponse> {
    const data = await apiRequest<unknown>(
      '/indoorvolleyball.refadmin/api%5crefereegameexchange/pickFromRefereeGameExchange',
      'PUT',
      {
        'refereeGameExchange[__identity]': exchangeId,
      }
    )
    return validateResponse(
      data,
      pickExchangeResponseSchema,
      'applyForExchange'
    ) as PickExchangeResponse
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

  /**
   * Remove your own assignment from the exchange marketplace.
   * This withdraws your assignment from the bourse, making it no longer available for others.
   *
   * @param convocationId - The UUID of the referee convocation (assignment) to remove from exchange
   * @returns Promise that resolves when the assignment is removed from the exchange
   */
  async removeOwnExchange(convocationId: string): Promise<void> {
    return apiRequest(
      '/indoorvolleyball.refadmin/api%5crefereeconvocation/deleteFromRefereeGameExchange',
      'POST',
      {
        'refereeConvocations[0][__identity]': convocationId,
      }
    )
  },

  // Settings
  async getAssociationSettings(): Promise<Schemas['AssociationSettings']> {
    const data = await apiRequest<unknown>(
      '/indoorvolleyball.refadmin/api%5crefereeassociationsettings/getRefereeAssociationSettingsOfActiveParty'
    )
    return validateResponse(
      data,
      associationSettingsSchema,
      'getAssociationSettings'
    ) as Schemas['AssociationSettings']
  },

  async getActiveSeason(): Promise<Schemas['Season']> {
    const data = await apiRequest<unknown>(
      '/sportmanager.indoorvolleyball/api%5cindoorseason/getActiveIndoorSeason'
    )
    return validateResponse(data, seasonSchema, 'getActiveSeason') as Schemas['Season']
  },

  // Nominations
  async getPossiblePlayerNominations(
    nominationListId: string,
    options?: { onlyFromMyTeam?: boolean; onlyRelevantGender?: boolean }
  ): Promise<PossibleNominationsResponse> {
    const data = await apiRequest<unknown>(
      '/sportmanager.indoorvolleyball/api%5cnominationlist/getPossibleIndoorPlayerNominationsForNominationList',
      'POST',
      {
        nominationList: nominationListId,
        onlyFromMyTeam: options?.onlyFromMyTeam ?? true,
        onlyRelevantGender: options?.onlyRelevantGender ?? true,
      }
    )
    return validateResponse(
      data,
      possibleNominationsResponseSchema,
      'getPossiblePlayerNominations'
    ) as PossibleNominationsResponse
  },

  // Person search
  async searchPersons(
    filters: PersonSearchFilter,
    options?: { offset?: number; limit?: number }
  ): Promise<PersonSearchResponse> {
    const { firstName, lastName, yearOfBirth } = filters

    // When both firstName and lastName are provided, search both orderings
    // in parallel so "Bühler Renee" finds the same results as "Renee Bühler".
    if (firstName && lastName) {
      const makeRequest = async (fn: string, ln: string) => {
        const propertyFilters: Array<{ propertyName: string; text: string }> = [
          { propertyName: 'firstName', text: fn },
          { propertyName: 'lastName', text: ln },
        ]
        if (yearOfBirth) {
          propertyFilters.push({ propertyName: 'yearOfBirth', text: yearOfBirth })
        }
        const data = await apiRequest<unknown>(
          '/sportmanager.core/api%5celasticsearchperson/search',
          'GET',
          {
            searchConfiguration: {
              propertyFilters,
              offset: options?.offset ?? 0,
              limit: options?.limit ?? DEFAULT_SEARCH_RESULTS_LIMIT,
            },
            propertyRenderConfiguration: PERSON_SEARCH_PROPERTIES,
          }
        )
        return validateResponse(
          data,
          personSearchResponseSchema,
          'searchPersons'
        ) as PersonSearchResponse
      }

      const [original, swapped] = await Promise.all([
        makeRequest(firstName, lastName),
        makeRequest(lastName, firstName),
      ])

      // Merge and deduplicate results from both orderings, then re-rank so the
      // best name match appears first. Sorting happens before the limit cap so
      // that the best matches are never excluded by an arbitrary truncation point.
      const limit = options?.limit ?? DEFAULT_SEARCH_RESULTS_LIMIT
      const seen = new Set<string>()
      const merged: PersonSearchResult[] = []
      for (const item of [...(original.items ?? []), ...(swapped.items ?? [])]) {
        const id = item.__identity
        if (id && !seen.has(id)) {
          seen.add(id)
          merged.push(item)
        }
      }

      // Re-rank: score each result by how well its firstName/lastName match the
      // two search terms (trying both orderings), then sort best matches first.
      merged.sort((a, b) => {
        const scoreA = scoreNameMatch(a.firstName ?? '', a.lastName ?? '', firstName, lastName)
        const scoreB = scoreNameMatch(b.firstName ?? '', b.lastName ?? '', firstName, lastName)
        return scoreB - scoreA
      })

      const capped = merged.slice(0, limit)
      return { items: capped, totalItemsCount: capped.length }
    }

    // Single-term search: search both firstName and lastName fields
    const propertyFilters: Array<{ propertyName: string; text: string }> = []
    const singleTerm = firstName ?? lastName
    if (singleTerm) {
      propertyFilters.push(
        { propertyName: 'firstName', text: singleTerm },
        { propertyName: 'lastName', text: singleTerm }
      )
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

    const data = await apiRequest<unknown>(
      '/sportmanager.core/api%5celasticsearchperson/search',
      'GET',
      {
        searchConfiguration: searchConfig,
        propertyRenderConfiguration: PERSON_SEARCH_PROPERTIES,
      }
    )
    return validateResponse(
      data,
      personSearchResponseSchema,
      'searchPersons'
    ) as PersonSearchResponse
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
      'group.hasNoScoresheet',
      'group.phase.league.leagueCategory.writersCanUseSimpleScoresheetForThisLeagueCategory',
    ]

    const data = await apiRequest<unknown>(
      '/sportmanager.indoorvolleyball/api%5cgame/showWithNestedObjects',
      'GET',
      {
        'game[__identity]': gameId,
        propertyRenderConfiguration: properties,
      }
    )
    const validated = validateResponse(data, gameDetailsResponseSchema, 'getGameWithScoresheet')
    return (validated as { game: Schemas['GameDetails'] }).game
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

    const data = await apiRequest<unknown>(
      '/sportmanager.indoorvolleyball/api%5cnominationlist',
      'PUT',
      body,
      'text/plain;charset=UTF-8'
    )
    return validateResponse(data, nominationListSchema, 'updateNominationList') as NominationList
  },

  async finalizeNominationList(
    nominationListId: string,
    gameId: string,
    teamId: string,
    playerNominationIds: string[],
    validationId?: string,
    coachIds?: { head?: string; firstAssistant?: string; secondAssistant?: string }
  ): Promise<NominationListResponse> {
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

    const data = await apiRequest<unknown>(
      '/sportmanager.indoorvolleyball/api%5cnominationlist/finalize',
      'POST',
      body,
      'text/plain;charset=UTF-8'
    )
    return validateResponse(
      data,
      nominationListResponseSchema,
      'finalizeNominationList'
    ) as NominationListResponse
  },

  async updateScoresheet(
    scoresheetId: string | undefined,
    gameId: string,
    scorerPersonId: string,
    isSimpleScoresheet: boolean = false,
    fileResourceId?: string
  ): Promise<Scoresheet> {
    // Build body matching the real volleymanager site format.
    // Empty string values for unset fields are required by the TYPO3 Neos/Flow backend;
    // omitting them causes 500 errors during property mapping.
    const body: Record<string, unknown> = {
      'scoresheet[game][__identity]': gameId,
      'scoresheet[isSimpleScoresheet]': isSimpleScoresheet ? 'true' : 'false',
      'scoresheet[hasFile]': fileResourceId ? 'true' : 'false',
      'scoresheet[closedAt]': '',
      'scoresheet[closedBy]': '',
      'scoresheet[emergencySubstituteReferees]': '',
      'scoresheet[notFoundButNominatedPersons]': '',
      'scoresheet[lastUpdatedByRealUser]': 'true',
    }

    // Use POST to create a new scoresheet, PUT to update an existing one.
    // The volleymanager backend requires POST when no scoresheet exists yet.
    const method = scoresheetId ? 'PUT' : 'POST'

    if (scoresheetId) {
      body['scoresheet[__identity]'] = scoresheetId
    }

    // writerPerson: send [__identity] when set, plain empty field when not set
    if (scorerPersonId) {
      body['scoresheet[writerPerson][__identity]'] = scorerPersonId
    } else {
      body['scoresheet[writerPerson]'] = ''
    }

    // file: send [__identity] when set, plain empty field when not set
    if (fileResourceId) {
      body['scoresheet[file][__identity]'] = fileResourceId
    } else {
      body['scoresheet[file]'] = ''
    }

    const data = await apiRequest<unknown>(
      '/sportmanager.indoorvolleyball/api%5cscoresheet',
      method,
      body,
      'text/plain;charset=UTF-8'
    )
    return validateResponse(data, scoresheetSchema, 'updateScoresheet') as Scoresheet
  },

  async validateScoresheet(
    gameId: string,
    scorerPersonId: string,
    isSimpleScoresheet: boolean = false
  ): Promise<ScoresheetValidation> {
    // Empty-string fields are required by the Neos Flow backend to clear server-side state
    // during validation. Omitting them causes 500 errors during property mapping.
    const body: Record<string, unknown> = {
      'scoresheet[game][__identity]': gameId,
      'scoresheet[writerPerson][__identity]': scorerPersonId,
      'scoresheet[isSimpleScoresheet]': isSimpleScoresheet ? 'true' : 'false',
      'scoresheet[scoresheetValidation]': '',
      'scoresheet[notFoundButNominatedPersons]': '',
      'scoresheet[emergencySubstituteReferees]': '',
      'scoresheet[closedAt]': '',
      'scoresheet[closedBy]': '',
      'scoresheet[file]': '',
      'scoresheet[hasFile]': 'false',
    }

    const data = await apiRequest<unknown>(
      '/sportmanager.indoorvolleyball/api%5cscoresheet/validateScoresheet',
      'POST',
      body
    )
    return validateResponse(
      data,
      scoresheetValidationSchema,
      'validateScoresheet'
    ) as ScoresheetValidation
  },

  async finalizeScoresheet(
    scoresheetId: string,
    gameId: string,
    scorerPersonId: string,
    fileResourceId: string,
    validationId?: string,
    isSimpleScoresheet: boolean = false
  ): Promise<Scoresheet> {
    const body: Record<string, unknown> = {
      'scoresheet[__identity]': scoresheetId,
      'scoresheet[game][__identity]': gameId,
      'scoresheet[writerPerson][__identity]': scorerPersonId,
      'scoresheet[file][__identity]': fileResourceId,
      'scoresheet[hasFile]': 'true',
      'scoresheet[isSimpleScoresheet]': isSimpleScoresheet ? 'true' : 'false',
    }

    if (validationId) {
      body['scoresheet[scoresheetValidation][__identity]'] = validationId
    }

    const data = await apiRequest<unknown>(
      '/sportmanager.indoorvolleyball/api%5cscoresheet/finalize',
      'POST',
      body,
      'text/plain;charset=UTF-8'
    )
    return validateResponse(data, scoresheetSchema, 'finalizeScoresheet') as Scoresheet
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
    formData.append('scoresheetFile[]', file)
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      formData.append('__csrfToken', csrfToken)
    }

    const data = await apiRequestFormData<unknown>(
      '/sportmanager.resourcemanagement/api%5cpersistentresource/upload',
      formData
    )
    return validateResponse(data, fileResourceArraySchema, 'uploadResource') as FileResource[]
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

    return apiRequestVoid(
      '/sportmanager.security/api%5cparty/switchRoleAndAttribute',
      'PUT',
      body.toString(),
      // The real site uses text/plain, not application/x-www-form-urlencoded
      'text/plain;charset=UTF-8'
    )
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
    return validateResponse(
      data,
      refereeBackupResponseSchema,
      'searchRefereeBackups'
    ) as RefereeBackupSearchResponse
  },
}
