import { useState, useCallback, useEffect } from "react";
import type { Assignment } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { getTeamNames } from "@/utils/assignment-helpers";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import {
  HomeRosterPanel,
  AwayRosterPanel,
  ScorerPanel,
  ScoresheetPanel,
} from "@/components/features/validation";

interface ValidateGameModalProps {
  assignment: Assignment;
  isOpen: boolean;
  onClose: () => void;
}

type ValidationTabId =
  | "home-roster"
  | "away-roster"
  | "scorer"
  | "scoresheet";

export function ValidateGameModal({
  assignment,
  isOpen,
  onClose,
}: ValidateGameModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ValidationTabId>("home-roster");

  const tabs = [
    { id: "home-roster", label: t("validation.homeRoster") },
    { id: "away-roster", label: t("validation.awayRoster") },
    { id: "scorer", label: t("validation.scorer") },
    {
      id: "scoresheet",
      label: t("validation.scoresheet"),
      badge: t("common.optional"),
    },
  ];

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

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as ValidationTabId);
  }, []);

  if (!isOpen) return null;

  const { homeTeam, awayTeam } = getTeamNames(assignment);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="validate-game-title"
      >
        <h2
          id="validate-game-title"
          className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
        >
          {t("assignments.validateGame")}
        </h2>

        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="font-medium text-gray-900 dark:text-white">
            {homeTeam} vs {awayTeam}
          </div>
        </div>

        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          ariaLabel={t("assignments.validateGame")}
        />

        <TabPanel tabId="home-roster" activeTab={activeTab}>
          <HomeRosterPanel assignment={assignment} />
        </TabPanel>

        <TabPanel tabId="away-roster" activeTab={activeTab}>
          <AwayRosterPanel assignment={assignment} />
        </TabPanel>

        <TabPanel tabId="scorer" activeTab={activeTab}>
          <ScorerPanel assignment={assignment} />
        </TabPanel>

        <TabPanel tabId="scoresheet" activeTab={activeTab}>
          <ScoresheetPanel assignment={assignment} />
        </TabPanel>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
