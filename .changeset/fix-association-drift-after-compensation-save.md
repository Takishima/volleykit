---
'volleykit-web': patch
---

Fixed the games list showing another association after saving a compensation distance. The API client now guarantees the server session is on the selected association before every request and re-checks it after every write, and a reload repairs any drift it detects instead of preserving it.
