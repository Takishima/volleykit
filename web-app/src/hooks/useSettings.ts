import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api, type AssociationSettings, type Season } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { queryKeys } from "@/api/queryKeys";

/**
 * Hook to fetch association settings.
 * Settings include deadline hours for validation and other configuration.
 *
 * Note: Disabled in demo mode as demo data doesn't need these settings.
 * Includes activeOccupationId in the query key to refetch when switching associations.
 */
export function useAssociationSettings(): UseQueryResult<
  AssociationSettings,
  Error
> {
  const dataSource = useAuthStore((state) => state.dataSource);
  const isDemoMode = dataSource === "demo";
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId);

  return useQuery({
    queryKey: queryKeys.settings.association(activeOccupationId),
    queryFn: () => api.getAssociationSettings(),
    staleTime: 30 * 60 * 1000, // 30 minutes - settings rarely change
    enabled: !isDemoMode,
  });
}

/**
 * Hook to fetch the currently active season.
 * Used to determine date ranges for assignment queries.
 *
 * Note: Disabled in demo mode as demo data uses fixed date ranges.
 * Includes activeOccupationId in the query key to refetch when switching associations.
 */
export function useActiveSeason(): UseQueryResult<Season, Error> {
  const dataSource = useAuthStore((state) => state.dataSource);
  const isDemoMode = dataSource === "demo";
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId);

  return useQuery({
    queryKey: queryKeys.seasons.active(activeOccupationId),
    queryFn: () => api.getActiveSeason(),
    staleTime: 60 * 60 * 1000, // 1 hour - season rarely changes
    enabled: !isDemoMode,
  });
}
