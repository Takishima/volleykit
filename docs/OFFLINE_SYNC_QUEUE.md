# Offline Sync Queue - Implementation Plan

> **Status**: Proposal
> **Created**: 2026-01-29
> **Applies to**: Web App (PWA) and Mobile App

## Problem Statement

Mutations fail immediately if the user is offline - there is no queuing mechanism. A referee validating a game or taking over an exchange while traveling could lose their work if the connection drops.

**Current behavior:**

- Mobile: Has network detection and UI blockers, but mutations still fail
- Web (PWA): No network detection at all, mutations fail silently

**Desired behavior:**

- Queue mutations when offline
- Sync automatically when back online
- Handle conflicts gracefully (e.g., exchange already taken)
- Show clear UI feedback for pending operations

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Architecture                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐     ┌─────────────────┐     ┌───────────────┐ │
│  │   UI Layer      │     │   Sync Engine   │     │   Storage     │ │
│  │                 │     │                 │     │               │ │
│  │ SyncStatusBar   │◄────│ SyncQueue       │◄────│ Web: IndexedDB│ │
│  │ PendingBadge    │     │ ConflictResolver│     │ Mobile: Async │ │
│  │ SyncResultModal │     │ NetworkMonitor  │     │   Storage     │ │
│  └────────┬────────┘     └────────┬────────┘     └───────────────┘ │
│           │                       │                                 │
│           ▼                       ▼                                 │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    Mutation Hooks                               ││
│  │  useApplyForExchange() → useOfflineMutation(applyForExchange)   ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Offline Detection

| Platform      | Current State      | Detection Method                                                                     |
| ------------- | ------------------ | ------------------------------------------------------------------------------------ |
| **Mobile**    | ✅ Implemented     | `@react-native-community/netinfo` at `packages/mobile/src/hooks/useNetworkStatus.ts` |
| **Web (PWA)** | ❌ Not implemented | Need `navigator.onLine` + `online`/`offline` events                                  |

### Web Implementation Required

```typescript
// web-app/src/hooks/useNetworkStatus.ts
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isConnected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isKnown: typeof navigator !== 'undefined',
    type: 'unknown',
  }))

  useEffect(() => {
    const handleOnline = () => setStatus((prev) => ({ ...prev, isConnected: true }))
    const handleOffline = () => setStatus((prev) => ({ ...prev, isConnected: false, type: 'none' }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return status
}
```

**Note**: `navigator.onLine` only detects network connection, not actual internet reachability. Consider adding a heartbeat check on reconnection for reliability.

---

## Mutation Types and Deduplication

| Mutation                              | Idempotent? | Strategy        | Opposing Operation     |
| ------------------------------------- | ----------- | --------------- | ---------------------- |
| `applyForExchange(exchangeId)`        | Yes         | **Deduplicate** | `withdrawFromExchange` |
| `withdrawFromExchange(exchangeId)`    | Yes         | **Deduplicate** | `applyForExchange`     |
| `addToExchange(assignmentId, reason)` | Mostly      | **Replace**     | -                      |
| `updateCompensation(id, data)`        | No          | **Replace**     | -                      |

### Deduplication Strategies

**1. `deduplicate`** - For idempotent actions

```
Queue: [applyForExchange(game-123), applyForExchange(game-123)]
Result: [applyForExchange(game-123)]  // Keep first, ignore duplicate
```

**2. `replace`** - For actions where latest value wins

```
Queue: [updateCompensation(comp-1, {km: 50}), updateCompensation(comp-1, {km: 60})]
Result: [updateCompensation(comp-1, {km: 60})]  // Keep latest only
```

**3. Opposing operations cancel out**

```
Queue: [applyForExchange(game-123), withdrawFromExchange(game-123)]
Result: []  // They cancel out - net effect is nothing
```

---

## Conflict Handling

### Scenario: Exchange Already Taken

```
Timeline:
─────────────────────────────────────────────────────────────
User A (offline)         Server              User B (online)
─────────────────────────────────────────────────────────────
Sees exchange open
Taps "Take Over" ────┐
  [queued locally]   │
                     │   Exchange is open
                     │                      Taps "Take Over"
                     │   ←───────────────── applyForExchange()
                     │   Exchange → applied (User B wins)
                     │
Goes back online     │
Sync starts ─────────┘
                     │
                     └──→ applyForExchange()
                          ❌ 409: Already taken!
```

### Conflict Types

