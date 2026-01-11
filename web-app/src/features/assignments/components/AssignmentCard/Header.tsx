import { CityInfo } from './CityInfo'
import { DateTime } from './DateTime'
import { Teams } from './Teams'

/**
 * Composed header for the compact view.
 * Renders DateTime, Teams, and CityInfo in a row.
 */
export function Header() {
  return (
    <>
      <DateTime />
      <Teams />
      <CityInfo />
    </>
  )
}
