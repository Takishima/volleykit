---
"@volleykit/mobile": patch
---

Implement calendar sync with useCalendarSync hook

- Integrate useCalendarSync hook into CalendarSettingsScreen for actual sync functionality
- Display sync summary showing created/updated/deleted calendar events after sync
- Handle case when no assignments are cached with user-friendly error message
- Add translations for new sync-related UI strings in all 4 languages
