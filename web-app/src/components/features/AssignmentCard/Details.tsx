import { Location } from "./Location";
import { SingleBallNotice } from "./SingleBallNotice";
import { Status } from "./Status";
import { GameInfo } from "./GameInfo";
import { Referees } from "./Referees";

/**
 * Composed details section for the expanded view.
 * Renders Location, SingleBallNotice, Status, GameInfo, and Referees.
 */
export function Details() {
  return (
    <div className="px-2 pb-2 pt-0 border-t border-border-subtle dark:border-border-subtle-dark space-y-1">
      <Location />
      <SingleBallNotice />
      <Status />
      <GameInfo />
      <Referees />
    </div>
  );
}
