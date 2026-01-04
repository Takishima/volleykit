import { useCallback, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/stores/toast";
import { t } from "@/i18n";
import { classifyError } from "@/utils/error-helpers";
import { CalendarNotFoundError } from "@/api/calendar-api";
import type { CalendarErrorType } from "@/components/features/CalendarErrorModal";

interface CalendarErrorState {
  /** Whether the error modal is open */
  isOpen: boolean;
  /** Type of error that occurred */
  errorType: CalendarErrorType;
}

interface UseCalendarErrorHandlerResult {
  /** Current error state for the modal */
  errorState: CalendarErrorState | null;
  /** Handle a calendar fetch error */
  handleError: (error: Error) => void;
  /** Acknowledge the error and perform cleanup (logout for critical errors) */
  acknowledgeError: () => Promise<void>;
  /** Log a parse warning (non-critical) */
  logParseWarning: (message: string) => void;
}

/**
 * Hook for handling calendar mode errors.
 *
 * Provides error classification and modal state management for calendar errors.
 * Critical errors (network, invalid code) trigger logout after acknowledgement.
 * Parse errors are logged but don't interrupt the user flow.
 *
 * @example
 * ```tsx
 * function CalendarPage() {
 *   const { errorState, handleError, acknowledgeError } = useCalendarErrorHandler();
 *   const { error } = useCalendarAssignments();
 *
 *   useEffect(() => {
 *     if (error) handleError(error);
 *   }, [error, handleError]);
 *
 *   return (
 *     <>
 *       {errorState && (
 *         <CalendarErrorModal
 *           isOpen={errorState.isOpen}
 *           errorType={errorState.errorType}
 *           onAcknowledge={acknowledgeError}
 *         />
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function useCalendarErrorHandler(): UseCalendarErrorHandlerResult {
  const [errorState, setErrorState] = useState<CalendarErrorState | null>(null);
  const logout = useAuthStore((state) => state.logout);

  const handleError = useCallback((error: Error) => {
    // Classify the error type
    let errorType: CalendarErrorType;

    if (error instanceof CalendarNotFoundError) {
      // Calendar code is invalid or expired
      errorType = "invalidCode";
    } else if (classifyError(error) === "network") {
      // Network-related error
      errorType = "network";
    } else {
      // Default to invalid code for other API errors
      errorType = "invalidCode";
    }

    setErrorState({
      isOpen: true,
      errorType,
    });
  }, []);

  const acknowledgeError = useCallback(async () => {
    const currentErrorType = errorState?.errorType;

    // Close the modal first
    setErrorState(null);

    // For critical errors, logout and show toast
    if (currentErrorType === "network" || currentErrorType === "invalidCode") {
      // Show toast before logout
      toast.error(t("calendarError.loggedOutToast"));

      // Logout will clear calendar code and redirect to login
      await logout();
    }
  }, [errorState, logout]);

  const logParseWarning = useCallback((message: string) => {
    // Parse errors are logged but don't show a modal
    // They result in partial data being displayed
    console.warn("[Calendar Parse Warning]", message);
  }, []);

  return {
    errorState,
    handleError,
    acknowledgeError,
    logParseWarning,
  };
}
