import type { Assignment } from "@/api/client";
import { getTeamNames } from "@/utils/assignment-helpers";
import { RosterVerificationPanel } from "./RosterVerificationPanel";
import type { RosterModifications } from "@/hooks/useNominationList";

interface HomeRosterPanelProps {
  assignment: Assignment;
  onModificationsChange?: (modifications: RosterModifications) => void;
  onAddPlayerSheetOpenChange?: (isOpen: boolean) => void;
  /** When true, shows roster in view-only mode */
  readOnly?: boolean;
}

export function HomeRosterPanel({
  assignment,
  onModificationsChange,
  onAddPlayerSheetOpenChange,
  readOnly = false,
}: HomeRosterPanelProps) {
  const { homeTeam } = getTeamNames(assignment);
  const gameId = assignment.refereeGame?.game?.__identity ?? "";

  return (
    <RosterVerificationPanel
      team="home"
      teamName={homeTeam}
      gameId={gameId}
      onModificationsChange={onModificationsChange}
      onAddPlayerSheetOpenChange={onAddPlayerSheetOpenChange}
      readOnly={readOnly}
    />
  );
}
