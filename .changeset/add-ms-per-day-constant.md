---
'@volleykit/shared': patch
---

Add MS_PER_DAY constant to date-helpers for time conversion consistency

Added `MS_PER_DAY` constant (86400000 milliseconds) to the shared date-helpers module, completing the set of time conversion constants. Updated mobile app to use shared constants (`MS_PER_MINUTE`, `MS_PER_HOUR`, `MS_PER_DAY`) instead of inline magic numbers for improved code readability and maintainability.