| Conflict Reason     | HTTP Status | Description                       |
| ------------------- | ----------- | --------------------------------- |
| `already_taken`     | 409         | Another user completed the action |
| `not_found`         | 404         | Entity was deleted or cancelled   |
| `expired`           | 400         | Time window closed                |
| `permission_denied` | 403         | User no longer has access         |
| `unknown`           | Other       | Unrecognized error                |

### Error Classification

| Error Type                | Retryable? | Action                            |
| ------------------------- | ---------- | --------------------------------- |
| Network error (no status) | Yes        | Keep in queue, retry later        |
| 5xx Server error          | Yes        | Keep in queue, retry with backoff |
| 429 Rate limited          | Yes        | Keep in queue, retry after delay  |
| 400/404/409 Conflict      | No         | Remove from queue, notify user    |

---

## UI Visualization

### 1. Sync Status Indicator (Header)

```
✓ Synced                    (all good - green, hidden)
↻ 2 pending                 (queued items - amber, with count)
⚠ Offline - 2 pending       (offline with queue - amber/red)
✗ Sync failed               (retry needed - red, tappable)
```

### 2. Inline Item Status (On Cards)

```tsx
<ExchangeCard>
  <Badge variant="pending">Pending sync</Badge>
  ...
</ExchangeCard>
```

### 3. Sync Results Modal

```
┌─────────────────────────────────────────────────┐
│  ⚠️  Couldn't take over game                    │
│                                                 │
│  "HC Luzern vs VBC Steinhausen"                 │
│  Sat, Feb 15 at 14:00                           │
│                                                 │
│  This game was taken by another referee         │
│  while you were offline.                        │
│                                                 │
│  [View Other Exchanges]        [Dismiss]        │
└─────────────────────────────────────────────────┘
```

### 4. Toast Notifications

- "Saved offline - will sync when connected"
- "Back online - syncing 2 changes..."
- "All changes synced ✓"

---

## Implementation Phases

### Phase 1: Core Sync Queue Infrastructure (Shared)

**Files to create:**

```
packages/shared/src/sync/
├── types.ts                 # Type definitions
├── queue.ts                 # Queue logic (add, remove, deduplicate)
├── conflictResolver.ts      # Conflict detection and resolution
├── syncEngine.ts            # Orchestrates sync process
└── index.ts                 # Public exports
```

#### `types.ts`

```typescript
export type MutationType =
  | 'applyForExchange'
  | 'withdrawFromExchange'
  | 'addToExchange'
  | 'updateCompensation'

export type DeduplicationStrategy = 'deduplicate' | 'replace'

export type SyncItemStatus = 'pending' | 'syncing' | 'success' | 'conflict' | 'error'

export type ConflictReason =
  | 'already_taken'
  | 'not_found'
  | 'expired'
  | 'permission_denied'
  | 'unknown'

export interface SyncQueueItem {
  id: string
  type: MutationType
  entityId: string
  payload: unknown
  timestamp: number
  status: SyncItemStatus
  retryCount: number
  displayLabel: string
  entityLabel?: string // e.g., "HC Luzern vs VBC Steinhausen"
}

export interface SyncResult {
  item: SyncQueueItem
  status: 'success' | 'conflict' | 'error'
  conflictReason?: ConflictReason
  serverResponse?: unknown
  error?: Error
}

export interface SyncQueueState {
  items: SyncQueueItem[]
  isSyncing: boolean
  lastSyncAt: number | null
  lastSyncResults: SyncResult[]
}

export interface SyncStorageAdapter {
  load(): Promise<SyncQueueItem[]>
  save(items: SyncQueueItem[]): Promise<void>
  clear(): Promise<void>
}

export interface NetworkStatus {
  isConnected: boolean
  isKnown: boolean
  type: 'wifi' | 'cellular' | 'none' | 'unknown'
}
```

#### `queue.ts`

