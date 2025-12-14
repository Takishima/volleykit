import type { Assignment } from "@/api/client";
import { getTeamNames } from "@/utils/assignment-helpers";
import { RosterVerificationPanel } from "./RosterVerificationPanel";

interface HomeRosterPanelProps {
  assignment: Assignment;
}

export function HomeRosterPanel({ assignment }: HomeRosterPanelProps) {
  const { homeTeam } = getTeamNames(assignment);
  const gameId = assignment.refereeGame?.game?.__identity ?? "";

  return (
    <RosterVerificationPanel team="home" teamName={homeTeam} gameId={gameId} />
  );
}
