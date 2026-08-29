---
'@volleykit/shared': patch
---

Discard persisted query caches written before exchanges requested `_permissions`

Exchange entries cached by an earlier build carry no take-over permission, so a
warm cache would keep offering entries the referee cannot take over. Bumping
`PERSISTED_SCHEMA_VERSION` changes the persister buster on both platforms.
