/**
 * API Schema Type Re-exports
 *
 * Centralizes all schema type re-exports from the generated OpenAPI types.
 * Import types from this module instead of directly from './schema'.
 *
 * When new types are added to the OpenAPI spec, add their re-exports here.
 */

import type { components } from './schema'

/** All OpenAPI schema types */
export type Schemas = components['schemas']

// Assignment domain
export type Assignment = Schemas['Assignment']
export type AssignmentsResponse = Schemas['AssignmentsResponse']
export type RefereeGame = Schemas['RefereeGame']

// Compensation domain
export type CompensationRecord = Schemas['CompensationRecord']
export type CompensationsResponse = Schemas['CompensationsResponse']
export type ConvocationCompensationDetailed = Schemas['ConvocationCompensationDetailed']

// Exchange domain
export type GameExchange = Schemas['GameExchange']
export type ExchangesResponse = Schemas['ExchangesResponse']
export type PickExchangeResponse = Schemas['PickExchangeResponse']

// Validation / Scoresheet domain
export type NominationList = Schemas['NominationList']
export type IndoorPlayerNomination = Schemas['IndoorPlayerNomination']
export type PossibleNomination = Schemas['PossibleNomination']
export type PossibleNominationsResponse = Schemas['PossibleNominationsResponse']
export type NominationListResponse = Schemas['NominationListResponse']
export type Scoresheet = Schemas['Scoresheet']
export type ScoresheetValidation = Schemas['ScoresheetValidation']
export type FileResource = Schemas['FileResource']
export type GameDetails = Schemas['GameDetails']

// Person search domain
export type PersonSearchResult = Schemas['PersonSearchResult']
export type PersonSearchResponse = Schemas['PersonSearchResponse']

// Referee backup domain
export type RefereeBackupEntry = Schemas['RefereeBackupEntry']
export type RefereeBackupSearchResponse = Schemas['RefereeBackupSearchResponse']
export type BackupRefereeAssignment = Schemas['BackupRefereeAssignment']

// Settings domain
export type AssociationSettings = Schemas['AssociationSettings']
export type Season = Schemas['Season']

// Custom types (not from OpenAPI)
export interface PersonSearchFilter {
  firstName?: string
  lastName?: string
  yearOfBirth?: string
  associationId?: string
}
