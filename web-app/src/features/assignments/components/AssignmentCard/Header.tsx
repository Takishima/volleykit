import { DateTime } from "./DateTime";
import { Teams } from "./Teams";
import { CityInfo } from "./CityInfo";

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
  );
}