```typescript
import type { SyncQueueItem, MutationType, DeduplicationStrategy } from './types'

const MUTATION_CONFIG: Record<
  MutationType,
  {
    strategy: DeduplicationStrategy
    opposingType?: MutationType
  }
> = {
  applyForExchange: { strategy: 'deduplicate', opposingType: 'withdrawFromExchange' },
  withdrawFromExchange: { strategy: 'deduplicate', opposingType: 'applyForExchange' },
  addToExchange: { strategy: 'replace' },
  updateCompensation: { strategy: 'replace' },
}

export function addToQueue(item: SyncQueueItem, queue: SyncQueueItem[]): SyncQueueItem[] {
  const config = MUTATION_CONFIG[item.type]

  // Check for opposing operations that cancel out
  const opposingIndex = queue.findIndex(
    (q) => q.entityId === item.entityId && q.type === config.opposingType
  )

  if (opposingIndex !== -1) {
    return queue.filter((_, i) => i !== opposingIndex)
  }

  // Find existing item of same type + entity
  const existingIndex = queue.findIndex((q) => q.entityId === item.entityId && q.type === item.type)

  if (existingIndex !== -1) {
    if (config.strategy === 'deduplicate') {
      return queue // Already queued, skip
    }
    // Replace strategy
    return [...queue.filter((_, i) => i !== existingIndex), item]
  }

  return [...queue, item]
}

export function removeFromQueue(itemId: string, queue: SyncQueueItem[]): SyncQueueItem[] {
  return queue.filter((item) => item.id !== itemId)
}

export function getPendingItems(queue: SyncQueueItem[]): SyncQueueItem[] {
  return queue.filter((item) => item.status === 'pending')
}

export function generateItemId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
```

#### `conflictResolver.ts`

```typescript
import type { ConflictReason, MutationType } from './types'

export function categorizeConflict(
  error: Error & { status?: number },
  mutationType: MutationType
): ConflictReason {
  const message = error.message?.toLowerCase() ?? ''
  const status = error.status

  if (status === 404) return 'not_found'
  if (status === 403) return 'permission_denied'

  if (mutationType === 'applyForExchange') {
    if (message.includes('already') || message.includes('taken') || status === 409) {
      return 'already_taken'
    }
    if (message.includes('closed') || message.includes('expired')) {
      return 'expired'
    }
  }

  return 'unknown'
}

export function isRetryableError(error: Error & { status?: number }): boolean {
  const status = error.status
  if (!status) return true // Network error
  if (status >= 500) return true // Server error
  if (status === 429) return true // Rate limited
  return false
}

export function isConflictError(error: Error & { status?: number }): boolean {
  const status = error.status
  return status === 400 || status === 404 || status === 409
}
```

#### `syncEngine.ts`

```typescript
import type { SyncQueueItem, SyncResult, SyncStorageAdapter, NetworkStatus } from './types'
import { removeFromQueue, getPendingItems } from './queue'
import { categorizeConflict, isRetryableError, isConflictError } from './conflictResolver'

export interface SyncEngineConfig {
  storage: SyncStorageAdapter
  executors: Record<string, (item: SyncQueueItem) => Promise<unknown>>
  onSyncStart?: () => void
  onSyncComplete?: (results: SyncResult[]) => void
  onItemProcessed?: (result: SyncResult) => void
  maxRetries?: number
}

export class SyncEngine {
  private queue: SyncQueueItem[] = []
  private isSyncing = false
  private config: SyncEngineConfig

  constructor(config: SyncEngineConfig) {
    this.config = { maxRetries: 3, ...config }
  }

  async initialize(): Promise<void> {
    this.queue = await this.config.storage.load()
  }

  async addItem(item: SyncQueueItem): Promise<void> {
    const { addToQueue } = await import('./queue')
    this.queue = addToQueue(item, this.queue)
    await this.config.storage.save(this.queue)
  }

  getQueue(): SyncQueueItem[] {
    return [...this.queue]
  }

  getPendingCount(): number {
    return getPendingItems(this.queue).length
  }

  async sync(networkStatus: NetworkStatus): Promise<SyncResult[]> {
    if (!networkStatus.isConnected || this.isSyncing) {
      return []
    }

    const pending = getPendingItems(this.queue)
    if (pending.length === 0) return []

    this.isSyncing = true
    this.config.onSyncStart?.()

    const results: SyncResult[] = []

    for (const item of pending) {
      const result = await this.processItem(item)
      results.push(result)
      this.config.onItemProcessed?.(result)

      if (result.status === 'success' || result.status === 'conflict') {
        this.queue = removeFromQueue(item.id, this.queue)
      } else if (result.status === 'error') {
        const updatedItem = { ...item, retryCount: item.retryCount + 1 }
        if (updatedItem.retryCount >= (this.config.maxRetries ?? 3)) {
          this.queue = removeFromQueue(item.id, this.queue)
        } else {
          this.queue = this.queue.map((q) => (q.id === item.id ? updatedItem : q))
        }
      }
    }

    await this.config.storage.save(this.queue)
    this.isSyncing = false
    this.config.onSyncComplete?.(results)

    return results
  }

  private async processItem(item: SyncQueueItem): Promise<SyncResult> {
    const executor = this.config.executors[item.type]
    if (!executor) {
      return { item, status: 'error', error: new Error(`No executor for ${item.type}`) }
    }

    try {
      const response = await executor(item)
      return { item, status: 'success', serverResponse: response }
    } catch (error) {
      const err = error as Error & { status?: number }

      if (isConflictError(err)) {
        return {
          item,
          status: 'conflict',
          conflictReason: categorizeConflict(err, item.type),
          error: err,
        }
      }

      if (isRetryableError(err)) {
        return { item, status: 'error', error: err }
      }

      return { item, status: 'conflict', conflictReason: 'unknown', error: err }
    }
  }

  async clearQueue(): Promise<void> {
    this.queue = []
    await this.config.storage.clear()
  }
}
```

