---
'volleykit-web': patch
---

Fixed NLB/NLA validation: fetch group.hasNoScoresheet so scoresheet upload correctly shows as not required, throw an error instead of silently succeeding when the scorer cannot be saved due to a missing scoresheet, and make logger configurable via localStorage for on-demand debugging in production
