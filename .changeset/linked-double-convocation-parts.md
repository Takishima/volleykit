---
'@volleykit/shared': minor
'@volleykit/mobile': patch
'volleykit-web': patch
---

`linkedDoubleConvocationGameNumberAndRefereePosition` now normalizes to an array of label parts instead of a pre-joined display string. The API layer stays shape-only; consumers lay the parts out themselves, or join them with the new `formatLinkedDoubleConvocation()` helper from `@volleykit/shared/utils`. The mobile assignment detail screen renders one part per line.
