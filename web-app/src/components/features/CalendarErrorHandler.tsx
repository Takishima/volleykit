import { useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { useShallow } from "zustand/react/shallow";
import { queryKeys } from "@/api/queryKeys";
import { useCalendarErrorHandler } from "@/hooks/useCalendarErrorHandler";
import { CalendarErrorModal } from "./CalendarErrorModal";

interface CalendarErrorHandlerProps {
  children: ReactNode;
}

/**
 * Component that handles calendar mode errors globally.
 *
 * Watches for errors in calendar queries and shows the CalendarErrorModal
 * when a critical error occurs. The modal prompts the user to acknowledge
 * the error, which triggers logout and redirect to the login page.
 *
 * This component should wrap the protected routes to ensure calendar
 * errors are handled consistently across all pages.
 *
 * @example
 * ```tsx
 * <CalendarErrorHandler>
 *   <ProtectedRoute>
 *     <AppShell />
 *   </ProtectedRoute>
 * </CalendarErrorHandler>
 * ```
 */
export function CalendarErrorHandler({ children }: CalendarErrorHandlerProps) {
  const queryClient = useQueryClient();
  const { isCalendarMode, calendarCode } = useAuthStore(
    useShallow((state) => ({
      isCalendarMode: state.isCalendarMode(),
      calendarCode: state.calendarCode,
    })),
  );
  const { errorState, handleError, acknowledgeError } = useCalendarErrorHandler();

  // Track if we've already handled an error to prevent duplicate modals
  const hasHandledErrorRef = useRef(false);

  // Subscribe to calendar query errors
  useEffect(() => {
    if (!isCalendarMode || !calendarCode) return;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Only handle updated events with errors
      if (event.type !== "updated" || !event.query.state.error) return;

      // Only handle calendar assignment queries
      const queryKey = event.query.queryKey;
      const calendarAssignmentsKey = queryKeys.calendar.assignmentsByCode(calendarCode);

      // Check if this is a calendar assignments query
      if (!isCalendarQueryKey(queryKey, calendarAssignmentsKey)) return;

      // Prevent duplicate error handling
      if (hasHandledErrorRef.current) return;
      hasHandledErrorRef.current = true;

      // Validate that the error is actually an Error instance
      const error = event.query.state.error;
      if (error instanceof Error) {
        handleError(error);
      } else {
        // Wrap non-Error values in an Error for consistent handling
        handleError(new Error(String(error)));
      }
    });

    return () => {
      unsubscribe();
      hasHandledErrorRef.current = false;
    };
  }, [queryClient, isCalendarMode, calendarCode, handleError]);

  // Reset error handling when the user logs in again
  useEffect(() => {
    if (!isCalendarMode) {
      hasHandledErrorRef.current = false;
    }
  }, [isCalendarMode]);

  return (
    <>
      {children}
      {errorState && (
        <CalendarErrorModal
          isOpen={errorState.isOpen}
          errorType={errorState.errorType}
          onAcknowledge={acknowledgeError}
        />
      )}
    </>
  );
}

/**
 * Check if a query key matches the calendar assignments query key.
 * Uses recursive deep equality that handles varying key order in objects.
 */
function isCalendarQueryKey(
  queryKey: readonly unknown[],
  expectedKey: readonly unknown[],
): boolean {
  return deepEqual(queryKey, expectedKey);
}

/**
 * Deep equality comparison that handles arrays and objects correctly.
 * Unlike JSON.stringify, this handles objects with different key orderings.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  // Handle primitive types and null
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  // Handle objects (but not arrays)
  if (typeof a === "object" && typeof b === "object") {
    if (Array.isArray(a) || Array.isArray(b)) return false;

    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => key in bObj && deepEqual(aObj[key], bObj[key]));
  }

  return false;
}
