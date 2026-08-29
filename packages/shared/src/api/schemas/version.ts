/**
 * Version of the shape the schemas in this directory produce.
 *
 * Persisted query caches store post-validation data, so a `.transform()` that
 * changes a value's shape leaves every persisted entry in the old shape. Bump
 * this whenever that happens: both platforms compose it into their persister
 * `buster`, so one edit here invalidates the stale caches on all of them.
 *
 * Bump it as well when an API property the clients previously ignored starts
 * driving filtering: entries persisted before that may carry no value for it, so
 * a warm cache would keep rendering the pre-change result.
 *
 * 1: the transform that introduced it — composing it into the buster already
 *    changed that string, which discarded the caches written before it.
 * 2: exchanges started reading `_permissions`, which decides whether an entry is
 *    offered at all. The endpoint returns the block unasked (requesting it in
 *    `propertyRenderConfiguration` makes the search fail), but entries persisted
 *    by earlier builds were validated before the schema kept it.
 */
export const PERSISTED_SCHEMA_VERSION = 2
