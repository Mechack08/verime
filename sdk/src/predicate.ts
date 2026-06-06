import type { Predicate } from "./types.js";

/**
 * Builds a human-readable label from age bounds.
 */
export function labelFor(minAge: number, maxAge: number): string {
  if (minAge > 0 && maxAge === 0) return `Over ${minAge}`;
  if (minAge === 0 && maxAge > 0) return `Under ${maxAge}`;
  if (minAge === maxAge) return `Exactly ${minAge}`;
  return `Between ${minAge} and ${maxAge}`;
}

export function buildPredicate(minAge: number, maxAge: number): Predicate {
  return { minAge, maxAge, label: labelFor(minAge, maxAge) };
}

export function validatePredicate(minAge: number, maxAge: number): string | null {
  if (!Number.isInteger(minAge) || minAge < 0 || minAge > 255) {
    return "Minimum age must be a whole number between 0 and 255.";
  }
  if (!Number.isInteger(maxAge) || maxAge < 0 || maxAge > 255) {
    return "Maximum age must be a whole number between 0 and 255, or 0 for no upper limit.";
  }
  if (maxAge > 0 && minAge > maxAge) {
    return "Minimum age cannot exceed maximum age.";
  }
  if (minAge === 0 && maxAge === 0) {
    return "At least one bound must be set.";
  }
  return null;
}

export const PRESET_PREDICATES: Predicate[] = [
  buildPredicate(16, 0),
  buildPredicate(18, 0),
  buildPredicate(21, 0),
  buildPredicate(25, 0),
  buildPredicate(30, 0),
  buildPredicate(35, 0),
  buildPredicate(18, 35),
  buildPredicate(30, 65),
];
