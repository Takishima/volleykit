import { useState, useCallback, useEffect, memo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Assignment, CompensationRecord } from "@/api/client";
import { getApiClient } from "@/api/client";
import { queryKeys } from "@/api/queryKeys";
import { COMPENSATION_LOOKUP_LIMIT } from "@/shared/hooks/usePaginatedQuery";
import { useTranslation } from "@/shared/hooks/useTranslation";
import {
  useUpdateCompensation,
  useUpdateAssignmentCompensation,
  COMPENSATION_ERROR_KEYS,
  type CompensationErrorKey,
} from "@/features/validation/hooks/useConvocations";
import { logger } from "@/shared/utils/logger";
import {
  getTeamNames,
  getTeamNamesFromCompensation,
} from "@/features/assignments/utils/assignment-helpers";
import {
  DECIMAL_INPUT_PATTERN,
  formatDistanceKm,
  kilometresToMetres,
  parseLocalizedNumber,
} from "@/shared/utils/distance";
import { useAuthStore } from "@/shared/stores/auth";
import { useDemoStore } from "@/shared/stores/demo";
import { Modal } from "@/shared/components/Modal";
import { ModalHeader } from "@/shared/components/ModalHeader";
import { ModalFooter } from "@/shared/components/ModalFooter";
import { ModalErrorBoundary } from "@/shared/components/ModalErrorBoundary";
import { Button } from "@/shared/components/Button";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";

