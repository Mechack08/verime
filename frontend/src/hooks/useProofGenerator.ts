/**
 * useProofGenerator.ts
 *
 * Manages the full proof generation pipeline:
 *   1. Load or create master secret from localStorage
 *   2. Derive per-predicate secret via HMAC (sdk/src/secret.ts)
 *   3. Call issue_proof circuit via SDK contract-api
 *   4. Save the resulting CredentialRecord to localStorage
 *   5. Optionally record on-chain if a wallet is connected
 */

import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { CredentialRecord, Predicate } from "@verime/sdk/types";
import { saveCredential } from "@verime/sdk/storage";
import { loadOrCreateMasterSecret, derivedSecretFor, deriveRevokeKey } from "@/lib/secret";
import { VeriMeAPI } from "@verime/sdk/contract-api";
import type { WalletConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";

export type ProofPhase =
  | "idle"
  | "deriving"
  | "proving"
  | "recording"
  | "done"
  | "error";

export interface UseProofGeneratorReturn {
  phase: ProofPhase;
  error: string | null;
  result: CredentialRecord | null;
  generate: (birthYear: number, predicate: Predicate, wallet?: WalletConnectedAPI) => Promise<void>;
  reset: () => void;
}

export function useProofGenerator(): UseProofGeneratorReturn {
  const [phase, setPhase]   = useState<ProofPhase>("idle");
  const [error, setError]   = useState<string | null>(null);
  const [result, setResult] = useState<CredentialRecord | null>(null);

  const generate = useCallback(async (
    birthYear: number,
    predicate: Predicate,
    wallet?: WalletConnectedAPI,
  ) => {
    setPhase("deriving");
    setError(null);

    try {
      const masterSecret = loadOrCreateMasterSecret();

      const derivedSecret = await derivedSecretFor(masterSecret, predicate.minAge, predicate.maxAge);
      const revokeKey     = await deriveRevokeKey(masterSecret);

      setPhase("proving");

      const api = new VeriMeAPI(derivedSecret, revokeKey, birthYear);

      let contractAddress = "";
      let commitmentHex: string;
      let revokeMarkerHex: string;

      if (wallet) {
        setPhase("recording");
        const out = await api.issueProofOnChain(predicate.minAge, predicate.maxAge, wallet);
        contractAddress  = out.contractAddress;
        commitmentHex    = out.commitment;
        revokeMarkerHex  = out.revokeMarker;
      } else {
        const out = await api.issueProofLocal(predicate.minAge, predicate.maxAge);
        commitmentHex   = out.commitment;
        revokeMarkerHex = out.revokeMarker;
      }

      const record: CredentialRecord = {
        id:              uuidv4(),
        predicate,
        commitment:      commitmentHex,
        revokeMarker:    revokeMarkerHex,
        contractAddress,
        issuedAt:        Date.now(),
        isOnChain:       Boolean(wallet),
      };

      saveCredential(record);
      setResult(record);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setResult(null);
  }, []);

  return { phase, error, result, generate, reset };
}
