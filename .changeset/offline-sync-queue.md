---
'@volleykit/shared': minor
'volleykit-web': minor
'@volleykit/mobile': minor
---

Add offline sync queue for mutations

Implements offline mutation queuing with automatic sync when connectivity is restored:

- Core sync queue infrastructure with deduplication and conflict resolution
- Platform-specific storage adapters (IndexedDB for web, AsyncStorage for mobile)
- Network status detection hook for web browsers
- Offline-aware mutation hook with queue integration
- UI components: SyncStatusIndicator, PendingSyncBadge, SyncResultsModal
- Comprehensive unit tests for queue logic, conflict resolution, and sync engine
- Translations in all 4 languages (de/en/fr/it)

Key features:

- Opposing operations cancel out (apply + withdraw = nothing)
- Deduplication for idempotent actions, replacement for data-carrying actions
- Conflict categorization (already_taken, not_found, expired, etc.)
- Retry with exponential backoff for transient errors
- Clear user feedback for sync status and conflicts
