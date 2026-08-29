---
'@volleykit/shared': patch
---

Discard persisted query caches written before exchanges read `_permissions`

Exchange entries cached by an earlier build should already carry the take-over
permission - the endpoint returns the block without being asked and the schema
passed it through - but an entry stored without it reads as takeable and would
keep offering entries the referee cannot take over. Bumping
`PERSISTED_SCHEMA_VERSION` changes the persister buster on both platforms and
discards those entries once, so the filter starts from a cache that cannot
predate it.
