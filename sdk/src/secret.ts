/**
 * secret.ts — Master secret management and per-predicate derivation.
 *
 * Architecture:
 *   master_secret  — a random 32-byte value, generated once, stored in
 *                    localStorage (optionally also in Midnight wallet private state).
 *                    NEVER leaves the device. NEVER enters a circuit.
 *
 *   derived_secret — HMAC-SHA256(master_secret, `${minAge}:${maxAge}`)
 *                    truncated to Midnight's Field prime range.
 *                    This is what the `derived_secret()` witness returns.
 *                    One per (user, predicate) pair.
 *
 *   revoke_key     — HMAC-SHA256(master_secret, "revoke")
 *                    Stable identity marker for revocation.
 *                    persistentHash(revoke_key) = the user's revoke marker.
 *
 * Why HMAC and not simple concatenation?
 *   HMAC is a standard key-derivation primitive. It is collision-resistant
 *   and domain-separated by the label. Arithmetic combination of field
 *   elements (e.g. secret + minAge * PRIME) is algebraically reversible if
 *   you know the label, leaking the master secret.
 */

const STORAGE_KEY = "verime:master_secret";

// Midnight's BLS12-381 scalar field prime (p), as a bigint.
// Derived secrets are reduced modulo p.
const FIELD_PRIME =
  0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;

function bytesToBigInt(bytes: Uint8Array): bigint {
  return bytes.reduce((acc, b) => (acc << 8n) | BigInt(b), 0n);
}

async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    // Copy into a plain ArrayBuffer to satisfy SubtleCrypto's strict types
    key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const encoded = new TextEncoder().encode(data);
  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer,
  );
  return new Uint8Array(sig);
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  const arr = new Uint8Array(clean.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateMasterSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
}

export function loadOrCreateMasterSecret(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  const fresh = generateMasterSecret();
  localStorage.setItem(STORAGE_KEY, fresh);
  return fresh;
}

export function clearMasterSecret(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Derives the per-predicate scalar that the `derived_secret()` witness returns.
 * Returns a bigint in [1, FIELD_PRIME - 1].
 */
export async function derivedSecretFor(
  masterSecretHex: string,
  minAge: number,
  maxAge: number,
): Promise<bigint> {
  const masterBytes = hexToBytes(masterSecretHex);
  const label = `proof:${minAge}:${maxAge}`;
  const raw = await hmacSha256(masterBytes, label);
  const big = bytesToBigInt(raw) % FIELD_PRIME;
  // Ensure non-zero (edge case: probability 1/p ≈ 0)
  return big === 0n ? 1n : big;
}

/**
 * Derives the stable revocation key for this user.
 * persistentHash(revoke_key) = the user's revoke marker on-chain.
 */
export async function deriveRevokeKey(masterSecretHex: string): Promise<bigint> {
  const masterBytes = hexToBytes(masterSecretHex);
  const raw = await hmacSha256(masterBytes, "revoke");
  const big = bytesToBigInt(raw) % FIELD_PRIME;
  return big === 0n ? 1n : big;
}
