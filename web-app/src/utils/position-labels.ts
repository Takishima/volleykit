/**
 * Position keys used in the volleymanager API for referee assignments.
 */
export type PositionKey =
  | "head-one"
  | "head-two"
  | "linesman-one"
  | "linesman-two"
  | "linesman-three"
  | "linesman-four"
  | "standby-head"
  | "standby-linesman";

const POSITION_KEYS: readonly PositionKey[] = [
  "head-one",
  "head-two",
  "linesman-one",
  "linesman-two",
  "linesman-three",
  "linesman-four",
  "standby-head",
  "standby-linesman",
] as const;

function isPositionKey(key: string): key is PositionKey {
  return POSITION_KEYS.includes(key as PositionKey);
}

/**
 * Returns the translated label for a referee position.
 *
 * @param positionKey - The position key from the API (e.g., "head-one")
 * @param t - Translation function from useTranslation hook
 * @param fallback - Optional fallback when positionKey is undefined or empty
 * @returns Translated position label, or the raw key if not a known position
 */
export function getPositionLabel(
  positionKey: string | undefined,
  t: (key: string) => string,
  fallback?: string,
): string {
  if (!positionKey) {
    return fallback ?? "";
  }

  if (isPositionKey(positionKey)) {
    return t(`positions.${positionKey}`);
  }

  return positionKey;
}
