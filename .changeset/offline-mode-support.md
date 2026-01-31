---
'volleykit-web': minor
---

Add offline mode infrastructure with IndexedDB-based query persistence

- Add TanStack Query cache persistence using IndexedDB for 7-day offline viewing
- Add IndexedDB service layer for structured offline data storage
- Improve service worker API cache strategy (5s timeout, 500 entries, 7-day expiration)
- Add CORS proxy cache for production API responses
- Add cache warming hook to prefetch assignments and compensations on login
- Export MS_PER_DAY constant for consistent time calculations
