# Implementation Plan: Issue #34 - Tabbed Modal Shell for Game Validation

## Overview

Transform `ValidateGameModal` from a basic score-entry component into a comprehensive tabbed validation system with 4 tabs: Home Roster, Away Roster, Scorer, and Scoresheet.

## Current State

- `ValidateGameModal` (`web-app/src/components/features/ValidateGameModal.tsx`) is a simple form modal with score inputs
- No reusable Tabs component exists in `components/ui/`
- Tab pattern exists in `AssignmentsPage.tsx` but is inline and page-specific

## Implementation Steps

### Step 1: Create Reusable Tabs Component

**File**: `web-app/src/components/ui/Tabs.tsx`

Create a fully accessible, reusable Tabs component with:
- Generic tab configuration via props
- Keyboard navigation (Arrow Left/Right between tabs)
- Horizontal scroll support for overflow on mobile
- Support for badge rendering (e.g., "Optional" on Scoresheet tab)
- Dark mode support
- ARIA attributes for accessibility (`role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`)

**Props interface**:
```typescript
interface Tab {
  id: string;
  label: string;
  badge?: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  ariaLabel: string;
}
```

### Step 2: Create Tabs Component Tests

**File**: `web-app/src/components/ui/Tabs.test.tsx`

Test cases:
- Renders all tabs with correct labels
- Shows active tab styling
- Renders badge when provided
- Calls onTabChange when tab clicked
- Arrow key navigation (Left/Right cycles through tabs)
- Horizontal scroll container exists for overflow
- Proper ARIA attributes

### Step 3: Create Validation Directory Structure

Create directory: `web-app/src/components/features/validation/`

Files to create:
- `index.ts` - Re-exports all validation components
- `HomeRosterPanel.tsx` - Placeholder panel for home team roster
- `AwayRosterPanel.tsx` - Placeholder panel for away team roster
- `ScorerPanel.tsx` - Placeholder panel for scorer identification
- `ScoresheetPanel.tsx` - Placeholder panel for scoresheet upload

### Step 4: Create Placeholder Panel Components

Each panel component will:
- Accept `assignment: Assignment` prop
- Display placeholder content indicating future functionality
- Be independently testable
- Support dark mode

**Example structure** (same for all panels):
```typescript
interface PanelProps {
  assignment: Assignment;
}

export function HomeRosterPanel({ assignment }: PanelProps) {
  // Placeholder implementation
}
```

### Step 5: Create Panel Tests

**File**: `web-app/src/components/features/validation/panels.test.tsx`

Test that each panel:
- Renders without crashing
- Displays placeholder content
- Accepts assignment prop

### Step 6: Refactor ValidateGameModal

**File**: `web-app/src/components/features/ValidateGameModal.tsx`

Changes:
1. Remove all score-entry form state and logic (homeScore, awayScore, sets, errors)
2. Remove form validation logic
3. Add tab state management with 4 tabs
4. Import and use the new `Tabs` component
5. Import and conditionally render panel components based on active tab
6. Keep existing modal patterns:
   - Escape key handling
   - Backdrop click dismissal
   - ARIA attributes for modal
   - Dark mode support
7. Update modal width for tabbed content (may need `max-w-lg` or `max-w-xl`)

**Tab configuration**:
```typescript
const VALIDATION_TABS = [
  { id: 'home-roster', label: t('validation.homeRoster') },
  { id: 'away-roster', label: t('validation.awayRoster') },
  { id: 'scorer', label: t('validation.scorer') },
  { id: 'scoresheet', label: t('validation.scoresheet'), badge: t('common.optional') },
];
```

### Step 7: Add Translation Keys

**File**: `web-app/src/i18n/index.ts`

Add a new `validation` section to the `Translations` interface and all language objects (en, de, fr, it):

```typescript
// Add to Translations interface
validation: {
  homeRoster: string;
  awayRoster: string;
  scorer: string;
  scoresheet: string;
  homeRosterPlaceholder: string;
  awayRosterPlaceholder: string;
  scorerPlaceholder: string;
  scoresheetPlaceholder: string;
};

// Also add to common section
optional: string;
```

**English translations**:
```typescript
validation: {
  homeRoster: "Home Roster",
  awayRoster: "Away Roster",
  scorer: "Scorer",
  scoresheet: "Scoresheet",
  homeRosterPlaceholder: "Home team roster verification will be available here.",
  awayRosterPlaceholder: "Away team roster verification will be available here.",
  scorerPlaceholder: "Scorer identification will be available here.",
  scoresheetPlaceholder: "Scoresheet upload will be available here.",
},
// common.optional: "Optional"
```

**German, French, Italian translations** will follow the same structure with appropriate translations.

### Step 8: Update ValidateGameModal Tests

**File**: `web-app/src/components/features/ValidateGameModal.test.tsx`

Update/create tests for:
- Modal renders with tabs
- All 4 tabs are visible
- Tab switching works
- "Optional" badge shows only on Scoresheet tab
- Arrow key navigation between tabs
- Escape key closes modal
- Backdrop click closes modal
- Correct panel content displays for active tab

### Step 9: Run CI Validation

```bash
cd web-app
npm run generate:api
npm run lint
npm test
npm run build
```

## File Change Summary

### New Files
- `web-app/src/components/ui/Tabs.tsx`
- `web-app/src/components/ui/Tabs.test.tsx`
- `web-app/src/components/features/validation/index.ts`
- `web-app/src/components/features/validation/HomeRosterPanel.tsx`
- `web-app/src/components/features/validation/AwayRosterPanel.tsx`
- `web-app/src/components/features/validation/ScorerPanel.tsx`
- `web-app/src/components/features/validation/ScoresheetPanel.tsx`
- `web-app/src/components/features/validation/panels.test.tsx`

### Modified Files
- `web-app/src/components/features/ValidateGameModal.tsx`
- `web-app/src/i18n/index.ts` (add validation section to interface and all 4 language objects)

### Possibly New/Modified
- `web-app/src/components/features/ValidateGameModal.test.tsx` (create if doesn't exist)

## Design Decisions

1. **Tabs as controlled component**: The parent (ValidateGameModal) manages tab state, making the Tabs component reusable
2. **Panel components are simple**: Each panel is a placeholder - detailed implementation deferred per issue requirements
3. **Consistent styling**: Using existing orange-500 accent color from AssignmentsPage tabs
4. **Mobile-first**: Horizontal scroll for tab overflow on small screens
5. **Accessibility**: Full keyboard navigation and ARIA support

## Dependencies

- No new npm packages required
- Uses existing patterns from the codebase
