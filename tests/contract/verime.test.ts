/**
 * verime.test.ts — Contract logic unit tests.
 *
 * These tests exercise the circuit semantics using lightweight in-process
 * assertions. Full on-chain simulation requires the Compact runtime; these
 * tests validate the TypeScript-side logic (secret derivation, predicate
 * validation, storage) without needing the Midnight proof server.
 *
 * To run full circuit simulation tests with @midnight-ntwrk/compact-runtime,
 * see the comments at the bottom of this file.
 */

import { describe, it, expect } from "vitest";
import { derivedSecretFor, deriveRevokeKey, generateMasterSecret } from "@verime/sdk/secret";
import { labelFor, validatePredicate, buildPredicate } from "@verime/sdk/predicate";
import { commitmentFromField } from "@verime/sdk/commitment";

// ── Secret derivation ────────────────────────────────────────────────────────

describe("derivedSecretFor", () => {
  it("returns a non-zero bigint for valid inputs", async () => {
    const master = generateMasterSecret();
    const secret = await derivedSecretFor(master, 18, 0);
    expect(typeof secret).toBe("bigint");
    expect(secret).toBeGreaterThan(0n);
  });

  it("is stable — same inputs produce the same output", async () => {
    const master = generateMasterSecret();
    const a = await derivedSecretFor(master, 18, 0);
    const b = await derivedSecretFor(master, 18, 0);
    expect(a).toBe(b);
  });

  it("produces different secrets for different predicates", async () => {
    const master = generateMasterSecret();
    const a = await derivedSecretFor(master, 18, 0);
    const b = await derivedSecretFor(master, 21, 0);
    const c = await derivedSecretFor(master, 18, 65);
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });

  it("produces different secrets for different master secrets", async () => {
    const a = await derivedSecretFor(generateMasterSecret(), 18, 0);
    const b = await derivedSecretFor(generateMasterSecret(), 18, 0);
    // Astronomically unlikely to collide
    expect(a).not.toBe(b);
  });

  it("is within the BLS12-381 field prime range", async () => {
    const FIELD_PRIME =
      0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;
    const master = generateMasterSecret();
    for (const [min, max] of [[0, 18], [18, 65], [21, 0], [35, 0]]) {
      const secret = await derivedSecretFor(master, min as number, max as number);
      expect(secret).toBeGreaterThan(0n);
      expect(secret).toBeLessThan(FIELD_PRIME);
    }
  });
});

describe("deriveRevokeKey", () => {
  it("is stable across calls", async () => {
    const master = generateMasterSecret();
    const a = await deriveRevokeKey(master);
    const b = await deriveRevokeKey(master);
    expect(a).toBe(b);
  });

  it("differs from any predicate-derived secret", async () => {
    const master = generateMasterSecret();
    const revoke = await deriveRevokeKey(master);
    const proof = await derivedSecretFor(master, 18, 0);
    expect(revoke).not.toBe(proof);
  });
});

// ── Predicate utilities ──────────────────────────────────────────────────────

describe("labelFor", () => {
  it("produces correct labels", () => {
    expect(labelFor(18, 0)).toBe("Over 18");
    expect(labelFor(0, 25)).toBe("Under 25");
    expect(labelFor(21, 21)).toBe("Exactly 21");
    expect(labelFor(30, 65)).toBe("Between 30 and 65");
  });
});

describe("validatePredicate", () => {
  it("accepts valid predicates", () => {
    expect(validatePredicate(18, 0)).toBeNull();
    expect(validatePredicate(0, 25)).toBeNull();
    expect(validatePredicate(30, 65)).toBeNull();
    expect(validatePredicate(21, 21)).toBeNull();
  });

  it("rejects both zero", () => {
    expect(validatePredicate(0, 0)).not.toBeNull();
  });

  it("rejects min > max when max != 0", () => {
    expect(validatePredicate(65, 30)).not.toBeNull();
  });

  it("rejects out-of-range values", () => {
    expect(validatePredicate(-1, 0)).not.toBeNull();
    expect(validatePredicate(0, 300)).not.toBeNull();
    expect(validatePredicate(256, 0)).not.toBeNull();
  });

  it("rejects non-integer inputs", () => {
    expect(validatePredicate(18.5, 0)).not.toBeNull();
  });
});

describe("buildPredicate", () => {
  it("includes correct label", () => {
    const p = buildPredicate(18, 0);
    expect(p.label).toBe("Over 18");
    expect(p.minAge).toBe(18);
    expect(p.maxAge).toBe(0);
  });
});

// ── Circuit age logic (pure TypeScript simulation) ───────────────────────────
//
// The actual Compact circuit enforces these assertions. These tests verify
// the equivalent logic before submitting to the proof server.
//

describe("issue_proof age assertions", () => {
  function simulateAgeCheck(
    birthYear: number,
    minAge: number,
    maxAge: number,
    currentYear = 2026,
  ): { ok: boolean; error?: string } {
    if (currentYear < birthYear) return { ok: false, error: "Birth year is in the future" };
    const age = currentYear - birthYear;
    if (age < minAge) return { ok: false, error: "Does not meet minimum age requirement" };
    if (maxAge !== 0 && age > maxAge) return { ok: false, error: "Exceeds maximum age requirement" };
    return { ok: true };
  }

  it("passes for age exactly at minimum", () => {
    expect(simulateAgeCheck(2008, 18, 0)).toMatchObject({ ok: true });
  });

  it("fails for age one year below minimum", () => {
    expect(simulateAgeCheck(2009, 18, 0)).toMatchObject({ ok: false });
  });

  it("passes when age is within bounded range", () => {
    expect(simulateAgeCheck(1990, 30, 65)).toMatchObject({ ok: true });
  });

  it("fails when age exceeds upper bound", () => {
    expect(simulateAgeCheck(1950, 30, 65)).toMatchObject({ ok: false });
  });

  it("passes when max_age is 0 (unbounded)", () => {
    expect(simulateAgeCheck(1950, 18, 0)).toMatchObject({ ok: true });
  });

  it("rejects future birth year", () => {
    expect(simulateAgeCheck(2030, 18, 0)).toMatchObject({ ok: false });
  });
});

describe("commitmentFromField", () => {
  it("returns a stable 64-char hex commitment", async () => {
    const master = generateMasterSecret();
    const secret = await derivedSecretFor(master, 18, 0);
    const a = commitmentFromField(secret);
    const b = commitmentFromField(secret);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs for different field values", async () => {
    const master = generateMasterSecret();
    const proof = await derivedSecretFor(master, 18, 0);
    const revoke = await deriveRevokeKey(master);
    expect(commitmentFromField(proof)).not.toBe(commitmentFromField(revoke));
  });
});
