/* eslint-disable @typescript-eslint/no-magic-numbers -- UUID format requires specific string indices */
/**
 * Deterministic UUID generation for demo data.
 * Uses hashing to create reproducible UUIDs from seed strings,
 * ensuring mock data passes UUID validation while remaining predictable.
 */

// Valid variant characters for UUID v4 (RFC 4122)
const UUID_VARIANT_CHARS = ["8", "9", "a", "b"] as const;

/** Hash a string to a 32-bit integer using djb2-like algorithm. */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash | 0;
  }
  return hash;
}

/** Hash a string in reverse for additional entropy. */
function hashStringReverse(str: string): number {
  let hash = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    hash = (hash << 3) + hash + str.charCodeAt(i);
    hash = hash | 0;
  }
  return hash;
}

/** Convert a number to an 8-character hex string. */
function toHex8(n: number): string {
  return Math.abs(n).toString(16).padStart(8, "0").slice(0, 8);
}

/**
 * Generate a deterministic UUID v4 from a seed string.
 * Uses hashing to create reproducible UUIDs for demo data,
 * ensuring mock data passes UUID validation while remaining predictable.
 */
export function generateDemoUuid(seed: string): string {
  const h1 = hashString(seed);
  const h2 = hashStringReverse(seed);
  const hex1 = toHex8(h1);
  const hex2 = toHex8(h2);
  const hex3 = toHex8(h1 + h2);
  const hex4 = toHex8(h1 * 2 + h2);
  const variant = UUID_VARIANT_CHARS[Math.abs(h1) % 4];

  return `${hex1}-${hex2.slice(0, 4)}-4${hex2.slice(5, 8)}-${variant}${hex3.slice(1, 4)}-${hex3.slice(4, 8)}${hex4.slice(0, 8)}`;
}
