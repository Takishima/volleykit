/**
 * Public schema surface for `@volleykit/shared/api`.
 *
 * Explicit re-exports only: several schemas are exported from their own module
 * purely so a sibling module can compose them, and those stay package-internal.
 * `validation.ts` re-exports this barrel, so existing imports keep working.
 */
export {
  dateSchema,
  refereePositionSchema,
  convocationStatusSchema,
  exchangeStatusSchema,
} from './primitives'

export { fileResourceSchema, fileResourceArraySchema } from './common'

export {
  assignmentSchema,
  compensationRecordSchema,
  gameExchangeSchema,
  personSearchResultSchema,
  assignmentsResponseSchema,
  compensationsResponseSchema,
  exchangesResponseSchema,
  personSearchResponseSchema,
  compensationDetailedSchema,
  pickExchangeResponseSchema,
} from './convocations'

export {
  scoresheetValidationSchema,
  scoresheetSchema,
  nominationListSchema,
  nominationListResponseSchema,
  gameDetailsSchema,
  gameDetailsResponseSchema,
  possibleNominationsResponseSchema,
} from './games'

export { associationSettingsSchema, seasonSchema } from './settings'

export { refereeBackupEntrySchema, refereeBackupResponseSchema } from './backup'

export { formatDroppedListItems, getDroppedListItems } from './resilient-list'
export type { DroppedListItem, ResilientList } from './resilient-list'
