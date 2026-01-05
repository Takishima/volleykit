import type { Assignment, NominationList } from "@/api/client";
import { getTeamNames } from "@/utils/assignment-helpers";
import {
  RosterVerificationPanel,
  type RosterPanelModifications,
} from "./RosterVerificationPanel";
import type {
  RosterModifications,
  CoachModifications,
} from "@/hooks/useNominationList";

interface AwayRosterPanelProps {
  assignment: Assignment;
  onModificationsChange?: (modifications: RosterPanelModifications) => void;
  onAddPlayerSheetOpenChange?: (isOpen: boolean) => void;
  /** When true, shows roster in view-only mode */
  readOnly?: boolean;
  /** Initial player modifications to restore state when remounting */
  initialModifications?: RosterModifications;
  /** Initial coach modifications to restore state when remounting */
  initialCoachModifications?: CoachModifications;
  /** Pre-fetched nomination list data to avoid duplicate API calls */
  prefetchedNominationList?: NominationList | null;
}

export function AwayRosterPanel({
  assignment,
  onModificationsChange,
  onAddPlayerSheetOpenChange,
  readOnly = false,
  initialModifications,
  initialCoachModifications,
  prefetchedNominationList,
}: AwayRosterPanelProps) {
  const { awayTeam } = getTeamNames(assignment);
  const gameId = assignment.refereeGame?.game?.__identity ?? "";

  return (
    <RosterVerificationPanel
      team="away"
      teamName={awayTeam}
      gameId={gameId}
      onModificationsChange={onModificationsChange}
      onAddPlayerSheetOpenChange={onAddPlayerSheetOpenChange}
      readOnly={readOnly}
      initialModifications={initialModifications}
      initialCoachModifications={initialCoachModifications}
      prefetchedNominationList={prefetchedNominationList}
    />
  );
}
