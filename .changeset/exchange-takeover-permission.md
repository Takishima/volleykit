---
'@volleykit/shared': minor
'volleykit-web': minor
---

Hide exchange entries the referee is not allowed to take over

The exchange search endpoint returns a per-entry `_permissions.properties.appliedBy.update`
flag telling whether the signed-in referee may apply. It is false when a rule blocks
them - most importantly when they are registered as a referee for one of the two teams
playing that game. Those entries are now dropped from the Open tab instead of offering
a take-over the backend rejects. Own entries stay visible so they can still be removed
from the marketplace, and entries without the flag are treated as takeable.
