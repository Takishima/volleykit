---
'volleykit-web': patch
'@volleykit/mobile': patch
---

Improve maintainability with targeted separation of concerns

- Extract CalendarSettingsScreen logic into useCalendarSettings hook (mobile)
- Decompose App.tsx into RouteGuards, QueryErrorHandler, useAuthSync, queryClientConfig (web)
- Move compensation-helpers from shared/utils to features/compensations where it belongs (web)
- Split worker test file into 11 focused test files covering utils and handlers
- Document services-vs-utils boundary in CODE_PATTERNS.md
