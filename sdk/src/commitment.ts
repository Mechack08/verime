import {
  persistentHash,
  CompactTypeField,
} from "@midnight-ntwrk/compact-runtime";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Computes the on-chain commitment: persistentHash(Field). */
export function commitmentFromField(fieldValue: bigint): string {
  return bytesToHex(persistentHash(CompactTypeField, fieldValue));
}