---

### Phase 2: Platform-Specific Storage Adapters

#### Web App (IndexedDB)

**File:** `web-app/src/services/syncStorage.ts`

```typescript
import type { SyncQueueItem, SyncStorageAdapter } from '@volleykit/shared/sync'

const DB_NAME = 'volleykit-sync'
const STORE_NAME = 'queue'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

export const webSyncStorage: SyncStorageAdapter = {
  async load(): Promise<SyncQueueItem[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result ?? [])
    })
  },

  async save(items: SyncQueueItem[]): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    store.clear()
    for (const item of items) {
      store.add(item)
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  },

  async clear(): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  },
}
```

#### Mobile App (AsyncStorage)

**File:** `packages/mobile/src/services/syncStorage.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SyncQueueItem, SyncStorageAdapter } from '@volleykit/shared/sync'

const STORAGE_KEY = 'volleykit-sync-queue'

export const mobileSyncStorage: SyncStorageAdapter = {
  async load(): Promise<SyncQueueItem[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  },

  async save(items: SyncQueueItem[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY)
  },
}
```

---

### Phase 3: Network Status Detection (Web)

**File:** `web-app/src/hooks/useNetworkStatus.ts`

```typescript
import { useState, useEffect } from 'react'
import type { NetworkStatus } from '@volleykit/shared/sync'

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isConnected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isKnown: typeof navigator !== 'undefined',
    type: 'unknown',
  }))

  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isConnected: true, isKnown: true }))
    }

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isConnected: false, isKnown: true, type: 'none' }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return status
}

export function useIsOnline(): boolean {
  const { isConnected } = useNetworkStatus()
  return isConnected
}

// Optional: verify actual connectivity with a lightweight ping
export async function verifyConnectivity(pingUrl?: string): Promise<boolean> {
  try {
    const url = pingUrl ?? '/api/health'
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch {
    return false
  }
}
```

---

### Phase 4: Mutation Integration

#### Zustand Store

**File:** `packages/shared/src/stores/sync.ts`

```typescript
import { create } from 'zustand'
import type { SyncQueueItem, SyncResult, SyncQueueState } from '../sync/types'

interface SyncStore extends SyncQueueState {
  addItem: (item: SyncQueueItem) => void
  removeItem: (id: string) => void
  setItems: (items: SyncQueueItem[]) => void
  setSyncing: (isSyncing: boolean) => void
  setLastSyncResults: (results: SyncResult[]) => void
  clearResults: () => void
}

export const useSyncStore = create<SyncStore>((set) => ({
  items: [],
  isSyncing: false,
  lastSyncAt: null,
  lastSyncResults: [],

  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),

  setItems: (items) => set({ items }),

  setSyncing: (isSyncing) => set({ isSyncing }),

  setLastSyncResults: (results) =>
    set({
      lastSyncResults: results,
      lastSyncAt: Date.now(),
    }),

  clearResults: () => set({ lastSyncResults: [] }),
}))
```

#### Offline-Aware Mutation Hook

**File:** `packages/shared/src/hooks/useOfflineMutation.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSyncStore } from '../stores/sync'
import { generateItemId } from '../sync/queue'
import type { SyncQueueItem, MutationType } from '../sync/types'

interface UseOfflineMutationOptions<TData, TVariables> {
  mutationType: MutationType
  mutationFn: (variables: TVariables) => Promise<TData>
  getEntityId: (variables: TVariables) => string
  getDisplayLabel: (variables: TVariables) => string
  getEntityLabel?: (variables: TVariables) => string
  onSuccess?: (data: TData, variables: TVariables) => void
  invalidateKeys?: unknown[][]
  isOnline: boolean // Injected from platform-specific hook
}

export function useOfflineMutation<TData, TVariables>({
  mutationType,
  mutationFn,
  getEntityId,
  getDisplayLabel,
  getEntityLabel,
  onSuccess,
  invalidateKeys = [],
  isOnline,
}: UseOfflineMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient()
  const addItem = useSyncStore((state) => state.addItem)

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      if (isOnline) {
        return mutationFn(variables)
      }

      // Queue for later
      const item: SyncQueueItem = {
        id: generateItemId(),
        type: mutationType,
        entityId: getEntityId(variables),
        payload: variables,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: getDisplayLabel(variables),
        entityLabel: getEntityLabel?.(variables),
      }

      addItem(item)

      // Throw special error to indicate queued
      const error = new Error('Operation queued for sync')
      ;(error as any).queued = true
      ;(error as any).queueItem = item
      throw error
    },

    onSuccess: (data, variables) => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      onSuccess?.(data, variables)
    },
  })
}
```

