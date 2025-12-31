import type { Assignment, NominationList } from "@/api/client";
import { getTeamNames } from "@/utils/assignment-helpers";
import { RosterVerificationPanel } from "./RosterVerificationPanel";
import type { RosterModifications } from "@/hooks/useNominationList";

interface HomeRosterPanelProps {
  assignment: Assignment;
  onModificationsChange?: (modifications: RosterModifications) => void;
  onAddPlayerSheetOpenChange?: (isOpen: boolean) => void;
  /** When true, shows roster in view-only mode */
  readOnly?: boolean;
  /** Initial modifications to restore state when remounting */
  initialModifications?: RosterModifications;
  /** Pre-fetched nomination list data to avoid duplicate API calls */
  prefetchedNominationList?: NominationList | null;
}

export function HomeRosterPanel({
  assignment,
  onModificationsChange,
  onAddPlayerSheetOpenChange,
  readOnly = false,
  initialModifications,
  prefetchedNominationList,
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
      initialModifications={initialModifications}
      prefetchedNominationList={prefetchedNominationList}
    />
  );
}
