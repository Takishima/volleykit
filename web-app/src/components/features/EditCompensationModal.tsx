import { useState, useCallback, useEffect } from "react";
import type { Assignment, CompensationRecord } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { logger } from "@/utils/logger";
import {
  getTeamNames,
  getTeamNamesFromCompensation,
} from "@/utils/assignment-helpers";
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
  const updateCompensation = useDemoStore((state) => state.updateCompensation);

  const [kilometers, setKilometers] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ kilometers?: string }>({});

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});

      const km = parseFloat(kilometers);
      if (kilometers && (isNaN(km) || km < 0)) {
        setErrors({ kilometers: "Please enter a valid positive number" });
        return;
      }

      const recordId = assignment?.__identity || compensation?.__identity;

      if (isDemoMode) {
        if (recordId && kilometers) {
          updateCompensation(recordId, {
            distanceInMetres: km * 1000,
          });
          logger.debug(
            "[EditCompensationModal] Demo mode: updated compensation:",
            {
              recordId,
              distanceInMetres: km * 1000,
            },
          );
        } else {
          logger.debug(
            "[EditCompensationModal] Demo mode: no distance provided, skipping update",
          );
        }
      } else {
        // Non-demo mode: API call would go here
        logger.debug("[EditCompensationModal] Mock submit:", {
          recordId,
          kilometers,
          reason,
        });
      }

      onClose();
    },
    [
      assignment,
      compensation,
      kilometers,
      reason,
      isDemoMode,
      updateCompensation,
      onClose,
    ],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) return null;

  // Type safety: Ensure at least one of assignment or compensation is provided
  if (!assignment && !compensation) {
    logger.error(
      "[EditCompensationModal] Modal opened without assignment or compensation",
    );
    return null;
  }

  let homeTeam = "TBD";
  let awayTeam = "TBD";

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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-compensation-title"
      >
        <h2
          id="edit-compensation-title"
          className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
        >
          {t("assignments.editCompensation")}
        </h2>

        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="font-medium text-gray-900 dark:text-white">
            {homeTeam} vs {awayTeam}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="kilometers"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t("assignments.kilometers")}
            </label>
            <input
              id="kilometers"
              type="number"
              min="0"
              step="0.1"
              value={kilometers}
              onChange={(e) => setKilometers(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-invalid={errors.kilometers ? "true" : "false"}
              aria-describedby={
                errors.kilometers ? "kilometers-error" : undefined
              }
            />
            {errors.kilometers && (
              <p
                id="kilometers-error"
                className="mt-1 text-sm text-red-600 dark:text-red-400"
              >
                {errors.kilometers}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t("assignments.reason")}
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("assignments.reasonPlaceholder")}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              {t("common.close")}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