---

### Phase 5: UI Components

#### Sync Status Indicator

**File:** `web-app/src/shared/components/SyncStatus/SyncStatusIndicator.tsx`

```typescript
import { useSyncStore } from '@volleykit/shared/stores'
import { useIsOnline } from '@/hooks/useNetworkStatus'
import { useTranslation } from 'react-i18next'

export function SyncStatusIndicator() {
  const { t } = useTranslation()
  const isOnline = useIsOnline()
  const { items, isSyncing } = useSyncStore()
  const pendingCount = items.filter(i => i.status === 'pending').length

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {!isOnline && (
        <span className="flex items-center gap-1 text-amber-600">
          <CloudOffIcon className="h-4 w-4" />
          {t('sync.offline')}
        </span>
      )}

      {pendingCount > 0 && (
        <button
          onClick={openSyncDetails}
          className="flex items-center gap-1 text-amber-600 hover:underline"
        >
          <RefreshIcon className={isSyncing ? 'animate-spin' : ''} />
          {t('sync.pendingCount', { count: pendingCount })}
        </button>
      )}
    </div>
  )
}
```

#### Pending Sync Badge

**File:** `web-app/src/shared/components/SyncStatus/PendingSyncBadge.tsx`

```typescript
import { useSyncStore } from '@volleykit/shared/stores'
import { useTranslation } from 'react-i18next'

interface PendingSyncBadgeProps {
  entityId: string
  className?: string
}

export function PendingSyncBadge({ entityId, className }: PendingSyncBadgeProps) {
  const { t } = useTranslation()
  const items = useSyncStore((state) => state.items)

  const isPending = items.some(
    item => item.entityId === entityId && item.status === 'pending'
  )

  if (!isPending) return null

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full",
      "bg-amber-100 text-amber-800",
      className
    )}>
      <ClockIcon className="h-3 w-3" />
      {t('sync.pendingSync')}
    </span>
  )
}
```

#### Sync Results Modal

**File:** `web-app/src/shared/components/SyncStatus/SyncResultsModal.tsx`

```typescript
import { useEffect } from 'react'
import { useSyncStore } from '@volleykit/shared/stores'
import { useTranslation } from 'react-i18next'

export function SyncResultsModal() {
  const { t } = useTranslation()
  const { lastSyncResults, clearResults } = useSyncStore()

  const successes = lastSyncResults.filter(r => r.status === 'success')
  const conflicts = lastSyncResults.filter(r => r.status === 'conflict')

  // Auto-dismiss if all successful
  useEffect(() => {
    if (conflicts.length === 0 && successes.length > 0) {
      const timer = setTimeout(clearResults, 3000)
      return () => clearTimeout(timer)
    }
  }, [conflicts.length, successes.length, clearResults])

  if (lastSyncResults.length === 0) return null

  return (
    <Dialog open={lastSyncResults.length > 0} onOpenChange={() => clearResults()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('sync.resultsTitle')}</DialogTitle>
        </DialogHeader>

        {successes.length > 0 && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircleIcon />
            {t('sync.successCount', { count: successes.length })}
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangleIcon />
              {t('sync.conflictCount', { count: conflicts.length })}
            </div>

            {conflicts.map(conflict => (
              <ConflictItem key={conflict.item.id} result={conflict} />
            ))}
          </div>
        )}

        <DialogFooter>
          <Button onClick={clearResults}>{t('common.dismiss')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Testing Strategy

### Test Summary

| Category           | Location                                              | Framework    | Count    |
| ------------------ | ----------------------------------------------------- | ------------ | -------- |
| Unit - Queue Logic | `packages/shared/src/sync/__tests__/`                 | Vitest       | ~50      |
| Unit - Storage     | `web-app/src/services/__tests__/`                     | Vitest       | ~15      |
| Unit - Hooks       | `web-app/src/hooks/__tests__/`                        | Vitest       | ~15      |
| Unit - Components  | `web-app/src/shared/components/SyncStatus/__tests__/` | Vitest       | ~25      |
| Integration        | `web-app/src/features/**/*.integration.test.tsx`      | Vitest + MSW | ~15      |
| E2E                | `web-app/e2e/offline-sync.spec.ts`                    | Playwright   | ~8       |
| **Total**          |                                                       |              | **~128** |

### Unit Tests

#### `queue.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { addToQueue, removeFromQueue, getPendingItems, generateItemId } from '../queue'
import type { SyncQueueItem } from '../types'

