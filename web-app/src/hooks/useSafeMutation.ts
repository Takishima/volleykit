import { useCallback, useRef } from "react";
import { createLogger, type Logger } from "@/utils/logger";
import { toast } from "@/stores/toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useSafeModeGuard } from "./useSafeModeGuard";
import type { TranslationKey } from "@/i18n";

interface SafeMutationGuardOptions {
  /** Context for safe mode logging */
  context: string;
  /** Action description for safe mode logging */
  action: string;
}

interface UseSafeMutationOptions<TResult> {
  /** Unique key for logging context */
  logContext: string;

  /** Translation key for success toast (optional - some mutations don't show success) */
  successMessage?: TranslationKey;

  /** Translation key for error toast */
  errorMessage: TranslationKey;

  /** Safe mode guard options (optional - blocks when safe mode is enabled) */
  safeGuard?: SafeMutationGuardOptions;

  /** Skip success toast in demo mode */
  skipSuccessToastInDemoMode?: boolean;

  /** Callback on success */
  onSuccess?: (result: TResult) => void;

  /** Callback on error */
  onError?: (error: unknown) => void;
}

interface UseSafeMutationResult<TArg, TResult> {
  /** Execute the mutation with race condition protection */
  execute: (arg: TArg) => Promise<TResult | undefined>;
}

/**
 * Hook that wraps async mutation functions with common patterns:
 * - Race condition protection via useRef
 * - Try-catch with logging
 * - Toast notifications for success/error
 * - Optional safe mode guard check
 *
 * @example
 * const { execute } = useSafeMutation(
 *   async (id: string) => api.deleteItem(id),
 *   {
 *     logContext: "useItemActions",
 *     successMessage: "items.deleteSuccess",
 *     errorMessage: "items.deleteError",
 *     safeGuard: { context: "useItemActions", action: "deleting item" },
 *   }
 * );
 *
 * const handleDelete = useCallback((item) => execute(item.id), [execute]);
 */
export function useSafeMutation<TArg, TResult = void>(
  mutationFn: (arg: TArg, logger: Logger) => Promise<TResult>,
  options: UseSafeMutationOptions<TResult>,
): UseSafeMutationResult<TArg, TResult> {
  const { t } = useTranslation();
  const { guard, isDemoMode } = useSafeModeGuard();
  const isExecutingRef = useRef(false);
  const loggerRef = useRef<Logger | null>(null);

  // Lazy initialize logger to avoid creating on every render
  if (!loggerRef.current) {
    loggerRef.current = createLogger(options.logContext);
  }
  const log = loggerRef.current;

  const execute = useCallback(
    async (arg: TArg): Promise<TResult | undefined> => {
      // Safe mode guard check
      if (options.safeGuard) {
        if (guard(options.safeGuard)) {
          return undefined;
        }
      }

      // Race condition protection
      if (isExecutingRef.current) {
        log.debug("Operation already in progress, ignoring");
        return undefined;
      }

      isExecutingRef.current = true;

      try {
        const result = await mutationFn(arg, log);

        // Success toast (skip in demo mode if configured)
        if (options.successMessage) {
          const shouldShowToast =
            !options.skipSuccessToastInDemoMode || !isDemoMode;
          if (shouldShowToast) {
            toast.success(t(options.successMessage));
          }
        }

        options.onSuccess?.(result);
        return result;
      } catch (error) {
        log.error("Operation failed:", error);
        toast.error(t(options.errorMessage));
        options.onError?.(error);
        return undefined;
      } finally {
        isExecutingRef.current = false;
      }
    },
    [guard, isDemoMode, mutationFn, options, t, log],
  );

  return { execute };
}
