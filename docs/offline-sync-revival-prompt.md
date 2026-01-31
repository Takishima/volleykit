# Offline Sync Feature - Implementation Guide

## Overview

Implement offline-first functionality for VolleyKit so referees can use the app without connectivity and sync changes when back online.

## Previous Implementation (Branch: claude/offline-sync-queue-oHdHS)

A mutation queueing system was built with these components:

### Shared Package (`packages/shared/src/sync/`)
- `types.ts` - SyncQueueItem, MutationType, SyncResult types
- `syncStore.ts` - Zustand store for queue management
- `syncEngine.ts` - Processes queued items when back online
- `deduplication.ts` - Prevents duplicate/conflicting operations

### Web App
- `src/shared/hooks/useOfflineMutation.ts` - Hook wrapping mutations with offline queueing
- `src/shared/hooks/useNetworkStatus.ts` - Network connectivity detection
- `src/shared/services/syncStorage.ts` - IndexedDB persistence for queue
- `src/shared/components/sync/` - UI components (SyncStatusIndicator, PendingSyncBadge, SyncResultsModal)
- `src/contexts/SyncContext.tsx` - Provider that initializes sync engine
- Settings toggle to enable/disable offline sync in DataProtectionSection

### Integration Points
- `useExchangeActions.ts` - Used useOfflineMutation for apply/withdraw
- `useAssignmentActions.ts` - Used useOfflineMutation for addToExchange
- `App.tsx` - Wrapped protected routes with SyncProvider
- `AppShell.tsx` - Added SyncStatusIndicator to header

## Architecture

    ┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
    │ useOffline      │────▶│  SyncStore   │────▶│  IndexedDB  │
    │ Mutation Hook   │     │  (Zustand)   │     │  (persist)  │
    └─────────────────┘     └──────────────┘     └─────────────┘
                                  │
                                  ▼
                            ┌──────────────┐
                            │  SyncEngine  │ ◀── triggers on online event
                            └──────────────┘
                                  │
                                  ▼
                            ┌──────────────┐
                            │  API Client  │
                            └──────────────┘

## Core Components

### SyncStore (Zustand)

    interface SyncState {
      items: SyncQueueItem[]        // Queued operations
      isSyncing: boolean            // Currently processing?
      lastSyncAt: number | null     // Timestamp of last sync

      // Actions
      addItem: (item: SyncQueueItem) => void
      removeItem: (id: string) => void
      updateItemStatus: (id: string, status, error?) => void
      clearCompleted: () => void
    }

### SyncQueueItem

    interface SyncQueueItem {
      id: string                    // Unique ID (uuid)
      type: MutationType            // 'applyForExchange' | 'withdrawFromExchange' | 'addToExchange'
      entityId: string              // The entity being modified
      payload: unknown              // Full data needed to replay the operation
      timestamp: number             // When queued
      status: 'pending' | 'syncing' | 'completed' | 'failed'
      retryCount: number            // For exponential backoff
      displayLabel: string          // Human-readable label for UI
      error?: string                // Error message if failed
    }

### useOfflineMutation Hook

    const { execute, isExecuting, wasQueued } = useOfflineMutation(
      async (exchange: GameExchange, log) => {
        await apiClient.applyForExchange(exchange.__identity)
        queryClient.invalidateQueries({ queryKey: queryKeys.exchanges.lists() })
      },
      {
        mutationType: 'applyForExchange',
        getEntityId: (exchange) => exchange.__identity,
        getDisplayLabel: (exchange) => `${homeTeam} vs ${awayTeam}`,
        successMessage: 'exchange.applySuccess',
        errorMessage: 'exchange.applyError',
        queuedMessage: 'sync.savedOffline',
      }
    )

**Behavior:**
- **Online**: Executes immediately, shows success/error toast
- **Offline + sync enabled**: Queues operation, shows "Saved offline" toast
- **Offline + sync disabled**: Shows error toast, doesn't queue

### Deduplication Logic

    // If user applies then withdraws while offline, they cancel out
    addItem('applyForExchange', exchangeA)    // queued
    addItem('withdrawFromExchange', exchangeA) // removes the apply, nothing queued

    // Duplicate operations are ignored
    addItem('applyForExchange', exchangeA)    // queued
    addItem('applyForExchange', exchangeA)    // ignored (already pending)

### SyncEngine

Processes queue when back online with:
- Conflict detection (409 responses)
- Exponential backoff for retries
- Status updates for UI feedback

## Next Step: Offline Data Caching

To complete offline support, implement **proactive data caching** so users can view and edit data while offline:

### Background Pre-fetch

When the app loads and is online:

    // On app startup (when online):
    1. Fetch all assignments for the user
    2. Fetch compensation details for each assignment
    3. Store in IndexedDB with React Query persistence
    4. When offline, use cached data for reads
    5. Queue mutations for later sync

Implementation approach:

    // In a useEffect or background sync worker:
    async function prefetchOfflineData() {
      const assignments = await apiClient.getAssignments()

      // Prefetch compensation details for each
      await Promise.all(
        assignments.map(async (assignment) => {
          const gameNumber = assignment.refereeGame?.game?.number
          if (gameNumber) {
            const compensation = await apiClient.getCompensationDetails(...)
            // Store in React Query cache with persistence
            queryClient.setQueryData(
              queryKeys.compensations.detail(compensationId),
              compensation
            )
          }
        })
      )
    }

### Key Technical Considerations

1. **React Query Persistence** - Use `@tanstack/query-sync-storage-persister` to persist cache to IndexedDB

2. **Stale Data Handling** - When coming back online, reconcile cached data with server state

3. **Conflict Resolution** - If user edits offline data that changed on server:
   - Show conflict modal (SyncResultsModal already exists)
   - Let user choose: keep local, use server, or merge

4. **Storage Limits** - IndexedDB has limits; need strategy for what to cache

5. **Cache Invalidation** - When to refresh cached data

## Files to Reference

- `web-app/src/features/compensations/components/EditCompensationModal.tsx` - See how it fetches data
- `web-app/src/features/validation/components/ValidateGameModal.tsx` - Similar pattern
- `web-app/src/api/queryKeys.ts` - Query key structure
- `packages/shared/src/api/` - API client patterns

## Definition of Done

1. [ ] User can view assignments/compensations while offline (using cached data)
2. [ ] User can edit compensations offline (queued for sync)
3. [ ] User can validate games offline (queued for sync)
4. [ ] Clear UI indicators for offline status, cached data, pending sync items
5. [ ] Conflict resolution when syncing
6. [ ] Settings toggle to enable/disable
7. [ ] Translations in all 4 languages (de/en/fr/it)
