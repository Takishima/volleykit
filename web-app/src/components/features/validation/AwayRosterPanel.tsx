import type { Assignment } from "@/api/client";
import { getTeamNames } from "@/utils/assignment-helpers";
import { RosterVerificationPanel } from "./RosterVerificationPanel";
import type { RosterModifications } from "@/hooks/useNominationList";

interface AwayRosterPanelProps {
  assignment: Assignment;
  onModificationsChange?: (modifications: RosterModifications) => void;
}

export function AwayRosterPanel({
  assignment,
  onModificationsChange,
}: AwayRosterPanelProps) {
  const { awayTeam } = getTeamNames(assignment);
  const gameId = assignment.refereeGame?.game?.__identity ?? "";

  return (
    <RosterVerificationPanel
      team="away"
      teamName={awayTeam}
      gameId={gameId}
      onModificationsChange={onModificationsChange}
    />
  );
}
