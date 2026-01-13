/**
 * useExchanges hook - Fetches exchange data
 *
 * This will be extracted from web-app/src/features/exchanges/hooks/
 * Placeholder for now - implementation in Phase 2
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';

export interface UseExchangesOptions {
  enabled?: boolean;
}

export const useExchanges = (options: UseExchangesOptions = {}) => {
  return useQuery({
    queryKey: queryKeys.exchanges.all(),
    queryFn: async () => {
      // Placeholder - will be implemented in Phase 2 (T021)
      return [];
    },
    enabled: options.enabled ?? true,
  });
};
