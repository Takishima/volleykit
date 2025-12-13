import type { Occupation } from "@/stores/auth";

/**
 * Maps occupation types to their corresponding translation keys.
 *
 * Returns a properly typed union of translation keys to enable type-safe usage
 * with the i18n `t()` function without requiring type casts.
 */
export function getOccupationLabelKey(
  type: Occupation["type"],
):
  | "occupations.referee"
  | "occupations.player"
  | "occupations.clubAdmin"
  | "occupations.associationAdmin" {
  const keyMap = {
    referee: "occupations.referee" as const,
    player: "occupations.player" as const,
    clubAdmin: "occupations.clubAdmin" as const,
    associationAdmin: "occupations.associationAdmin" as const,
  };
  return keyMap[type];
}
