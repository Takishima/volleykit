---
'volleykit-web': patch
---

Fix `react-hooks/set-state-in-effect` and `react-hooks/refs` lint errors by migrating affected hooks and modal state resets to the "adjust state during render" pattern and moving `checkForUpdate()` into login submit handlers.
