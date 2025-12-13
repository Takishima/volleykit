# Implementation Plan: Player Search Bottom Sheet (Issue #36)

## Overview

Create an `AddPlayerSheet` component that enables referees to search and add players who participated but weren't on the pre-saved roster during game validation.

**Dependencies:**
- Issue #34 (tabbed modal shell) - ✅ Completed
- Used by: Issue #35 (roster verification panel)

## Component Requirements

### UI Behavior
- **Mobile**: Bottom drawer that slides up from the bottom
- **Desktop**: Centered modal (consistent with existing modals)
- **Close mechanisms**: Backdrop tap, Escape key, explicit close button (✕)

### Features
- Live search filtering with input field
- Player list excluding already-registered roster members
- Display: name, jersey number, and license category
- Addition via button or row selection
- Demo mode support with mock data

## Implementation Steps

### Step 1: Export Required Types from API Client

**File:** `web-app/src/api/client.ts`

Add exports for nomination-related types from schema.ts:
```typescript
export type NominationList = Schemas["NominationList"];
export type IndoorPlayerNomination = Schemas["IndoorPlayerNomination"];
export type PossibleNomination = Schemas["PossibleNomination"];
export type PossibleNominationsResponse = Schemas["PossibleNominationsResponse"];
```

### Step 2: Add API Method for Fetching Possible Players

**File:** `web-app/src/api/client.ts`

Add method to the `api` object:
```typescript
getPossiblePlayerNominations: async (
  nominationListId: string,
  options?: { onlyFromMyTeam?: boolean; onlyRelevantGender?: boolean }
): Promise<PossibleNominationsResponse>
```

This calls `POST /nominationlist/getPossibleIndoorPlayerNominationsForNominationList` with:
- `nominationList`: UUID
- `onlyFromMyTeam`: boolean (default true)
- `onlyRelevantGender`: boolean (default true)
- `__csrfToken`: from session

### Step 3: Add Translation Keys

**File:** `web-app/src/i18n/index.ts`

Add new keys under `validation`:
```typescript
validation: {
  // ... existing keys
  addPlayer: string;           // "Add Player"
  searchPlayers: string;       // "Search players..."
  noPlayersFound: string;      // "No players found"
  playerAlreadyAdded: string;  // "Already on roster"
  jerseyNumber: string;        // "Jersey #"
  license: string;             // "License"
}
```

Provide translations for all 4 languages (en, de, fr, it).

### Step 4: Create AddPlayerSheet Component

**File:** `web-app/src/components/features/validation/AddPlayerSheet.tsx`

#### Props Interface
```typescript
interface AddPlayerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  nominationListId: string;
  excludePlayerIds: string[];
  onAddPlayer: (player: PossibleNomination) => void;
}
```

#### Component Structure
```
AddPlayerSheet
├── Backdrop (click to close)
├── Sheet Container (responsive: bottom on mobile, centered on desktop)
│   ├── Header
│   │   ├── Title ("Add Player")
│   │   └── Close Button (✕)
│   ├── Search Input (live filtering)
│   └── Player List
│       └── PlayerRow (repeating)
│           ├── Player Name
│           ├── Jersey Number
│           ├── License Category
│           └── Add Button / "Already added" badge
```

#### Key Implementation Details

1. **Responsive Layout with Tailwind:**
   ```tsx
   // Mobile: bottom drawer
   // Desktop: centered modal
   <div className="
     fixed inset-x-0 bottom-0
     md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
     max-h-[80vh] md:max-h-[70vh] md:max-w-lg md:w-full
     bg-white dark:bg-gray-800 rounded-t-xl md:rounded-lg
   ">
   ```

2. **Animation (slide up on mobile):**
   - Use CSS transitions for slide-up effect
   - Consider using `transform: translateY(100%)` to `translateY(0)` for entrance

3. **Search Implementation:**
   ```typescript
   const [searchQuery, setSearchQuery] = useState("");

   const filteredPlayers = useMemo(() => {
     if (!players) return [];

     const query = searchQuery.toLowerCase();
     return players.filter((player) => {
       // Exclude already-added players
       if (excludePlayerIds.includes(player.indoorPlayer?.__identity ?? "")) {
         return false;
       }
       // Filter by search query
       const name = player.indoorPlayer?.person?.displayName?.toLowerCase() ?? "";
       return name.includes(query);
     });
   }, [players, searchQuery, excludePlayerIds]);
   ```

4. **Escape Key Handling:**
   ```typescript
   useEffect(() => {
     if (!isOpen) return;
     const handleEscape = (e: KeyboardEvent) => {
       if (e.key === "Escape") onClose();
     };
     document.addEventListener("keydown", handleEscape);
     return () => document.removeEventListener("keydown", handleEscape);
   }, [isOpen, onClose]);
   ```

