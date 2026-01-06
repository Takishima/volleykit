import { createLogger } from "@/shared/utils/logger";
import { toast } from "@/shared/stores/toast";
import { t } from "@/i18n";

const log = createLogger("SafeModeGuard");

interface SafeModeGuardOptions {
  isDemoMode: boolean;
  isSafeModeEnabled: boolean;
  context: string;
  action: string;
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
 *   context: "useAssignmentActions",
 *   action: "game validation",
 * });
 * if (isBlocked) return;
 */
export function checkSafeMode(options: SafeModeGuardOptions): boolean {
  const { isDemoMode, isSafeModeEnabled, context, action } = options;

  if (!isDemoMode && isSafeModeEnabled) {
    log.debug(`[${context}] ${action} blocked by safe mode`);
    toast.warning(t("settings.safeModeBlocked"));
    return true;
  }

  return false;
}
