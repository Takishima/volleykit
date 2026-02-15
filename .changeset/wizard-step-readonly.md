---
'volleykit-web': minor
---

Mark individual validation wizard steps as read-only when their form is already finalized. Also fixes `isValidated` to require all forms closed (both rosters + scoresheet) instead of only checking `scoresheet.closedAt`. Adds a partially validated game in demo mode to showcase per-step read-only state.
