import { logger } from "@/utils/logger";
import { toast } from "@/stores/toast";
import { t } from "@/i18n";

interface SafeModeGuardOptions {
  isDemoMode: boolean;
  isSafeModeEnabled: boolean;
  context: string;
}

/**
 * Checks if an operation should be blocked due to safe mode.
 * Safe mode prevents dangerous operations when accessing the real API.
 * Demo mode bypasses this check since it only uses local mock data.
 *
 * @param options - Configuration for the safe mode check
 * @returns true if the operation should be blocked, false otherwise
 *
 * @example
 * const isBlocked = checkSafeMode({
 *   isDemoMode: false,
 *   isSafeModeEnabled: true,
 *   context: "[useAssignmentActions] game validation",
 * });
 * if (isBlocked) return;
 */
export function checkSafeMode(options: SafeModeGuardOptions): boolean {
  const { isDemoMode, isSafeModeEnabled, context } = options;

  if (!isDemoMode && isSafeModeEnabled) {
    logger.debug(`${context} blocked by safe mode`);
    toast.warning(t("settings.safeModeBlocked"));
    return true;
  }

  return false;
}
