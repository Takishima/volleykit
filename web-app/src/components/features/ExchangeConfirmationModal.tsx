import { useCallback, useEffect, useRef, useState } from "react";
import type { GameExchange } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { logger } from "@/utils/logger";
import { formatDateTime } from "@/utils/date-helpers";

interface ExchangeConfirmationModalProps {
  exchange: GameExchange;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  variant: "takeOver" | "remove";
}

export function ExchangeConfirmationModal({
  exchange,
  isOpen,
  onClose,
  onConfirm,
  variant,
}: ExchangeConfirmationModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      // Don't close modal on error - let onConfirm handle error display
      logger.error(
        "[ExchangeConfirmationModal] Failed to confirm action:",
        error,
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [onConfirm, onClose]);

  if (!isOpen) return null;

  const game = exchange.refereeGame?.game;
  const homeTeam = game?.encounter?.teamHome?.name || "TBD";
  const awayTeam = game?.encounter?.teamAway?.name || "TBD";
  const position = exchange.refereePosition;
  const level = exchange.requiredRefereeLevel;
  const location = game?.hall?.name || game?.hall?.primaryPostalAddress?.city;
  const dateTime = game?.startingDateTime;

  const titleKey =
    variant === "takeOver" ? "exchange.takeOverTitle" : "exchange.removeTitle";
  const confirmKey =
    variant === "takeOver"
      ? "exchange.takeOverConfirm"
      : "exchange.removeConfirm";
  const buttonKey =
    variant === "takeOver"
      ? "exchange.takeOverButton"
      : "exchange.removeButton";
  const buttonColorClass =
    variant === "takeOver"
      ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
      : "bg-red-600 hover:bg-red-700 focus:ring-red-500";
  const modalTitleId = `${variant}-exchange-title`;

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
        aria-labelledby={modalTitleId}
      >
        <h2
          id={modalTitleId}
          className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
        >
          {t(titleKey)}
        </h2>

        <div className="mb-6 space-y-3">
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("common.match")}
            </div>
            <div className="text-base text-gray-900 dark:text-white font-medium">
              {homeTeam} vs {awayTeam}
            </div>
          </div>

          {dateTime && (
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("common.dateTime")}
              </div>
              <div className="text-base text-gray-900 dark:text-white">
                {formatDateTime(dateTime)}
              </div>
            </div>
          )}

          {location && (
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("common.location")}
              </div>
              <div className="text-base text-gray-900 dark:text-white">
                {location}
              </div>
            </div>
          )}

          {position && (
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("common.position")}
              </div>
              <div className="text-base text-gray-900 dark:text-white">
                {position}
              </div>
            </div>
          )}

          {level && (
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("common.requiredLevel")}
              </div>
              <div className="text-base text-gray-900 dark:text-white">
                {level}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t(confirmKey)}
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className={`flex-1 px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${buttonColorClass}`}
            >
              {isSubmitting ? t("common.loading") : t(buttonKey)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
