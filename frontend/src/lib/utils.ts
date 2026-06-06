export type { Predicate } from "@verime/sdk/types";
export {
  labelFor,
  buildPredicate,
  validatePredicate,
  PRESET_PREDICATES,
} from "@verime/sdk/predicate";

/**
 * Truncates a hex string to N chars + "…" for display.
 */
export function truncateHex(hex: string, chars = 12): string {
  if (hex.length <= chars * 2 + 3) return hex;
  return `${hex.slice(0, chars)}…${hex.slice(-chars)}`;
}

/**
 * Compares two Uint8Array instances by value.
 */
export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  return a.every((byte, i) => byte === b[i]);
}