const createItem = (overrides: Partial<SyncQueueItem> = {}): SyncQueueItem => ({
  id: generateItemId(),
  type: 'applyForExchange',
  entityId: 'exchange-123',
  payload: {},
  timestamp: Date.now(),
  status: 'pending',
  retryCount: 0,
  displayLabel: 'Take over game',
  ...overrides,
})

describe('addToQueue', () => {
  describe('deduplication strategy', () => {
    it('does not add duplicate applyForExchange for same entity', () => {
      const existing = createItem({ id: 'item-1', entityId: 'ex-1' })
      const duplicate = createItem({ id: 'item-2', entityId: 'ex-1' })

      const result = addToQueue(duplicate, [existing])

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('item-1')
    })

    it('allows applyForExchange for different entities', () => {
      const existing = createItem({ id: 'item-1', entityId: 'ex-1' })
      const different = createItem({ id: 'item-2', entityId: 'ex-2' })

      const result = addToQueue(different, [existing])

      expect(result).toHaveLength(2)
    })
  })

  describe('replace strategy', () => {
    it('replaces existing updateCompensation with newer one', () => {
      const existing = createItem({
        id: 'item-1',
        type: 'updateCompensation',
        entityId: 'comp-1',
        payload: { kilometers: 50 },
      })
      const newer = createItem({
        id: 'item-2',
        type: 'updateCompensation',
        entityId: 'comp-1',
        payload: { kilometers: 60 },
      })

      const result = addToQueue(newer, [existing])

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('item-2')
      expect(result[0].payload).toEqual({ kilometers: 60 })
    })
  })

  describe('opposing operations', () => {
    it('removes applyForExchange when withdrawFromExchange is added', () => {
      const apply = createItem({ type: 'applyForExchange', entityId: 'ex-1' })
      const withdraw = createItem({ type: 'withdrawFromExchange', entityId: 'ex-1' })

      const result = addToQueue(withdraw, [apply])

      expect(result).toHaveLength(0)
    })

    it('handles apply -> withdraw -> apply sequence correctly', () => {
      let queue: SyncQueueItem[] = []

      queue = addToQueue(createItem({ id: '1', type: 'applyForExchange', entityId: 'ex-1' }), queue)
      expect(queue).toHaveLength(1)

      queue = addToQueue(
        createItem({ id: '2', type: 'withdrawFromExchange', entityId: 'ex-1' }),
        queue
      )
      expect(queue).toHaveLength(0)

      queue = addToQueue(createItem({ id: '3', type: 'applyForExchange', entityId: 'ex-1' }), queue)
      expect(queue).toHaveLength(1)
      expect(queue[0].id).toBe('3')
    })
  })
})
```

#### `conflictResolver.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { categorizeConflict, isRetryableError, isConflictError } from '../conflictResolver'

describe('categorizeConflict', () => {
  it('returns already_taken for 409 on applyForExchange', () => {
    const error = Object.assign(new Error('Conflict'), { status: 409 })
    expect(categorizeConflict(error, 'applyForExchange')).toBe('already_taken')
  })

  it('returns not_found for 404', () => {
    const error = Object.assign(new Error('Not found'), { status: 404 })
    expect(categorizeConflict(error, 'applyForExchange')).toBe('not_found')
  })

  it('returns permission_denied for 403', () => {
    const error = Object.assign(new Error('Forbidden'), { status: 403 })
    expect(categorizeConflict(error, 'applyForExchange')).toBe('permission_denied')
  })
})

describe('isRetryableError', () => {
  it('returns true for network errors (no status)', () => {
    expect(isRetryableError(new Error('Network failed'))).toBe(true)
  })

  it('returns true for 5xx errors', () => {
    expect(isRetryableError(Object.assign(new Error(), { status: 500 }))).toBe(true)
    expect(isRetryableError(Object.assign(new Error(), { status: 503 }))).toBe(true)
  })

  it('returns false for 4xx errors', () => {
    expect(isRetryableError(Object.assign(new Error(), { status: 400 }))).toBe(false)
    expect(isRetryableError(Object.assign(new Error(), { status: 404 }))).toBe(false)
  })
})
```

#### `syncEngine.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SyncEngine } from '../syncEngine'
import type { SyncQueueItem, SyncStorageAdapter, NetworkStatus } from '../types'

