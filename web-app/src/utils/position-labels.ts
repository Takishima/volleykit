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

/** Translation keys for positions */
type PositionTranslationKey = `positions.${PositionKey}`;

/** Map from position key to its translation key */
const POSITION_TRANSLATION_KEYS: Record<PositionKey, PositionTranslationKey> = {
  "head-one": "positions.head-one",
  "head-two": "positions.head-two",
  "linesman-one": "positions.linesman-one",
  "linesman-two": "positions.linesman-two",
  "linesman-three": "positions.linesman-three",
  "linesman-four": "positions.linesman-four",
  "standby-head": "positions.standby-head",
  "standby-linesman": "positions.standby-linesman",
};

function isPositionKey(key: string): key is PositionKey {
  return key in POSITION_TRANSLATION_KEYS;
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
  t: (key: PositionTranslationKey) => string,
  fallback?: string,
): string {
  if (!positionKey) {
    return fallback ?? "";
  }

  if (isPositionKey(positionKey)) {
    return t(POSITION_TRANSLATION_KEYS[positionKey]);
  }

  return positionKey;
}
