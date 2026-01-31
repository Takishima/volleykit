---
'volleykit-web': minor
'@volleykit/shared': minor
---

Eager load compensation data with assignments to improve performance

Assignments now include compensation data (distance, amounts, editability flags) from the API response, eliminating the need for a separate API call when opening the compensation edit dialog. This enables:

- Faster compensation dialog opening (no loading spinner for most cases)
- Foundation for offline compensation editing
- Reduced API traffic by fetching compensation data with assignments

The `correctionReason` field is still fetched separately via `getCompensationDetails` as it's only available through the `showWithNestedObjects` endpoint.
