/**
 * Public schema surface for `@volleykit/shared/api`.
 *
 * Explicit re-exports only: several schemas are exported from their own module
 * purely so a sibling module can compose them, and those stay package-internal.
 * `validation.ts` re-exports this barrel, so existing imports keep working.
 */
/**
 * Version of the shape the schemas in this directory produce.
 *
 * Persisted query caches store post-validation data, so a `.transform()` that
 * changes a value's shape leaves every persisted entry in the old shape. Bump
 * this whenever that happens: both platforms compose it into their persister
 * `buster`, so one edit here invalidates the stale caches on all of them.
 *
 * Stays at 1 for the transform that introduced it — composing it into the
 * buster already changed that string, which discarded the caches written
 * before it.
 */
export const PERSISTED_SCHEMA_VERSION = 1

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

export { countRowsConsumed, formatDroppedListItems, getDroppedListItems } from './resilient-list'
export type { DroppedListItem, ResilientList } from './resilient-list'
