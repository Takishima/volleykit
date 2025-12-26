# Public Transport Support Implementation Plan

## Executive Summary

This plan details the implementation of public transport travel time filtering for the VolleyKit PWA. The feature will allow referees to filter exchange offers by travel time using Swiss public transport, leveraging the **OJP 2.0 API** via the `ojp-sdk-next` package.

## Technology Choice

**API**: OJP 2.0 at `api.opentransportdata.swiss/ojp20`
**SDK**: `ojp-sdk-next` v0.20.26 (official TypeScript SDK, handles XML internally)
**Rate Limits**: 50 req/min, 20K/day on free tier
**Auth**: Bearer token via API key from https://api-manager.opentransportdata.swiss/

---

## 1. Package Additions

### New Dependencies

```json
{
  "dependencies": {
    "ojp-sdk-next": "^0.20.26"
  }
}
```

### Environment Variables

Add to `.env.example`:
```bash
# OJP 2.0 API Key for Swiss public transport routing
# Get your key from: https://api-manager.opentransportdata.swiss/
VITE_OJP_API_KEY=your_api_key_here
```

---

## 2. New Files to Create

### Core Transport Service

| File Path | Purpose |
|-----------|---------|
| `src/services/transport/index.ts` | Public exports |
| `src/services/transport/ojp-client.ts` | OJP SDK wrapper with rate limiting |
| `src/services/transport/types.ts` | TypeScript types for travel time data |
| `src/services/transport/cache.ts` | Travel time cache management |
| `src/services/transport/mock-transport.ts` | Mock transport data for demo mode |

### Hooks

| File Path | Purpose |
|-----------|---------|
| `src/hooks/useTravelTime.ts` | Fetch travel time for a single hall |
| `src/hooks/useTravelTimeFilter.ts` | Travel time filtering on exchanges |

### Settings Components

| File Path | Purpose |
|-----------|---------|
| `src/components/features/settings/TransportSection.tsx` | Transport settings UI |

### UI Components

| File Path | Purpose |
|-----------|---------|
| `src/components/features/TravelTimeFilterToggle.tsx` | Filter toggle control |
| `src/components/features/TravelTimeBadge.tsx` | Badge showing travel time on cards |

---

## 3. Files to Modify

| File | Changes |
|------|---------|
| `src/stores/settings.ts` | Add `transportEnabled`, `TravelTimeFilter` state |
| `src/api/queryKeys.ts` | Add `travelTime` query keys |
| `src/api/mock-api.ts` | Add mock travel time endpoint |
| `src/pages/ExchangePage.tsx` | Integrate travel time filter |
| `src/components/features/ExchangeCard.tsx` | Display travel time badge |
| `src/pages/SettingsPage.tsx` | Add transport section |
| `src/i18n/types.ts` | New translation keys |
| `src/i18n/locales/*.ts` | Translations for all 4 languages |

---

## 4. Settings Store Changes

### New Types

```typescript
export interface TravelTimeFilter {
  /** Whether travel time filtering is active */
  enabled: boolean;
  /** Maximum travel time in minutes */
  maxTravelTimeMinutes: number;
  /** Timestamp when cache was last invalidated (home location change) */
  cacheInvalidatedAt: number | null;
}
```

### New State

```typescript
interface SettingsState {
  // ... existing ...

  // Transport feature toggle
  transportEnabled: boolean;
  setTransportEnabled: (enabled: boolean) => void;

  // Travel time filter
  travelTimeFilter: TravelTimeFilter;
  setTravelTimeFilterEnabled: (enabled: boolean) => void;
  setMaxTravelTimeMinutes: (minutes: number) => void;
  invalidateTravelTimeCache: () => void;
}
```

**Key behavior**: `setHomeLocation` automatically calls `invalidateTravelTimeCache()` to clear stale travel times.

---

## 5. Transport Service Architecture

### OJP Client (`ojp-client.ts`)

