---
'@volleykit/shared': minor
'volleykit-web': patch
---

Fix exchanges not loading during the summer off-season. The exchange query used the current volleyball season's end date as its upper bound, which falls in the past between June and August, inverting the date window and hiding all upcoming exchanges. A new `getActiveOrUpcomingSeasonDateRange` helper looks forward to the upcoming season when the current one has ended.
