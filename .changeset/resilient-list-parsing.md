---
'@volleykit/shared': minor
'volleykit-web': patch
---

Parse API list responses per item so one malformed entry no longer discards the whole list. Invalid items are dropped and logged, and `totalItemsCount` is reduced accordingly so pagination stays consistent.
