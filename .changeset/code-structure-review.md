---
'volleykit-web': patch
---

Improve code structure and separation of concerns

- Promote useActiveAssociation hook to shared/hooks (eliminates cross-feature coupling)
- Extract compensation-helpers to shared/utils
- Extract BottomNavigation and HeaderDropdown from AppShell
- Add barrel exports to assignments feature for conflict detection utils
- Add ESLint rule preventing shared/ from importing feature internals
- Split worker/utils.ts into 9 focused modules
