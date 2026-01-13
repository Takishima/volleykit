---
"volleykit-web": minor
---

Added smart conflict detection that considers venue distance in addition to time gaps. Assignments at nearby venues (within 5km) are no longer flagged as conflicts even with small time gaps, since no travel time is needed. This applies to both the Assignments page conflict warnings and the Exchange page game gap filter.
