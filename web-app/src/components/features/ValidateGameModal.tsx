import { useState, useCallback, useEffect } from "react";
import type { Assignment } from "@/api/client";
import { t } from "@/i18n";
import { logger } from "@/utils/logger";
import { getTeamNames } from "@/utils/assignment-helpers";

interface ValidateGameModalProps {
  assignment: Assignment;
  isOpen: boolean;
  onClose: () => void;
}

export function ValidateGameModal({
  assignment,
  isOpen,
  onClose,
}: ValidateGameModalProps) {
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [sets, setSets] = useState("");
  const [errors, setErrors] = useState<{
    homeScore?: string;
    awayScore?: string;
    sets?: string;
  }>({});

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

      const newErrors: {
        homeScore?: string;
        awayScore?: string;
        sets?: string;
      } = {};

      const home = parseInt(homeScore, 10);
      if (homeScore && (isNaN(home) || home < 0)) {
        newErrors.homeScore = "Please enter a valid positive number";
      }

      const away = parseInt(awayScore, 10);
      if (awayScore && (isNaN(away) || away < 0)) {
        newErrors.awayScore = "Please enter a valid positive number";
      }

      const numSets = parseInt(sets, 10);
      if (sets && (isNaN(numSets) || numSets < 3 || numSets > 5)) {
        newErrors.sets = "Please enter a number between 3 and 5";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      logger.debug("[ValidateGameModal] Mock submit:", {
        assignmentId: assignment.__identity,
        homeScore,
        awayScore,
        sets,
      });

      onClose();
    },
    [assignment, homeScore, awayScore, sets, onClose],
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

  const { homeTeam, awayTeam } = getTeamNames(assignment);

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
        aria-labelledby="validate-game-title"
      >
        <h2
          id="validate-game-title"
          className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
        >
          {t("assignments.validateGame")}
        </h2>

        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="font-medium text-gray-900 dark:text-white">
            {homeTeam} vs {awayTeam}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="homeScore"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {homeTeam} {t("assignments.homeScore")}
              </label>
              <input
                id="homeScore"
                type="number"
                min="0"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0"
                aria-invalid={errors.homeScore ? "true" : "false"}
                aria-describedby={
                  errors.homeScore ? "homeScore-error" : undefined
                }
              />
              {errors.homeScore && (
                <p
                  id="homeScore-error"
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {errors.homeScore}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="awayScore"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {awayTeam} {t("assignments.awayScore")}
              </label>
              <input
                id="awayScore"
                type="number"
                min="0"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0"
                aria-invalid={errors.awayScore ? "true" : "false"}
                aria-describedby={
                  errors.awayScore ? "awayScore-error" : undefined
                }
              />
              {errors.awayScore && (
                <p
                  id="awayScore-error"
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {errors.awayScore}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="sets"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t("assignments.numberOfSets")}
            </label>
            <input
              id="sets"
              type="number"
              min="3"
              max="5"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="3"
              aria-invalid={errors.sets ? "true" : "false"}
              aria-describedby={errors.sets ? "sets-error" : undefined}
            />
            {errors.sets && (
              <p
                id="sets-error"
                className="mt-1 text-sm text-red-600 dark:text-red-400"
              >
                {errors.sets}
              </p>
            )}
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
              className="flex-1 px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {t("common.confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
