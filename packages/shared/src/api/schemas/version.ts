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
