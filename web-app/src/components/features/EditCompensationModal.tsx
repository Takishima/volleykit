import { useState, useCallback, useEffect } from "react";
import type { Assignment, CompensationRecord } from "@/api/client";
import { getApiClient } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { useModalDismissal } from "@/hooks/useModalDismissal";
import {
  useUpdateCompensation,
  useUpdateAssignmentCompensation,
} from "@/hooks/useConvocations";
import { logger } from "@/utils/logger";
import {
  getTeamNames,
  getTeamNamesFromCompensation,
} from "@/utils/assignment-helpers";
import {
  DECIMAL_INPUT_PATTERN,
  formatDistanceKm,
  kilometresToMetres,
  parseLocalizedNumber,
} from "@/utils/distance";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";

interface EditCompensationModalProps {
  assignment?: Assignment;
  compensation?: CompensationRecord;
  isOpen: boolean;
  onClose: () => void;
}

export function EditCompensationModal({
  assignment,
  compensation,
  isOpen,
  onClose,
}: EditCompensationModalProps) {
  const { t } = useTranslation();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
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
    if (isAssignmentEdit && isDemoMode && assignment) {
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

    // For compensation record edits, fetch from API
    if (!compensationId) return;

    const fetchDetails = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const apiClient = getApiClient(isDemoMode);
        const details = await apiClient.getCompensationDetails(compensationId);

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
        logger.error(
          "[EditCompensationModal] Failed to fetch compensation details:",
          error,
        );
        setFetchError(
          error instanceof Error ? error.message : t("assignments.failedToLoadData"),
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, compensationId, isDemoMode, isAssignmentEdit, assignment, getAssignmentCompensation, t]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setKilometers("");
      setReason("");
      setErrors({});
      setFetchError(null);
    }
  }, [isOpen]);

  const { handleBackdropClick } = useModalDismissal({
    isOpen,
    onClose,
    isLoading,
  });

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

  if (!isOpen) return null;

  // Type safety: Ensure at least one of assignment or compensation is provided
  if (!assignment && !compensation) {
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

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      <div
        className="bg-surface-card dark:bg-surface-card-dark rounded-lg shadow-xl max-w-md w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-compensation-title"
      >
        <h2
          id="edit-compensation-title"
          className="text-xl font-semibold text-text-primary dark:text-text-primary-dark mb-4"
        >
          {t("assignments.editCompensation")}
        </h2>

        <div className="mb-4 text-sm text-text-muted dark:text-text-muted-dark">
          <div className="font-medium text-text-primary dark:text-text-primary-dark">
            {homeTeam} {t("common.vs")} {awayTeam}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : fetchError ? (
          <div className="py-6 text-center">
            <p className="text-danger-600 dark:text-danger-400 mb-4">
              {fetchError}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary dark:text-text-secondary-dark bg-surface-subtle dark:bg-surface-subtle-dark rounded-md hover:bg-surface-muted dark:hover:bg-surface-muted-dark focus:outline-none focus:ring-2 focus:ring-border-strong"
            >
              {t("common.close")}
            </button>
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

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-text-secondary dark:text-text-secondary-dark bg-surface-subtle dark:bg-surface-subtle-dark rounded-md hover:bg-surface-muted dark:hover:bg-surface-muted-dark focus:outline-none focus:ring-2 focus:ring-border-strong"
              >
                {t("common.close")}
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-white bg-primary-500 rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {t("common.save")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