const createMockStorage = (): SyncStorageAdapter => ({
  load: vi.fn().mockResolvedValue([]),
  save: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
})

const onlineStatus: NetworkStatus = { isConnected: true, isKnown: true, type: 'wifi' }
const offlineStatus: NetworkStatus = { isConnected: false, isKnown: true, type: 'none' }

describe('SyncEngine', () => {
  let storage: SyncStorageAdapter
  let executors: Record<string, vi.Mock>

  beforeEach(() => {
    storage = createMockStorage()
    executors = {
      applyForExchange: vi.fn().mockResolvedValue({ success: true }),
    }
  })

  it('does nothing when offline', async () => {
    const engine = new SyncEngine({ storage, executors })
    await engine.initialize()

    const results = await engine.sync(offlineStatus)

    expect(results).toEqual([])
  })

  it('processes pending items when online', async () => {
    vi.mocked(storage.load).mockResolvedValue([
      {
        id: 'item-1',
        type: 'applyForExchange',
        entityId: 'ex-1',
        payload: {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Test',
      },
    ])

    const engine = new SyncEngine({ storage, executors })
    await engine.initialize()

    const results = await engine.sync(onlineStatus)

    expect(results).toHaveLength(1)
    expect(results[0].status).toBe('success')
    expect(engine.getQueue()).toHaveLength(0)
  })

  it('handles conflicts by removing from queue', async () => {
    vi.mocked(storage.load).mockResolvedValue([
      {
        id: 'item-1',
        type: 'applyForExchange',
        entityId: 'ex-1',
        payload: {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Test',
      },
    ])
    executors.applyForExchange.mockRejectedValue(
      Object.assign(new Error('Already taken'), { status: 409 })
    )

    const engine = new SyncEngine({ storage, executors })
    await engine.initialize()

    const results = await engine.sync(onlineStatus)

    expect(results[0].status).toBe('conflict')
    expect(results[0].conflictReason).toBe('already_taken')
    expect(engine.getQueue()).toHaveLength(0)
  })
})
```

#### `useNetworkStatus.test.ts` (Web)

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNetworkStatus } from '../useNetworkStatus'

describe('useNetworkStatus', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      writable: true,
    })
  })

  it('returns initial online status', () => {
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current.isConnected).toBe(true)
  })

  it('updates when offline event fires', () => {
    const { result } = renderHook(() => useNetworkStatus())

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current.isConnected).toBe(false)
  })

  it('updates when online event fires', () => {
    Object.defineProperty(global.navigator, 'onLine', { value: false })
    const { result } = renderHook(() => useNetworkStatus())

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current.isConnected).toBe(true)
  })
})
```

### Integration Tests

#### `SyncFlow.integration.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server, http, HttpResponse } from '@/test/msw'
import { useSyncStore } from '@volleykit/shared/stores'

describe('Offline Sync Flow', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    useSyncStore.setState({ items: [], isSyncing: false, lastSyncResults: [] })
  })

  it('queues operation when offline and syncs when back online', async () => {
    // ... test implementation
  })

  it('shows conflict modal when exchange already taken', async () => {
    server.use(
      http.put('*/api*pickExchange*', () => {
        return new HttpResponse(null, { status: 409 })
      })
    )
    // ... test implementation
  })

  it('deduplicates same operation for same entity', async () => {
    // ... test implementation
  })
})
```

### E2E Tests

#### `offline-sync.spec.ts`

```typescript
import { test, expect } from './fixtures'

