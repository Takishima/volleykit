/**
 * Version of the shape the schemas in this directory produce.
 *
 * Persisted query caches store post-validation data, so a `.transform()` that
 * changes a value's shape leaves every persisted entry in the old shape. Bump
 * this whenever that happens: both platforms compose it into their persister
 * `buster`, so one edit here invalidates the stale caches on all of them.
 *
 * Bump it as well when an API property the clients previously ignored starts
 * driving filtering, unless the persisted entries provably already carry it: an
 * entry stored without the property would otherwise keep rendering the
 * pre-change result out of a warm cache.
 *
 * 1: the transform that introduced it — composing it into the buster already
 *    changed that string, which discarded the caches written before it.
 * 2: exchanges started reading `_permissions`, which decides whether an entry is
 *    offered at all. Warm caches should already carry it — the endpoint returns
 *    the block unasked and `gameExchangeSchema` passed it through long before it
 *    was read — so this discard is a precaution against that premise being
 *    wrong, not a correction of a known-stale shape.
 */
export const PERSISTED_SCHEMA_VERSION = 2
