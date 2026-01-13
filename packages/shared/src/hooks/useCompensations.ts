/**
 * useCompensations hook - Fetches compensation data
 *
 * This will be extracted from web-app/src/features/compensations/hooks/
 * Placeholder for now - implementation in Phase 2
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';

export interface UseCompensationsOptions {
  enabled?: boolean;
}

export const useCompensations = (options: UseCompensationsOptions = {}) => {
  return useQuery({
    queryKey: queryKeys.compensations.all(),
    queryFn: async () => {
      // Placeholder - will be implemented in Phase 2 (T020)
      return [];
    },
    enabled: options.enabled ?? true,
  });
};