```typescript
import * as OJP from 'ojp-sdk-next';

const OJP_API_ENDPOINT = 'https://api.opentransportdata.swiss/ojp20';
const RATE_LIMIT_DELAY_MS = 1200; // Slightly over 1 req/sec to be safe

// Simple queue for rate limiting
let lastRequestTime = 0;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
    await new Promise(resolve =>
      setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();
}

export async function calculateTravelTime(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
  options: TravelTimeOptions = {}
): Promise<TravelTimeResult> {
  const apiKey = import.meta.env.VITE_OJP_API_KEY;
  if (!apiKey) throw new Error('OJP API key not configured');

  await waitForRateLimit();

  const request = OJP.TripRequest.initWithLatLng(
    from.latitude, from.longitude,
    to.latitude, to.longitude
  );

  const response = await request.execute(OJP_API_ENDPOINT, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  const trip = response.trips[0];
  if (!trip) throw new Error('No trip found');

  return {
    durationMinutes: Math.ceil(trip.duration / 60),
    departureTime: trip.departureTime.toISOString(),
    arrivalTime: trip.arrivalTime.toISOString(),
    transfers: trip.transfers,
    tripData: options.includeTrips ? trip : undefined,
  };
}
```

### Types (`types.ts`)

```typescript
export interface TravelTimeResult {
  durationMinutes: number;
  departureTime: string;
  arrivalTime: string;
  transfers: number;
  tripData?: unknown; // For future itinerary display
}

export interface TravelTimeOptions {
  departureTime?: Date;
  includeTrips?: boolean; // For future itinerary display
}
```

---

## 6. Caching Strategy

### TanStack Query Configuration

```typescript
export function useTravelTime(hallId: string, hallCoords: Coordinates | null) {
  const homeLocation = useSettingsStore((state) => state.homeLocation);
  const homeLocationHash = homeLocation ? hashLocation(homeLocation) : null;

  return useQuery({
    queryKey: queryKeys.travelTime.hall(hallId, homeLocationHash ?? ''),
    queryFn: () => calculateTravelTime(homeLocation!, hallCoords!),
    enabled: Boolean(homeLocation && hallCoords),

    // Long stale time - travel times don't change frequently
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    gcTime: 7 * 24 * 60 * 60 * 1000,

    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });
}
```

### Cache Hash Function

```typescript
export function hashLocation(coords: Coordinates): string {
  // Round to ~100m precision to avoid cache misses from GPS drift
  const lat = Math.round(coords.latitude * 1000) / 1000;
  const lon = Math.round(coords.longitude * 1000) / 1000;
  return `${lat},${lon}`;
}
```

### Why This Strategy?

1. **Per-hall caching**: Each sports hall has its own cache entry
2. **Home-location-aware**: Cache key includes home location hash, auto-invalidates on move
3. **Long TTL**: 7 days since public transport schedules rarely change
4. **Persistence**: Can add localStorage persistence via `@tanstack/query-sync-storage-persister`

---

## 7. Rate Limiting Approach

### Strategy: Lazy On-Demand Calculation

1. **No bulk computation**: Travel times are NOT computed for the entire list at once
2. **Queue with delay**: 1.2s minimum between requests (50/min = 0.83/sec, so 1.2s is safe)
3. **Aggressive caching**: 7-day cache survives page reloads
4. **Conservative filtering**: When travel time is unknown, include the exchange

### Implementation in Filter Hook

```typescript
export function useTravelTimeFilter(exchanges: ExchangeWithDistance[]) {
  // Get unique hall IDs
  const hallIds = [...new Set(exchanges.map(e => getHallId(e)))];

  // Batch queries (TanStack Query handles deduplication)
  const queries = useQueries({
    queries: hallIds.map(id => ({
      queryKey: queryKeys.travelTime.hall(id, homeHash),
      queryFn: () => calculateTravelTime(/* ... */),
      staleTime: CACHE_TTL,
    })),
  });

  // Build lookup and enrich exchanges
  const travelTimeMap = new Map(/* ... */);

  return exchanges.map(e => ({
    ...e,
    travelTimeMinutes: travelTimeMap.get(getHallId(e)) ?? null,
  }));
}
```

---

## 8. Demo Mode Support

### Mock Transport API

