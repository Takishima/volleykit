---
'@volleykit/mobile': patch
'@volleykit/shared': patch
---

Show alert notifications when offline sync fails

- Display alert dialog when some changes fail to sync after reconnecting
- Display alert dialog for critical sync errors (unexpected exceptions)
- Add `offline.syncError` translation key for critical sync failure messages
