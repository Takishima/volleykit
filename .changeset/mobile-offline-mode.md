---
'@volleykit/mobile': minor
'@volleykit/shared': patch
---

Add comprehensive offline mode support with action queue for mobile app

- Add offline action queue system using AsyncStorage for persistent storage
- Support queuing mutations (updateCompensation, applyForExchange, addToExchange, removeOwnExchange) when offline
- Automatically sync pending actions when connectivity is restored
- Add PendingActionsIndicator component showing pending action count in header
- Add missing API mutation methods (applyForExchange, removeOwnExchange, updateCompensation)
- Add offline-related translations for all 4 languages (de/en/fr/it)
- Clear action queue on logout
