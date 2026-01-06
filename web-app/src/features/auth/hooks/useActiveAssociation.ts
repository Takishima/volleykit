/**
 * Hook to get the active association code from the current user session.
 */

import { useShallow } from "zustand/react/shallow";
import { useAuthStore, CALENDAR_ASSOCIATION } from "@/shared/stores/auth";

/**
 * Returns the association code of the currently active occupation.
 * Falls back to the first occupation if no active occupation is set.
 *
 * In calendar mode, returns a dummy association code (CALENDAR_ASSOCIATION)
 * to keep transport settings separate from real API login settings.
 *
 * @returns The association code (e.g., "SV", "SVRBA", "CAL") or undefined if not available
 */
export function useActiveAssociationCode(): string | undefined {
  // Use useShallow to prevent infinite re-renders from object selector
  const { user, activeOccupationId, dataSource } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      activeOccupationId: state.activeOccupationId,
      dataSource: state.dataSource,
    })),
  );

  // In calendar mode, use a dummy association so settings don't interfere
  // with real API association settings if the user logs in later
  if (dataSource === "calendar") {
    return CALENDAR_ASSOCIATION;
  }

  const activeOccupation =
    user?.occupations?.find((o) => o.id === activeOccupationId) ??
    user?.occupations?.[0];

  return activeOccupation?.associationCode;
}
