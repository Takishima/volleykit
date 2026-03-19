import { ConflictNotice } from './ConflictNotice'
import { GameInfo } from './GameInfo'
import { Location } from './Location'
import { Referees } from './Referees'
import { SingleBallNotice } from './SingleBallNotice'
import { Status } from './Status'

/**
 * Composed details section for the expanded view.
 * Renders Location, ConflictNotice, SingleBallNotice, Status, GameInfo, and Referees.
 */
export function Details() {
  return (
    <div className="px-2 pb-2 pt-0 border-t border-border-subtle dark:border-border-subtle-dark space-y-1">
      <Location />
      <ConflictNotice />
      <SingleBallNotice />
      <Status />
      <GameInfo />
      <Referees />
    </div>
  )
}
