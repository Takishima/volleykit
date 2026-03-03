---
'volleykit-web': patch
---

Fixed fuzzy name matching for scorer names with surname particles (e.g. "di martino", "von Berg", "de la Cruz"). Previously, particles like "di" were incorrectly treated as a first name, splitting "di martino" into firstName:"di" + lastName:"martino". Now the parser recognizes common surname particles and keeps them as part of the lastName for accurate search results.
