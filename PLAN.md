# Implementation Plan: Exchange Tab Refactoring (Issue #17)

## Summary

Refactor the Exchange tab to provide better filtering and user experience. The current implementation already has the core structure (two tabs, swipe gestures, confirmation modals). The main addition is **level-based filtering** for the "Open" tab.

## Current State Analysis

### Already Implemented ✅
- **Two sub-tabs**: "Open" (default) and "My Applications" - `ExchangePage.tsx:56-62`
- **Swipe left on "Open" tab**: Triggers "take over" action - `ExchangePage.tsx:40-43`
- **Swipe right on "My Applications" tab**: Triggers removal action - `ExchangePage.tsx:44-47`
- **Confirmation modals**: `TakeOverExchangeModal` and `RemoveFromExchangeModal`
- **Expandable cards**: Click to reveal details matching assignment format

### To Be Implemented
1. **Level-based filtering** for the "Open" tab
2. **Translation keys** for filter UI
3. **User level storage/retrieval** (placeholder - marked as future logic in issue)

## Implementation Steps

### Step 1: Add Translation Keys for Level Filter

**File**: `web-app/src/i18n/index.ts`

Add new translation keys under the `exchange` section:
```typescript
exchange: {
  // ... existing keys
  filterByLevel: string;
  filterByLevelDescription: string;
  showAllLevels: string;
  showMyLevel: string;
}
```

### Step 2: Add User Referee Level to Demo Store

**File**: `web-app/src/stores/demo.ts`

Add a `userRefereeLevel` property to the demo store for testing purposes:
```typescript
userRefereeLevel: "N2", // Example level for demo user
```

### Step 3: Create Level Filter Toggle Component

**File**: `web-app/src/components/features/LevelFilterToggle.tsx` (new file)

Create a simple toggle component:
- Toggle between "All levels" and "My level"
- Compact design that fits in the Exchange page header
- Uses existing UI patterns (similar to safe mode toggle styling)

### Step 4: Update Exchange Page with Level Filter

**File**: `web-app/src/pages/ExchangePage.tsx`

Changes:
1. Add `filterByLevel` state: `useState<boolean>(false)`
2. Import and render `LevelFilterToggle` component next to tabs
3. Pass filter state to data hook or filter data client-side
4. Only show filter toggle when "Open" tab is active

### Step 5: Implement Level Filtering Logic

**File**: `web-app/src/hooks/useConvocations.ts`

Option A (Client-side filtering - simpler):
- Add a new hook `useFilteredGameExchanges` that wraps `useGameExchanges`
- Filter by `requiredRefereeLevel` when filter is enabled
- Compare against user's level from demo store

Option B (API-side filtering - if supported):
- Add level filter to `SearchConfiguration` property filters
- Would require API investigation

**Recommendation**: Start with Option A (client-side) since the data set is small and the API filtering capability is unknown.

### Step 6: Add User Level to Auth/Settings (Placeholder)

**File**: `web-app/src/stores/auth.ts` or new settings store

For production use, the user's referee level would need to be:
- Fetched from the API during login/session check
- Stored in the auth store or a separate user profile store

For now, implement as a placeholder with demo data support.

### Step 7: Update Tests

**Files**:
- `web-app/src/pages/ExchangePage.test.tsx` (if exists, or create)
- `web-app/src/components/features/LevelFilterToggle.test.tsx`

Test cases:
- Level filter toggle renders and functions
- Filtering correctly shows/hides exchanges based on level
- Filter state persists during tab switches
- Filter only appears on "Open" tab

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/i18n/index.ts` | Modify | Add filter-related translation keys |
| `src/stores/demo.ts` | Modify | Add `userRefereeLevel` for demo mode |
| `src/components/features/LevelFilterToggle.tsx` | Create | New toggle component |
| `src/pages/ExchangePage.tsx` | Modify | Integrate level filter |
| `src/hooks/useConvocations.ts` | Modify | Add filtering logic |
| Tests | Create/Modify | Test coverage for new functionality |

## UI Design

```
┌─────────────────────────────────────────────────────┐
│ Exchange                                             │
├─────────────────────────────────────────────────────┤
│ [Open]  [My Applications]     [🔽 My level only]   │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ Dec 15   Team A vs Team B                [Open] │ │
│ │ 14:00    Level N2+                          ▼   │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Dec 16   Team C vs Team D                [Open] │ │
│ │ 16:30    Level N3+                          ▼   │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

The filter toggle appears as a checkbox or switch in the header area, only visible when the "Open" tab is selected.

## Technical Considerations

1. **Level Comparison Logic**: Referee levels follow a hierarchy (e.g., N1 > N2 > N3). An N2 referee can officiate N2+ and N3+ games but not N1+ games. The filtering should use `requiredRefereeLevelGradationValue` for accurate comparison.

2. **State Persistence**: Consider persisting filter preference in localStorage or URL params for better UX.

3. **Empty State**: Update empty state message when filter is active to indicate no matches at user's level.

4. **Accessibility**: Ensure filter toggle is keyboard accessible and has proper ARIA labels.

## Future Enhancements (Out of Scope)

- Fetch actual user referee level from API
- Multiple filter criteria (level + date range + location)
- Save filter preferences per user
