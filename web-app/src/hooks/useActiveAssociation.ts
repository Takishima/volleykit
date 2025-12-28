/**
 * Hook to get the active association code from the current user session.
 */

import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "@/stores/auth";

/**
 * Returns the association code of the currently active occupation.
 * Falls back to the first occupation if no active occupation is set.
 *
 * @returns The association code (e.g., "SV", "SVRBA") or undefined if not available
 */
export function useActiveAssociationCode(): string | undefined {
  // Use useShallow to prevent infinite re-renders from object selector
  const { user, activeOccupationId } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      activeOccupationId: state.activeOccupationId,
    })),
  );

  const activeOccupation =
    user?.occupations?.find((o) => o.id === activeOccupationId) ??
    user?.occupations?.[0];

  return activeOccupation?.associationCode;
}
