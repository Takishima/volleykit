import { useCallback } from "react";
import { checkSafeMode } from "@/shared/utils/safe-mode-guard";
import { useAuthStore } from "@/shared/stores/auth";
import { useSettingsStore } from "@/shared/stores/settings";

interface SafeModeGuardParams {
  context: string;
  action: string;
  onBlocked?: () => void;
}

interface UseSafeModeGuardResult {
  /**
   * Checks if an operation should be blocked due to safe mode.
   * Returns true if blocked, false if allowed.
   *
   * @example
   * const { guard } = useSafeModeGuard();
   * if (guard({ context: "useAssignmentActions", action: "game validation" })) {
   *   return; // Operation blocked
   * }
   */
  guard: (params: SafeModeGuardParams) => boolean;
  isDemoMode: boolean;
  isSafeModeEnabled: boolean;
}

/**
 * Hook that encapsulates the safe mode checking pattern.
 * Extracts state from auth and settings stores and provides a guard function
 * that can be used to check if an operation should be blocked.
 *
 * @example
 * const { guard } = useSafeModeGuard();
 *
 * const handleAction = useCallback(() => {
 *   if (guard({ context: "MyComponent", action: "my action" })) {
 *     return;
 *   }
 *   // Proceed with action...
 * }, [guard]);
 */
export function useSafeModeGuard(): UseSafeModeGuardResult {
  const dataSource = useAuthStore((state) => state.dataSource);
  const isDemoMode = dataSource === "demo";
  const isSafeModeEnabled = useSettingsStore(
    (state) => state.isSafeModeEnabled,
  );

  const guard = useCallback(
    ({ context, action, onBlocked }: SafeModeGuardParams): boolean => {
      const isBlocked = checkSafeMode({
        isDemoMode,
        isSafeModeEnabled,
        context,
        action,
      });

      if (isBlocked && onBlocked) {
        onBlocked();
      }

      return isBlocked;
    },
    [isDemoMode, isSafeModeEnabled],
  );

  return { guard, isDemoMode, isSafeModeEnabled };
}
