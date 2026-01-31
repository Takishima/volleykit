---
'volleykit-web': minor
---

Add comprehensive offline mode support with action queue and network detection

**Data Persistence**
- Add TanStack Query cache persistence using IndexedDB for 7-day offline viewing
- Add IndexedDB service layer for structured offline data storage
- Improve service worker API cache strategy (5s timeout, 500 entries, 7-day expiration)
- Add CORS proxy cache for production API responses
- Add cache warming hook to prefetch assignments and compensations on login

**Network Status Detection**
- Add useNetworkStatus hook using useSyncExternalStore for reactive network status
- Add OfflineIndicator component with dismissible amber banner
- Integrate offline indicator into app header

**Offline Mutation Queue**
- Add action queue system for offline mutations stored in IndexedDB
- Support for compensation updates, exchange applications, and exchange additions
- Auto-sync pending actions when connectivity is restored
- Add PendingActionsIndicator badge showing queued action count
- Session expiry detection and conflict handling during sync
