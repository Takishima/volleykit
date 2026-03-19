/**
 * API client module — types, session management, and data source dispatcher.
 *
 * This is the public API surface for consumers. It re-exports the real API
 * client from ./real-api.ts alongside the mock and calendar clients, and
 * provides getApiClient() to select the right one based on the data source.
 */
/* eslint-disable import-x/order -- Imports are split to manage circular dependencies */
import type { components } from './schema'

import { mockApi } from './mock-api'
import { calendarApi } from '@/features/assignments/api/calendar-client'
import { api } from './real-api'

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
export type NominationListResponse = Schemas['NominationListResponse']
export type Scoresheet = Schemas['Scoresheet']
export type ScoresheetValidation = Schemas['ScoresheetValidation']
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
  associationId?: string
}

// Re-export search types from shared package (single source of truth)
export type { SearchConfiguration, PropertyFilter, PropertyOrdering } from '@volleykit/shared/api'

// Session management — re-export from dedicated module
export {
  setCsrfToken,
  clearSession,
  captureSessionToken,
  getSessionHeaders,
  getSessionToken,
  CAPTURE_SESSION_TOKEN_HEADER,
} from './session'

// Re-export the real API client
export { api } from './real-api'

// ApiClient type: use the concrete implementation type for web-app consumers.
// The shared ApiClient interface (from @volleykit/shared/api) defines the
// cross-platform contract; structural typing via getApiClient() ensures
// all implementations (real, mock, calendar) conform to the same shape.
export type ApiClient = typeof api

// Re-export DataSource from auth store for consumers that import from client
export type { DataSource } from '@/shared/stores/auth'

// Import for internal use
import type { DataSource } from '@/shared/stores/auth'

/**
 * Returns the appropriate API client based on the data source.
 *
 * @param dataSource - The data source to use. Accepts either:
 *   - DataSource string: 'api', 'demo', or 'calendar'
 *   - boolean (deprecated): true = demo mode, false = api mode
 *
 * @returns The API client for the specified data source
 */
export function getApiClient(dataSource: DataSource | boolean): typeof api {
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
