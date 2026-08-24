---
'@volleykit/shared': minor
'volleykit-web': patch
---

Parse API list responses per item so one malformed entry no longer discards the whole list. Invalid items are dropped onto `droppedItems` and logged; `totalItemsCount` still reports the server's total across all pages, so per-page counts come from `items.length` plus `droppedItems.length`.
