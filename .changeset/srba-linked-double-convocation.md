---
'@volleykit/shared': patch
---

Fixed assignments failing to load for associations (e.g. SRBA) where the API returns a non-string `linkedDoubleConvocationGameNumberAndRefereePosition`. The value is now normalized to a display string instead of failing validation for the whole list.
