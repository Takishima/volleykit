/**
 * Re-export query keys from @volleykit/shared.
 *
 * The shared package is the source of truth for query keys.
 * This re-export maintains backward compatibility with existing imports.
 */

export { queryKeys } from '@volleykit/shared/api'
export type { SearchConfiguration, PersonSearchFilter } from '@volleykit/shared/api'