interface EditCompensationModalProps {
  assignment?: Assignment;
  compensation?: CompensationRecord;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Searches cached compensation queries to find a compensation matching the game number.
 */
function findCompensationInCache(
  gameNumber: number,
  queryClient: ReturnType<typeof useQueryClient>,
): CompensationRecord | null {
  const queries = queryClient.getQueriesData<{ items: CompensationRecord[] }>({
    queryKey: queryKeys.compensations.all,
  });

  for (const [, data] of queries) {
    const comp = data?.items?.find(
      (c) => c.refereeGame?.game?.number === gameNumber,
    );
    if (comp) {
      return comp;
    }
  }
  return null;
}

function EditCompensationModalComponent({
  assignment,
  compensation,
  isOpen,
  onClose,
}: EditCompensationModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const dataSource = useAuthStore((state) => state.dataSource);
  const getAssignmentCompensation = useDemoStore(
    (state) => state.getAssignmentCompensation,
  );
  const updateCompensationMutation = useUpdateCompensation();
  const updateAssignmentCompensationMutation = useUpdateAssignmentCompensation();

  const [kilometers, setKilometers] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ kilometers?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Determine if we're editing an assignment or a compensation record
  const isAssignmentEdit = !!assignment && !compensation;

  // Get the compensation ID from the compensation record
  // Assignments don't have convocationCompensation, only CompensationRecord does
  const compensationId = compensation?.convocationCompensation?.__identity;

  // Fetch detailed compensation data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // For assignment edits in demo mode, load from stored assignment compensations
    if (isAssignmentEdit && dataSource === "demo" && assignment) {
      const storedData = getAssignmentCompensation(assignment.__identity);
      if (storedData) {
        if (storedData.distanceInMetres !== undefined && storedData.distanceInMetres > 0) {
          setKilometers(formatDistanceKm(storedData.distanceInMetres));
        }
        if (storedData.correctionReason) {
          setReason(storedData.correctionReason);
        }
        logger.debug(
          "[EditCompensationModal] Loaded assignment compensation from store:",
          storedData,
        );
      }
      return;
    }

    // For assignment edits in production/calendar mode, find compensation by game number
    if (isAssignmentEdit && dataSource !== "demo" && assignment) {
      const gameNumber = assignment.refereeGame?.game?.number;
      if (!gameNumber) {
        logger.debug(
          "[EditCompensationModal] Assignment has no game number, cannot fetch compensation",
        );
        return;
      }

      let cancelled = false;

      const fetchDetailsForAssignment = async () => {
        setIsLoading(true);
        setFetchError(null);
        const apiClient = getApiClient(dataSource);

        try {
          // Try to find compensation in cache first
          let foundCompensationId = findCompensationInCache(gameNumber, queryClient)
            ?.convocationCompensation?.__identity;

          // If not in cache, fetch compensations from API
          if (!foundCompensationId) {
            const compensations = await apiClient.searchCompensations({
              limit: COMPENSATION_LOOKUP_LIMIT,
            });
            if (cancelled) return;

            const matchingComp = compensations.items.find(
              (c) => c.refereeGame?.game?.number === gameNumber,
            );
            foundCompensationId = matchingComp?.convocationCompensation?.__identity;
          }

          if (!foundCompensationId) {
            // No compensation found for this assignment - this is OK for future games
            // that haven't had compensation recorded yet
            logger.debug(
              "[EditCompensationModal] No compensation found for game number:",
              gameNumber,
            );
            return;
          }

          // Fetch detailed compensation data
          const details = await apiClient.getCompensationDetails(foundCompensationId);
          if (cancelled) return;

          const distanceInMetres =
            details.convocationCompensation?.distanceInMetres;
          if (distanceInMetres !== undefined && distanceInMetres > 0) {
            setKilometers(formatDistanceKm(distanceInMetres));
          }

          const existingReason =
            details.convocationCompensation?.correctionReason;
          if (existingReason) {
            setReason(existingReason);
          }

          logger.debug(
            "[EditCompensationModal] Loaded compensation details for assignment:",
            details,
          );
        } catch (error) {
          if (cancelled) return;

          logger.error(
            "[EditCompensationModal] Failed to fetch compensation details for assignment:",
            error,
          );
          const errorMessage = error instanceof Error ? error.message : "";
          const knownErrorKeys = Object.values(COMPENSATION_ERROR_KEYS);
          const isKnownErrorKey = knownErrorKeys.includes(errorMessage as CompensationErrorKey);
          setFetchError(
            isKnownErrorKey
              ? t(errorMessage as CompensationErrorKey)
              : (errorMessage || t("assignments.failedToLoadData")),
          );
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      };

      fetchDetailsForAssignment();
      return () => {
        cancelled = true;
      };
    }

    // For compensation record edits, fetch from API using the compensation ID directly
    if (!compensationId) return;

    let cancelled = false;

    const fetchDetails = async () => {
      setIsLoading(true);
      setFetchError(null);
      const apiClient = getApiClient(dataSource);

      try {
        const details = await apiClient.getCompensationDetails(compensationId);
        if (cancelled) return;

        // Pre-fill form with existing values
        const distanceInMetres =
          details.convocationCompensation?.distanceInMetres;
        if (distanceInMetres !== undefined && distanceInMetres > 0) {
          setKilometers(formatDistanceKm(distanceInMetres));
        }

        const existingReason =
          details.convocationCompensation?.correctionReason;
        if (existingReason) {
          setReason(existingReason);
        }

        logger.debug(
          "[EditCompensationModal] Loaded compensation details:",
          details,
        );
      } catch (error) {
        if (cancelled) return;

        logger.error(
          "[EditCompensationModal] Failed to fetch compensation details:",
          error,
        );
        // Check if error message is a known i18n key and translate it
        const errorMessage = error instanceof Error ? error.message : "";
        const knownErrorKeys = Object.values(COMPENSATION_ERROR_KEYS);
        const isKnownErrorKey = knownErrorKeys.includes(errorMessage as CompensationErrorKey);
        setFetchError(
          isKnownErrorKey
            ? t(errorMessage as CompensationErrorKey)
            : (errorMessage || t("assignments.failedToLoadData")),
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [isOpen, compensationId, dataSource, isAssignmentEdit, assignment, getAssignmentCompensation, queryClient, t]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setKilometers("");
      setReason("");
      setErrors({});
      setFetchError(null);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});

      const km = parseLocalizedNumber(kilometers);
      if (kilometers && (isNaN(km) || km < 0)) {
        setErrors({ kilometers: t("assignments.invalidKilometers") });
        return;
      }

      const updateData: { distanceInMetres?: number; correctionReason?: string } = {};

      if (kilometers) {
        updateData.distanceInMetres = kilometresToMetres(km);
      }
      if (reason) {
        updateData.correctionReason = reason;
      }

      if (Object.keys(updateData).length > 0) {
        if (isAssignmentEdit && assignment) {
          // Use assignment-specific mutation for assignments
          updateAssignmentCompensationMutation.mutate(
            { assignmentId: assignment.__identity, data: updateData },
            {
              onSuccess: () => {
                logger.debug(
                  "[EditCompensationModal] Updated assignment compensation:",
                  { assignmentId: assignment.__identity, ...updateData },
                );
              },
            },
          );
        } else if (compensationId) {
          // Use compensation mutation for compensation records
          updateCompensationMutation.mutate(
            { compensationId, data: updateData },
            {
              onSuccess: () => {
                logger.debug(
                  "[EditCompensationModal] Updated compensation:",
                  { compensationId, ...updateData },
                );
              },
            },
          );
        }
      }

      onClose();
    },
    [
      assignment,
      compensationId,
      kilometers,
      reason,
      isAssignmentEdit,
      updateAssignmentCompensationMutation,
      updateCompensationMutation,
      onClose,
      t,
    ],
  );

  // Type safety: Ensure at least one of assignment or compensation is provided
  if (isOpen && !assignment && !compensation) {
    logger.error(
      "[EditCompensationModal] Modal opened without assignment or compensation",
    );
    return null;
  }

  let homeTeam = t("common.tbd");
  let awayTeam = t("common.tbd");

  if (assignment) {
    ({ homeTeam, awayTeam } = getTeamNames(assignment));
  } else if (compensation) {
    ({ homeTeam, awayTeam } = getTeamNamesFromCompensation(compensation));
  }

  const modalTitleId = "edit-compensation-title";
  const subtitle = `${homeTeam} ${t("common.vs")} ${awayTeam}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titleId={modalTitleId}
      size="md"
      isLoading={isLoading}
    >
      <ModalErrorBoundary modalName="EditCompensationModal" onClose={onClose}>
        <ModalHeader
          title={t("assignments.editCompensation")}
          titleId={modalTitleId}
          subtitle={subtitle}
        />

        {isLoading ? (
          <div
            className="flex items-center justify-center py-8"
            role="status"
            aria-live="polite"
          >
            <LoadingSpinner size="md" />
          </div>
        ) : fetchError ? (
          <div className="py-6 text-center" role="alert">
            <p className="text-danger-600 dark:text-danger-400 mb-4">
              {fetchError}
            </p>
            <Button variant="secondary" onClick={onClose}>
              {t("common.close")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="kilometers"
                className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1"
              >
                {t("assignments.kilometers")}
              </label>
              <div className="relative">
                <input
                  id="kilometers"
                  type="text"
                  inputMode="decimal"
                  pattern={DECIMAL_INPUT_PATTERN}
                  value={kilometers}
                  onChange={(e) => setKilometers(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-border-strong dark:border-border-strong-dark rounded-md bg-surface-card dark:bg-surface-subtle-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-invalid={errors.kilometers ? "true" : "false"}
                  aria-describedby={
                    errors.kilometers ? "kilometers-error" : undefined
                  }
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-text-muted-dark text-sm pointer-events-none">
                  {t("common.distanceUnit")}
                </span>
              </div>
              {errors.kilometers && (
                <p
                  id="kilometers-error"
                  className="mt-1 text-sm text-danger-600 dark:text-danger-400"
                >
                  {errors.kilometers}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1"
              >
                {t("assignments.reason")}
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-border-strong dark:border-border-strong-dark rounded-md bg-surface-card dark:bg-surface-subtle-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={t("assignments.reasonPlaceholder")}
              />
            </div>

            <ModalFooter>
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                {t("common.close")}
              </Button>
              <Button variant="primary" className="flex-1" type="submit">
                {t("common.save")}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalErrorBoundary>
    </Modal>
  );
}

export const EditCompensationModal = memo(EditCompensationModalComponent);
