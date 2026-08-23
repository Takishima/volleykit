---
'@volleykit/shared': patch
---

Fixed assignments failing to load for associations (e.g. SRBA) where the API returns a non-string `linkedDoubleConvocationGameNumberAndRefereePosition`. The field is now parsed leniently and normalized to a display string (array label parts are joined with ' | ') instead of failing validation for the whole list.
