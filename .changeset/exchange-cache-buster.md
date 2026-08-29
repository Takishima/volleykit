---
'@volleykit/shared': patch
---

Discard persisted query caches written before exchanges read `_permissions`

Exchange entries cached by an earlier build may carry no take-over permission,
which reads as takeable, so a warm cache would keep offering entries the referee
cannot take over. Bumping `PERSISTED_SCHEMA_VERSION` changes the persister buster
on both platforms and discards those entries once.