```typescript
// Realistic travel times from Zurich HB
const MOCK_TRAVEL_TIMES: Record<string, number> = {
  "hall-zurich": 15,      // Saalsporthalle
  "hall-schoenenwerd": 35, // Aarehalle
  "hall-naefels": 55,      // Lintharena
  "hall-therwil": 85,      // Basel area
  "hall-bern": 70,         // Weissenstein
};

export const mockTransportApi = {
  async getTravelTime(hallId: string): Promise<TravelTimeResult> {
    await delay(100);
    const minutes = MOCK_TRAVEL_TIMES[hallId] ?? estimateFromDistance(/*...*/);
    return { durationMinutes: minutes, /* ... */ };
  },
};
```

---

## 9. Translation Keys

### New Keys Structure

```typescript
settings.transport.title
settings.transport.description
settings.transport.enableCalculations
settings.transport.requiresHomeLocation
settings.transport.apiNotConfigured
settings.transport.maxTravelTime

exchange.filterByTravelTime
exchange.travelTime
exchange.calculatingTravelTime

common.minutesUnit  // "min"
common.hoursUnit    // "h"
```

---

## 10. UI Components

### TransportSection (Settings)

- Toggle to enable/disable transport calculations
- Shows warning if home location not set
- Shows warning if API key not configured (non-demo builds)

### TravelTimeBadge

- Displays formatted time: "45m" or "1h 15m"
- Train icon for visual clarity
- Blue color scheme (distinct from distance badge)

### TravelTimeFilterToggle

- Checkbox toggle with label
- Shows current max time when enabled
- Loading spinner while calculating

---

## 11. Implementation Phases

### Phase 1: Foundation (Day 1-2)
- [ ] Add `ojp-sdk-next` package
- [ ] Create `src/services/transport/types.ts`
- [ ] Extend settings store with transport state
- [ ] Add query keys
- [ ] Add translations (all 4 locales)

### Phase 2: Core Service (Day 3-4)
- [ ] Create OJP client with rate limiting
- [ ] Create cache utilities
- [ ] Create mock transport for demo mode
- [ ] Create `useTravelTime` hook
- [ ] Unit tests

### Phase 3: UI Components (Day 5-6)
- [ ] TransportSection settings component
- [ ] TravelTimeBadge component
- [ ] TravelTimeFilterToggle component
- [ ] Component tests

### Phase 4: Integration (Day 7-8)
- [ ] Modify ExchangePage with travel time filter
- [ ] Modify ExchangeCard with travel time badge
- [ ] Create `useTravelTimeFilter` hook
- [ ] E2E tests

### Phase 5: Polish (Day 9)
- [ ] Cache persistence (localStorage)
- [ ] CI validation
- [ ] Documentation updates

---

## 12. Future Extensibility

This architecture supports planned future features:

### Itinerary Display (Future)
- `tripData` in `TravelTimeResult` stores raw OJP response
- `TravelTimeButton` component can show detailed itinerary modal
- Use `TripInfoRequest` for additional journey details

### Arrival Time Preferences (Future)
- Add to settings store:
  ```typescript
  arrivalTimePreferences: {
    nlaAlb: 60,    // 1h before for NLA/NLB
    regional: 45,  // 45min for regional
    lower: 30,     // 30min for lower leagues
  }
  ```
- Adjust departure time in OJP request based on game league and start time

### Multi-Modal Support (Future)
- OJP 2.0 supports bike, car-sharing, e-scooter
- Can add transport mode preferences to settings

---

## Architectural Decisions

### Why OJP 2.0 + ojp-sdk-next?
1. **Official Swiss API**: Backed by opentransportdata.swiss
2. **TypeScript SDK**: Handles XML complexity internally
3. **Active development**: SDK updated February 2025
4. **Future-proof**: v1.0 deprecated, v2.0 is the standard

### Why TanStack Query for Caching?
1. Built-in cache management with stale times
2. Request deduplication across components
3. Easy localStorage persistence
4. Built-in retry with exponential backoff

### Why Toggle in Settings?
1. Privacy: Users control when external API calls are made
2. Efficiency: Disabled by default, no unnecessary API calls
3. Transparency: Users understand they're enabling external API

### Why Not Compute All at Once?
1. Rate limits: 50 halls at 50/min = 1 minute wait
2. UX: Lazy loading shows immediate results
3. Efficiency: Only compute what user actually views
4. Cache: Values persist across sessions
