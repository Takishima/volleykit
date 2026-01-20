/**
 * Tests for useExchanges hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import {
  useExchanges,
  getExchangeDisplayInfo,
  EXCHANGES_STALE_TIME_MS,
  DEFAULT_PAGE_SIZE,
  type ExchangesApiClient,
  type ExchangeStatusFilter,
} from './useExchanges';
import type { GameExchange } from '../api/validation';

/** Small delay for tests that need to wait a tick without triggering queries */
const TEST_TICK_MS = 50;

// Helper to create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useExchanges', () => {
  const mockApiClient: ExchangesApiClient = {
    searchExchanges: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch exchanges with default open status', async () => {
    const mockExchanges: GameExchange[] = [
      {
        __identity: 'exc-1',
        refereePosition: '1st Referee',
        refereeGame: {
          game: {
            gameNumber: 'G001',
            startingDateTime: '2024-06-15T14:00:00Z',
          },
        },
      } as GameExchange,
    ];

    vi.mocked(mockApiClient.searchExchanges).mockResolvedValue({
      items: mockExchanges,
      totalItemsCount: 1,
    });

    const { result } = renderHook(
      () =>
        useExchanges({
          apiClient: mockApiClient,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
    expect(mockApiClient.searchExchanges).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'open', // Default status
        sortField: 'refereeGame.game.startingDateTime',
        sortDirection: 'asc',
      })
    );
  });

  it('should filter by applied status', async () => {
    vi.mocked(mockApiClient.searchExchanges).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });

    const { result } = renderHook(
      () =>
        useExchanges({
          apiClient: mockApiClient,
          status: 'applied',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockApiClient.searchExchanges).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'applied',
      })
    );
  });

  it('should use undefined status for all filter', async () => {
    vi.mocked(mockApiClient.searchExchanges).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });

    const { result } = renderHook(
      () =>
        useExchanges({
          apiClient: mockApiClient,
          status: 'all',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockApiClient.searchExchanges).toHaveBeenCalledWith(
      expect.objectContaining({
        status: undefined,
      })
    );
  });

  it('should filter out own exchanges when hideOwn is true', async () => {
    const mockExchanges: GameExchange[] = [
      {
        __identity: 'exc-1',
        submittedByPerson: { __identity: 'user-123' },
      } as GameExchange,
      {
        __identity: 'exc-2',
        submittedByPerson: { __identity: 'user-456' },
      } as GameExchange,
    ];

    vi.mocked(mockApiClient.searchExchanges).mockResolvedValue({
      items: mockExchanges,
      totalItemsCount: 2,
    });

    const { result } = renderHook(
      () =>
        useExchanges({
          apiClient: mockApiClient,
          hideOwn: true,
          currentUserId: 'user-123',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should filter out the exchange from user-123
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].__identity).toBe('exc-2');
  });

  it('should not filter when hideOwn is false', async () => {
    const mockExchanges: GameExchange[] = [
      {
        __identity: 'exc-1',
        submittedByPerson: { __identity: 'user-123' },
      } as GameExchange,
      {
        __identity: 'exc-2',
        submittedByPerson: { __identity: 'user-456' },
      } as GameExchange,
    ];

    vi.mocked(mockApiClient.searchExchanges).mockResolvedValue({
      items: mockExchanges,
      totalItemsCount: 2,
    });

    const { result } = renderHook(
      () =>
        useExchanges({
          apiClient: mockApiClient,
          hideOwn: false,
          currentUserId: 'user-123',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
  });

  it('should not filter when currentUserId is not provided', async () => {
    const mockExchanges: GameExchange[] = [
      {
        __identity: 'exc-1',
        submittedByPerson: { __identity: 'user-123' },
      } as GameExchange,
    ];

    vi.mocked(mockApiClient.searchExchanges).mockResolvedValue({
      items: mockExchanges,
      totalItemsCount: 1,
    });

    const { result } = renderHook(
      () =>
        useExchanges({
          apiClient: mockApiClient,
          hideOwn: true,
          // No currentUserId
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
  });

  it('should not fetch when disabled', async () => {
    renderHook(
      () =>
        useExchanges({
          apiClient: mockApiClient,
          enabled: false,
        }),
      { wrapper: createWrapper() }
    );

    await new Promise((r) => setTimeout(r, TEST_TICK_MS));

    expect(mockApiClient.searchExchanges).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    vi.mocked(mockApiClient.searchExchanges).mockRejectedValue(
      new Error('Exchange API Error')
    );

    const { result } = renderHook(
      () =>
        useExchanges({
          apiClient: mockApiClient,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Exchange API Error');
  });

  it('should return empty array when items is undefined', async () => {
    vi.mocked(mockApiClient.searchExchanges).mockResolvedValue({
      items: undefined as any,
      totalItemsCount: 0,
    });

    const { result } = renderHook(
      () =>
        useExchanges({
          apiClient: mockApiClient,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });
});

describe('getExchangeDisplayInfo', () => {
  it('should extract display info from full exchange', () => {
    const exchange: GameExchange = {
      __identity: 'exc-1',
      refereePosition: '1st Referee',
      exchangeReason: 'Vacation',
      refereeGame: {
        game: {
          gameNumber: 'G001',
          startingDateTime: '2024-06-15T14:00:00Z',
          teamHome: { name: 'Home Team' },
          teamAway: { name: 'Away Team' },
          hall: { name: 'Sports Hall A' },
        },
      },
      submittedByPerson: {
        displayName: 'John Doe',
      },
    } as GameExchange;

    const info = getExchangeDisplayInfo(exchange);

    expect(info.gameNumber).toBe('G001');
    expect(info.dateTime).toBe('2024-06-15T14:00:00Z');
    expect(info.homeTeam).toBe('Home Team');
    expect(info.awayTeam).toBe('Away Team');
    expect(info.hall).toBe('Sports Hall A');
    expect(info.position).toBe('1st Referee');
    expect(info.submittedBy).toBe('John Doe');
    expect(info.reason).toBe('Vacation');
  });

  it('should provide defaults for missing data', () => {
    const exchange: GameExchange = {
      __identity: 'exc-2',
      refereePosition: '2nd Referee',
    } as GameExchange;

    const info = getExchangeDisplayInfo(exchange);

    expect(info.gameNumber).toBe('');
    expect(info.dateTime).toBeNull();
    expect(info.homeTeam).toBe('TBD');
    expect(info.awayTeam).toBe('TBD');
    expect(info.hall).toBe('TBD');
    expect(info.position).toBe('2nd Referee');
    expect(info.submittedBy).toBe('');
    expect(info.reason).toBeNull();
  });

  it('should handle missing refereeGame', () => {
    const exchange: GameExchange = {
      __identity: 'exc-3',
    } as GameExchange;

    const info = getExchangeDisplayInfo(exchange);

    expect(info.gameNumber).toBe('');
    expect(info.dateTime).toBeNull();
    expect(info.homeTeam).toBe('TBD');
    expect(info.awayTeam).toBe('TBD');
    expect(info.hall).toBe('TBD');
  });

  it('should handle missing game in refereeGame', () => {
    const exchange: GameExchange = {
      __identity: 'exc-4',
      refereeGame: {},
    } as GameExchange;

    const info = getExchangeDisplayInfo(exchange);

    expect(info.gameNumber).toBe('');
  });
});

describe('constants', () => {
  it('should export correct constants', () => {
    expect(EXCHANGES_STALE_TIME_MS).toBe(2 * 60 * 1000);
    expect(DEFAULT_PAGE_SIZE).toBe(50);
  });
});
