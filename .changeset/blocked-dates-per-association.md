---
'volleykit-web': minor
'@volleykit/shared': minor
---

Added an Absences page, reachable from Settings, showing the blocked dates of the active association: the referee's own absence entries plus association-imposed read-only blockings (e.g. national-squad duty dates), split into upcoming and past.

Note for demo mode: a demo session persisted before this release is regenerated once on next load to seed the new absences data, which discards any in-flight demo exchange takeovers (validated games and compensation edits survive).