5. **Accessibility:**
   - `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
   - Search input with `aria-label`
   - Focus trap within the sheet
   - Button has `aria-label` for screen readers

### Step 5: Create usePlayerNominations Hook

**File:** `web-app/src/hooks/usePlayerNominations.ts`

```typescript
interface UsePlayerNominationsOptions {
  nominationListId: string;
  enabled?: boolean;
}

export function usePossiblePlayerNominations({
  nominationListId,
  enabled = true,
}: UsePlayerNominationsOptions) {
  const { isDemoMode } = useAuthStore();

  const query = useQuery({
    queryKey: queryKeys.possibleNominations(nominationListId),
    queryFn: () => api.getPossiblePlayerNominations(nominationListId),
    enabled: enabled && !isDemoMode,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Demo mode fallback
  if (isDemoMode) {
    return createDemoQueryResult(query, demoPlayers);
  }

  return query;
}
```

Add query key to `queryKeys` object:
```typescript
possibleNominations: (nominationListId: string) =>
  ["possibleNominations", nominationListId] as const,
```

### Step 6: Add Demo Data for Players

**File:** `web-app/src/stores/demo.ts`

Add mock player nominations data:
```typescript
const demoPossiblePlayers: PossibleNomination[] = [
  {
    __identity: "demo-possible-1",
    indoorPlayer: {
      __identity: "demo-player-1",
      person: {
        __identity: "demo-person-1",
        displayName: "Max Müller",
        firstName: "Max",
        lastName: "Müller",
      },
    },
    licenseCategory: "SEN",
    isAlreadyNominated: false,
  },
  // ... more demo players (8-12 total)
];
```

Export getter function or add to DemoState interface if needed by the hook.

### Step 7: Add Tests

**File:** `web-app/src/components/features/validation/AddPlayerSheet.test.tsx`

Test cases:
1. Renders when `isOpen` is true
2. Does not render when `isOpen` is false
3. Closes on backdrop click
4. Closes on Escape key
5. Closes on close button click
6. Filters players based on search input
7. Excludes players in `excludePlayerIds`
8. Calls `onAddPlayer` when player is selected
9. Shows loading state while fetching
10. Shows empty state when no players match search
11. Responsive layout (mobile vs desktop) - may need viewport mocking

### Step 8: Export from Validation Index

**File:** `web-app/src/components/features/validation/index.ts`

```typescript
export { AddPlayerSheet } from "./AddPlayerSheet";
```

## File Structure After Implementation

```
web-app/src/
├── api/
│   └── client.ts              # + exports, + api method
├── components/features/validation/
│   ├── AddPlayerSheet.tsx     # NEW
│   ├── AddPlayerSheet.test.tsx # NEW
│   ├── HomeRosterPanel.tsx
│   ├── AwayRosterPanel.tsx
│   ├── ScorerPanel.tsx
│   ├── ScoresheetPanel.tsx
│   └── index.ts               # + export AddPlayerSheet
├── hooks/
│   ├── useConvocations.ts
│   └── usePlayerNominations.ts # NEW
├── i18n/
│   └── index.ts               # + translation keys
└── stores/
    └── demo.ts                # + demo player data
```

## Styling Notes

- Follow existing Tailwind patterns from other modals
- Use `dark:` variants for dark mode support
- Consistent spacing: `p-4` or `p-6` for containers
- Border radius: `rounded-lg` for desktop, `rounded-t-xl` for mobile bottom sheet
- Shadow: `shadow-xl` for elevation
- Background: `bg-white dark:bg-gray-800`
- Text colors: `text-gray-900 dark:text-white` for headings, `text-gray-500 dark:text-gray-400` for secondary

## Accessibility Checklist

- [ ] `role="dialog"` and `aria-modal="true"` on sheet container
- [ ] `aria-labelledby` pointing to title element
- [ ] Search input has `aria-label` or visible label
- [ ] Close button has `aria-label="Close"`
- [ ] Focus management: focus moves to sheet when opened
- [ ] Escape key closes the sheet
- [ ] Screen reader announces when sheet opens/closes

## Integration Notes

This component will be used by the HomeRosterPanel and AwayRosterPanel components (Issue #35). The panels will:
1. Maintain state for `isAddPlayerSheetOpen`
2. Pass the current nomination list ID
3. Pass IDs of already-nominated players as `excludePlayerIds`
4. Handle `onAddPlayer` to update the nomination list

## Estimated Complexity

- **API Client Updates**: Low (type exports + 1 method)
- **Hook Creation**: Low (follows existing pattern)
- **Component Creation**: Medium (new UI pattern for bottom sheet)
- **Translations**: Low (8 keys × 4 languages)
- **Tests**: Medium (multiple interaction scenarios)
- **Demo Data**: Low (follows existing pattern)

## Dependencies

- Tailwind CSS (already installed)
- TanStack Query (already installed)
- No new external dependencies required
