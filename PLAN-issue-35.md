# Implementation Plan: Issue #35 - RosterVerificationPanel Component

## Overview

Create a `RosterVerificationPanel` component that allows referees to verify team rosters match physical scoresheets during game validation. This component will be used by both `HomeRosterPanel` and `AwayRosterPanel` tabs in the `ValidateGameModal`.

## Current State

- `HomeRosterPanel` and `AwayRosterPanel` exist as placeholder components in `web-app/src/components/features/validation/`
- The tabbed modal shell (issue #34) is complete
- API types exist: `NominationList`, `IndoorPlayerNomination`, `PossibleNomination` in `src/api/schema.ts`
- API documentation exists in `docs/api/captures/nomination_list_endpoints.md`
- Issue #36 (AddPlayerSheet) is a related feature that will be implemented separately

## Architecture Overview

```
ValidateGameModal
├── HomeRosterPanel
│   └── RosterVerificationPanel (team="home")
└── AwayRosterPanel
    └── RosterVerificationPanel (team="away")
```

The `RosterVerificationPanel` is a shared component that handles the roster display and modification logic, while `HomeRosterPanel` and `AwayRosterPanel` are thin wrappers that pass the appropriate team context.

## Implementation Steps

### Step 1: Create RosterVerificationPanel Component

**File**: `web-app/src/components/features/validation/RosterVerificationPanel.tsx`

Create the main panel component with:

```typescript
interface RosterPlayer {
  id: string;
  shirtNumber: number;
  displayName: string;
  licenseCategory?: string;
  isCaptain?: boolean;
  isLibero?: boolean;
  isNewlyAdded?: boolean;  // Visual distinction for newly added players
}

interface RosterModifications {
  added: RosterPlayer[];
  removed: string[];  // Player IDs marked for removal
}

interface RosterVerificationPanelProps {
  team: "home" | "away";
  teamName: string;
  gameId: string;
  nominationListId?: string;
  onModificationsChange?: (modifications: RosterModifications) => void;
}
```

**Component Features**:
1. Display current roster in a list with player number and name
2. Individual "Remove" button/action for each player
3. "Add Player" button that will trigger AddPlayerSheet (stubbed for now)
4. Visual badge/styling for newly-added players
5. Strikethrough/muted styling for players marked for deletion
6. Loading spinner during data fetch
7. Error state with retry button
8. Empty state when no players

**Layout Structure**:
```
┌─────────────────────────────────────┐
│ [Team Name]                         │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ #7  Jean Dupont         [🗑️]  │ │
│ ├─────────────────────────────────┤ │
│ │ #12 Marie Martin  [NEW] [🗑️]  │ │
│ ├─────────────────────────────────┤ │
│ │ ~~#5 Pierre Bernard~~   [↩️]  │ │  <- Marked for removal
│ └─────────────────────────────────┘ │
│                                     │
│         [+ Add Player]              │
└─────────────────────────────────────┘
```

### Step 2: Create PlayerListItem Component

**File**: `web-app/src/components/features/validation/PlayerListItem.tsx`

A reusable list item for displaying a single player:

```typescript
interface PlayerListItemProps {
  player: RosterPlayer;
  isMarkedForRemoval: boolean;
  onRemove: () => void;
  onUndoRemoval: () => void;
}
```

Features:
- Display shirt number (formatted with `#` prefix)
- Display player name
- Show license category badge (SEN, JUN, etc.)
- Show captain (C) or libero (L) indicator if applicable
- "Newly Added" badge for players added during this session
- Remove button (trash icon) or Undo button based on state
- Strikethrough styling when marked for removal
- Dark mode support

### Step 3: Create useNominationList Hook

**File**: `web-app/src/hooks/useNominationList.ts`

Hook for fetching and managing nomination list data:

```typescript
interface UseNominationListOptions {
  nominationListId: string;
  gameId: string;
  teamId: string;
  enabled?: boolean;
}

interface UseNominationListResult {
  nominationList: NominationList | null;
  players: RosterPlayer[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}
```

**Implementation Notes**:
- Use TanStack Query for data fetching
- Support demo mode with mock data from `useDemoStore`
- Transform `IndoorPlayerNomination[]` to `RosterPlayer[]` format
- Cache with appropriate stale time (5 minutes)
- Query key: `['nominationList', nominationListId]`

### Step 4: Create Mock Data for Demo Mode

**File**: `web-app/src/stores/demo.ts` (update existing)

Add mock nomination list data:

```typescript
// Add to demo store
mockNominationLists: {
  home: {
    id: 'mock-nomination-home',
    players: [
      { id: 'p1', shirtNumber: 1, displayName: 'Anna Müller', licenseCategory: 'SEN', isCaptain: true },
      { id: 'p2', shirtNumber: 7, displayName: 'Sophie Schneider', licenseCategory: 'SEN' },
      { id: 'p3', shirtNumber: 12, displayName: 'Laura Weber', licenseCategory: 'JUN', isLibero: true },
      // ... more players (6-14 total for volleyball)
    ]
  },
  away: {
    id: 'mock-nomination-away',
    players: [
      { id: 'p10', shirtNumber: 3, displayName: 'Marie Dubois', licenseCategory: 'SEN', isCaptain: true },
      { id: 'p11', shirtNumber: 8, displayName: 'Emma Bernard', licenseCategory: 'SEN' },
      // ... more players
    ]
  }
}
```

### Step 5: Add Translation Keys

**File**: `web-app/src/i18n/index.ts`

Add to `validation` section in all 4 languages:

```typescript
// Add to Translations interface -> validation
roster: {
  addPlayer: string;
  removePlayer: string;
  undoRemoval: string;
  newlyAdded: string;
  captain: string;
  libero: string;
  emptyRoster: string;
  loadingRoster: string;
  errorLoading: string;
  playerCount: string;  // "{count} players"
}

// English
roster: {
  addPlayer: "Add Player",
  removePlayer: "Remove player",
  undoRemoval: "Undo removal",
  newlyAdded: "New",
  captain: "Captain",
  libero: "Libero",
  emptyRoster: "No players in roster",
  loadingRoster: "Loading roster...",
  errorLoading: "Failed to load roster",
  playerCount: "{count} players",
}

// German
roster: {
  addPlayer: "Spieler hinzufügen",
  removePlayer: "Spieler entfernen",
  undoRemoval: "Entfernung rückgängig",
  newlyAdded: "Neu",
  captain: "Kapitän",
  libero: "Libero",
  emptyRoster: "Keine Spieler im Kader",
  loadingRoster: "Kader wird geladen...",
  errorLoading: "Kader konnte nicht geladen werden",
  playerCount: "{count} Spieler",
}

// French
roster: {
  addPlayer: "Ajouter un joueur",
  removePlayer: "Retirer le joueur",
  undoRemoval: "Annuler le retrait",
  newlyAdded: "Nouveau",
  captain: "Capitaine",
  libero: "Libéro",
  emptyRoster: "Aucun joueur dans l'effectif",
  loadingRoster: "Chargement de l'effectif...",
  errorLoading: "Échec du chargement de l'effectif",
  playerCount: "{count} joueurs",
}

// Italian
roster: {
  addPlayer: "Aggiungi giocatore",
  removePlayer: "Rimuovi giocatore",
  undoRemoval: "Annulla rimozione",
  newlyAdded: "Nuovo",
  captain: "Capitano",
  libero: "Libero",
  emptyRoster: "Nessun giocatore nella rosa",
  loadingRoster: "Caricamento rosa...",
  errorLoading: "Caricamento rosa fallito",
  playerCount: "{count} giocatori",
}
```

### Step 6: Update HomeRosterPanel and AwayRosterPanel

**File**: `web-app/src/components/features/validation/HomeRosterPanel.tsx`

Transform from placeholder to wrapper:

```typescript
export function HomeRosterPanel({ assignment }: HomeRosterPanelProps) {
  const { homeTeam } = getTeamNames(assignment);
  const gameId = assignment.refereeGame?.game?.__identity ?? '';
  const nominationListId = assignment.refereeGame?.game?.nominationListHome?.__identity;

  return (
    <RosterVerificationPanel
      team="home"
      teamName={homeTeam}
      gameId={gameId}
      nominationListId={nominationListId}
    />
  );
}
```

**File**: `web-app/src/components/features/validation/AwayRosterPanel.tsx`

Same pattern for away team.

### Step 7: Create Component Tests

**File**: `web-app/src/components/features/validation/RosterVerificationPanel.test.tsx`

Test cases:
- Renders loading state initially
- Displays player list after loading
- Shows player number and name for each player
- Shows license category badge
- Shows captain/libero indicators
- Remove button triggers callback
- Marked-for-removal players show strikethrough
- Undo button restores removed player
- Add Player button is visible
- Empty state when no players
- Error state with retry button
- "Newly Added" badge displays correctly

**File**: `web-app/src/components/features/validation/PlayerListItem.test.tsx`

Test cases:
- Renders player number and name
- Shows license badge when provided
- Shows captain indicator
- Shows libero indicator
- Calls onRemove when remove button clicked
- Shows strikethrough when marked for removal
- Shows undo button when marked for removal
- Calls onUndoRemoval when undo clicked
- Shows "New" badge for newly added players

**File**: `web-app/src/hooks/useNominationList.test.ts`

Test cases:
- Returns loading state initially
- Fetches nomination list data
- Transforms data to RosterPlayer format
- Returns demo data when in demo mode
- Handles error state

### Step 8: Update panels.test.tsx

**File**: `web-app/src/components/features/validation/panels.test.tsx`

Update existing tests to work with new implementation:
- Mock the useNominationList hook
- Test that panels render RosterVerificationPanel
- Test team prop is passed correctly

### Step 9: Export New Components

**File**: `web-app/src/components/features/validation/index.ts`

Update exports:

```typescript
export { HomeRosterPanel } from './HomeRosterPanel';
export { AwayRosterPanel } from './AwayRosterPanel';
export { ScorerPanel } from './ScorerPanel';
export { ScoresheetPanel } from './ScoresheetPanel';
export { RosterVerificationPanel } from './RosterVerificationPanel';
export { PlayerListItem } from './PlayerListItem';
```

### Step 10: Run CI Validation

```bash
cd web-app
npm run generate:api
npm run lint
npm test
npm run build
npm run size
```

## File Change Summary

### New Files
- `web-app/src/components/features/validation/RosterVerificationPanel.tsx`
- `web-app/src/components/features/validation/RosterVerificationPanel.test.tsx`
- `web-app/src/components/features/validation/PlayerListItem.tsx`
- `web-app/src/components/features/validation/PlayerListItem.test.tsx`
- `web-app/src/hooks/useNominationList.ts`
- `web-app/src/hooks/useNominationList.test.ts`

### Modified Files
- `web-app/src/components/features/validation/HomeRosterPanel.tsx`
- `web-app/src/components/features/validation/AwayRosterPanel.tsx`
- `web-app/src/components/features/validation/index.ts`
- `web-app/src/components/features/validation/panels.test.tsx`
- `web-app/src/stores/demo.ts` (add mock nomination data)
- `web-app/src/i18n/index.ts` (add roster translations)

## Design Decisions

1. **Shared Component**: `RosterVerificationPanel` is shared between home/away panels to avoid duplication
2. **Local State for Modifications**: Track added/removed players in component state, not in server state, until explicitly saved
3. **Demo Mode First**: Implement with mock data before API integration for testing
4. **AddPlayerSheet Stubbed**: The "Add Player" button will show a placeholder/toast until issue #36 is implemented
5. **No Swipe Gestures Yet**: Follow-up enhancement mentioned in issue - focus on tap/click interaction first
6. **Accessibility**: Keyboard navigable list with proper ARIA labels for remove actions

## API Integration Notes

The component will need access to:
1. `NominationList` from game details (already loaded in Assignment context)
2. Future: `getPossibleIndoorPlayerNominations` for adding players (issue #36)
3. Future: `updateNominationList` for saving changes

For this issue, we focus on **display and local modifications**. API mutations will be handled when the parent modal submits all validation changes.

## Dependencies

- Issue #34 (tabbed modal shell) - ✅ Complete
- Issue #36 (AddPlayerSheet) - Will be stubbed/placeholder

## Out of Scope

- Swipe gestures for removal (mentioned as future enhancement)
- Actual API mutations (save changes to server)
- Coach display/editing (separate UI section in nomination list)
- Validation issue display (warnings about player eligibility)

## Styling Reference

Use existing project patterns:
- Primary action buttons: `bg-blue-600 hover:bg-blue-700`
- Danger/remove buttons: `bg-red-600 hover:bg-red-700` or `text-red-600`
- Badge styling: `px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700`
- List items: `border-b border-gray-100 dark:border-gray-700`
- Strikethrough: `line-through text-gray-400 dark:text-gray-500`
- New badge: `bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
