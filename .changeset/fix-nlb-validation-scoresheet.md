---
'volleykit-web': patch
---

Fixed NLB/NLA validation: fetch group.hasNoScoresheet so scoresheet upload correctly shows as not required, and throw an error instead of silently succeeding when the scorer cannot be saved due to a missing scoresheet
