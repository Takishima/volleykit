---
'volleykit-web': patch
---

Fixed NLB/NLA validation not fetching group.hasNoScoresheet from the API, causing the scoresheet upload to incorrectly appear as required and preventing save requests (PUT/POST) from being made for games with electronic scoresheets
