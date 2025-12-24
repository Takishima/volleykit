import { useCallback, useEffect, useRef, useState } from "react";
import type { GameExchange } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { useModalDismissal } from "@/hooks/useModalDismissal";
import { logger } from "@/utils/logger";
import { formatDateTime } from "@/utils/date-helpers";
import { ModalErrorBoundary } from "@/components/ui/ModalErrorBoundary";

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

  const { handleBackdropClick } = useModalDismissal({
    isOpen,
    onClose,
  });

  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const ignoreRef = useRef(false);

  useEffect(() => {
    ignoreRef.current = false;
    return () => {
      ignoreRef.current = true;
    };
  }, []);

  const handleConfirm = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await onConfirm();
    } catch (error) {
      logger.error(
        "[ExchangeConfirmationModal] Failed to confirm action:",
        error,
      );
      if (!ignoreRef.current) {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
      return;
    }

    if (!ignoreRef.current) {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      onClose();
    }
  }, [onConfirm, onClose]);

  if (!isOpen) return null;

  const game = exchange.refereeGame?.game;
  const homeTeam = game?.encounter?.teamHome?.name || t("common.tbd");
  const awayTeam = game?.encounter?.teamAway?.name || t("common.tbd");
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
        className="bg-surface-card dark:bg-surface-card-dark rounded-lg shadow-xl max-w-md w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
      >
        <ModalErrorBoundary modalName="ExchangeConfirmationModal" onClose={onClose}>
          <h2
            id={modalTitleId}
            className="text-xl font-semibold text-text-primary dark:text-text-primary-dark mb-4"
          >
            {t(titleKey)}
          </h2>

          <div className="mb-6 space-y-3">
            <div>
              <div className="text-sm font-medium text-text-muted dark:text-text-muted-dark">
                {t("common.match")}
              </div>
              <div className="text-base text-text-primary dark:text-text-primary-dark font-medium">
                {homeTeam} {t("common.vs")} {awayTeam}
              </div>
            </div>

            {dateTime && (
              <div>
                <div className="text-sm font-medium text-text-muted dark:text-text-muted-dark">
                  {t("common.dateTime")}
                </div>
                <div className="text-base text-text-primary dark:text-text-primary-dark">
                  {formatDateTime(dateTime)}
                </div>
              </div>
            )}

            {location && (
              <div>
                <div className="text-sm font-medium text-text-muted dark:text-text-muted-dark">
                  {t("common.location")}
                </div>
                <div className="text-base text-text-primary dark:text-text-primary-dark">
                  {location}
                </div>
              </div>
            )}

            {position && (
              <div>
                <div className="text-sm font-medium text-text-muted dark:text-text-muted-dark">
                  {t("common.position")}
                </div>
                <div className="text-base text-text-primary dark:text-text-primary-dark">
                  {position}
                </div>
              </div>
            )}

            {level && (
              <div>
                <div className="text-sm font-medium text-text-muted dark:text-text-muted-dark">
                  {t("common.requiredLevel")}
                </div>
                <div className="text-base text-text-primary dark:text-text-primary-dark">
                  {level}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border-default dark:border-border-default-dark pt-4">
            <p className="text-sm text-text-muted dark:text-text-muted-dark mb-4">
              {t(confirmKey)}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-text-secondary dark:text-text-secondary-dark bg-surface-subtle dark:bg-surface-subtle-dark rounded-md hover:bg-surface-muted dark:hover:bg-surface-muted-dark focus:outline-none focus:ring-2 focus:ring-border-strong disabled:opacity-50 disabled:cursor-not-allowed"
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
        </ModalErrorBoundary>
      </div>
    </div>
  );
}
