/**
 * TanStack Query key definitions
 *
 * This will be extracted from web-app/src/api/queryKeys.ts
 * Placeholder for now - implementation in Phase 2
 */

export const queryKeys = {
  assignments: {
    all: () => ['assignments'] as const,
    list: (filters?: Record<string, unknown>) => ['assignments', 'list', filters] as const,
    detail: (id: string) => ['assignments', 'detail', id] as const,
  },
  compensations: {
    all: () => ['compensations'] as const,
    list: (filters?: Record<string, unknown>) => ['compensations', 'list', filters] as const,
    detail: (id: string) => ['compensations', 'detail', id] as const,
  },
  exchanges: {
    all: () => ['exchanges'] as const,
    list: (filters?: Record<string, unknown>) => ['exchanges', 'list', filters] as const,
    detail: (id: string) => ['exchanges', 'detail', id] as const,
  },
  user: {
    profile: () => ['user', 'profile'] as const,
  },
} as const;
