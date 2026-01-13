/**
 * useAssignments hook - Fetches assignment data
 *
 * This will be extracted from web-app/src/features/assignments/hooks/
 * Placeholder for now - implementation in Phase 2
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';

export interface UseAssignmentsOptions {
  enabled?: boolean;
}

export const useAssignments = (options: UseAssignmentsOptions = {}) => {
  return useQuery({
    queryKey: queryKeys.assignments.all(),
    queryFn: async () => {
      // Placeholder - will be implemented in Phase 2 (T019)
      return [];
    },
    enabled: options.enabled ?? true,
  });
};
