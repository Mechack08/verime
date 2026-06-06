/**
 * contract-api.ts — Typed wrapper around the compiled verime contract.
 *
 * Local proofs use only compact-runtime (via commitment.ts).
 * On-chain proofs are loaded on demand from contract-on-chain.ts.
 */

import type { WalletConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import type { IssueProofResult } from "./types.js";
import { commitmentFromField } from "./commitment.js";

export class VeriMeAPI {
  private readonly derivedSecret: bigint;
  private readonly revokeKey: bigint;
  private readonly birthYear: number;

  constructor(derivedSecret: bigint, revokeKey: bigint, birthYear: number) {
    this.derivedSecret = derivedSecret;
    this.revokeKey = revokeKey;
    this.birthYear = birthYear;
  }

  /**
   * Generates a local (off-chain) commitment.
   * No wallet required.
   */
  async issueProofLocal(
    minAge: number,
    maxAge: number,
  ): Promise<Omit<IssueProofResult, "contractAddress">> {
    const currentYear = new Date().getFullYear();
    const age = currentYear - this.birthYear;

    if (age < minAge) {
      throw new Error(
        `Age ${age} does not meet minimum requirement of ${minAge}.`,
      );
    }
    if (maxAge !== 0 && age > maxAge) {
      throw new Error(
        `Age ${age} exceeds maximum requirement of ${maxAge}.`,
      );
    }

    return {
      commitment: commitmentFromField(this.derivedSecret),
      revokeMarker: commitmentFromField(this.revokeKey),
    };
  }

  /**
   * Submits an issue_proof transaction to the Midnight network.
   */
  async issueProofOnChain(
    minAge: number,
    maxAge: number,
    walletApi: WalletConnectedAPI,
  ): Promise<IssueProofResult> {
    const { issueProofOnChain: submit } = await import("./contract-on-chain.js");
    return submit(
      this.derivedSecret,
      this.revokeKey,
      this.birthYear,
      minAge,
      maxAge,
      walletApi,
    );
  }
}
