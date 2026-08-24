---
'@volleykit/shared': minor
'@volleykit/mobile': patch
'volleykit-web': patch
---

`linkedDoubleConvocationGameNumberAndRefereePosition` now normalizes to an array of label parts instead of a pre-joined display string. The API layer stays shape-only, leaving the layout to consumers. The mobile assignment detail screen renders one part per line.