test.describe('Offline Sync', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('demo-button').click()
    await expect(page).not.toHaveURL(/login/)
  })

  test('shows offline banner when disconnected', async ({ page, context }) => {
    await page.getByRole('link', { name: /exchange/i }).click()
    await context.setOffline(true)
    await expect(page.getByText(/offline/i)).toBeVisible()
  })

  test('queues operation when offline', async ({ page, context }) => {
    await page.getByRole('link', { name: /exchange/i }).click()
    await context.setOffline(true)

    await page
      .getByRole('button', { name: /take over/i })
      .first()
      .click()
    await page.getByRole('button', { name: /confirm/i }).click()

    await expect(page.getByText(/1 pending/i)).toBeVisible()
  })

  test('syncs when back online', async ({ page, context }) => {
    await page.getByRole('link', { name: /exchange/i }).click()
    await context.setOffline(true)

    await page
      .getByRole('button', { name: /take over/i })
      .first()
      .click()
    await page.getByRole('button', { name: /confirm/i }).click()

    await context.setOffline(false)

    await expect(page.getByText(/synced/i)).toBeVisible({ timeout: 10000 })
  })

  test('persists queue across page reload', async ({ page, context }) => {
    await page.getByRole('link', { name: /exchange/i }).click()
    await context.setOffline(true)

    await page
      .getByRole('button', { name: /take over/i })
      .first()
      .click()
    await page.getByRole('button', { name: /confirm/i }).click()

    await page.reload()

    await expect(page.getByText(/1 pending/i)).toBeVisible()
  })
})
```

---

## Translations Required

Add to all locale files (`de.ts`, `en.ts`, `fr.ts`, `it.ts`):

```typescript
sync: {
  offline: 'Offline',
  pendingCount: '{{count}} pending',
  pendingCount_plural: '{{count}} pending',
  pendingSync: 'Pending sync',
  syncing: 'Syncing...',
  synced: 'Synced',
  syncFailed: 'Sync failed',

  resultsTitle: 'Sync Results',
  successCount: '{{count}} change synced',
  successCount_plural: '{{count}} changes synced',
  conflictCount: '{{count}} action couldn\'t be completed',
  conflictCount_plural: '{{count}} actions couldn\'t be completed',

  conflict: {
    already_taken: 'This game was taken by another referee while you were offline.',
    not_found: 'This item no longer exists.',
    expired: 'The time window for this action has closed.',
    permission_denied: 'You no longer have permission for this action.',
    unknown: 'An unexpected error occurred.',
  },

  savedOffline: 'Saved offline - will sync when connected',
  backOnline: 'Back online - syncing changes...',
  allSynced: 'All changes synced',
}
```

---

## File Summary

### New Files

| Path                                                               | Description              |
| ------------------------------------------------------------------ | ------------------------ |
| `packages/shared/src/sync/types.ts`                                | Type definitions         |
| `packages/shared/src/sync/queue.ts`                                | Queue manipulation logic |
| `packages/shared/src/sync/conflictResolver.ts`                     | Conflict detection       |
| `packages/shared/src/sync/syncEngine.ts`                           | Sync orchestration       |
| `packages/shared/src/sync/index.ts`                                | Public exports           |
| `packages/shared/src/stores/sync.ts`                               | Zustand store            |
| `packages/shared/src/hooks/useOfflineMutation.ts`                  | Mutation hook            |
| `web-app/src/services/syncStorage.ts`                              | IndexedDB adapter        |
| `web-app/src/hooks/useNetworkStatus.ts`                            | Network detection        |
| `web-app/src/shared/components/SyncStatus/SyncStatusIndicator.tsx` | Header indicator         |
| `web-app/src/shared/components/SyncStatus/PendingSyncBadge.tsx`    | Item badge               |
| `web-app/src/shared/components/SyncStatus/SyncResultsModal.tsx`    | Results modal            |
| `packages/mobile/src/services/syncStorage.ts`                      | AsyncStorage adapter     |

### Test Files

| Path                                                            | Tests |
| --------------------------------------------------------------- | ----- |
| `packages/shared/src/sync/__tests__/queue.test.ts`              | ~25   |
| `packages/shared/src/sync/__tests__/conflictResolver.test.ts`   | ~15   |
| `packages/shared/src/sync/__tests__/syncEngine.test.ts`         | ~20   |
| `web-app/src/hooks/__tests__/useNetworkStatus.test.ts`          | ~10   |
| `web-app/src/services/__tests__/syncStorage.test.ts`            | ~10   |
| `web-app/src/shared/components/SyncStatus/__tests__/*.test.tsx` | ~25   |
| `web-app/src/features/**/SyncFlow.integration.test.tsx`         | ~15   |
| `web-app/e2e/offline-sync.spec.ts`                              | ~8    |

---

## Implementation Order

1. **Phase 1**: Core sync queue infrastructure (shared) - Foundation
2. **Phase 2**: Storage adapters - Persistence layer
3. **Phase 3**: Network status (web) - Detection capability
4. **Phase 4**: Mutation integration - Hook into existing mutations
5. **Phase 5**: UI components - User feedback
6. **Phase 6-8**: Tests - Validation

Estimated effort: Medium-large feature (~2-3 weeks with thorough testing)
