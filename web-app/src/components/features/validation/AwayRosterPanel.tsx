import type { Assignment } from "@/api/client";
import { getTeamNames } from "@/utils/assignment-helpers";
import { RosterVerificationPanel } from "./RosterVerificationPanel";

interface AwayRosterPanelProps {
  assignment: Assignment;
}

export function AwayRosterPanel({ assignment }: AwayRosterPanelProps) {
  const { awayTeam } = getTeamNames(assignment);
  const gameId = assignment.refereeGame?.game?.__identity ?? "";

  return (
    <RosterVerificationPanel team="away" teamName={awayTeam} gameId={gameId} />
  );
}
