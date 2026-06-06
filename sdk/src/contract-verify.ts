/**
 * contract-verify.ts — read-only on-chain verification.
 *
 * `verify_proof` is a pure check over public ledger state, so verification does
 * NOT require a wallet, fees, or proving. We query the contract's public state
 * from the indexer and check Set membership directly:
 *   valid = proofs.member(commitment) && !revoked.member(revoke_marker)
 */

import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { fromHex } from "@midnight-ntwrk/midnight-js-utils";
import { ledger } from "../../generated/contract/index.js";
import { PREPROD_CONFIG } from "./types.js";

export interface VerifyOnChainResult {
  /** The commitment is present in the contract's `proofs` set. */
  present: boolean;
  /** The revoke marker is present in the contract's `revoked` set. */
  revoked: boolean;
  /** Overall verdict: present AND not revoked. */
  valid: boolean;
  /** Total commitments currently recorded by the contract. */
  totalProofs: number;
}

function hexToBytes(hex: string): Uint8Array {
  return Uint8Array.from(fromHex(hex));
}

/**
 * Checks whether a commitment is recorded (and not revoked) in the deployed
 * contract's public state. Read-only — safe to call without a connected wallet.
 *
 * @throws If no contract state is found at `contractAddress` (not deployed or
 *         not yet indexed).
 */
export async function verifyProofOnChain(
  contractAddress: string,
  commitmentHex: string,
  revokeMarkerHex: string,
): Promise<VerifyOnChainResult> {
  if (!contractAddress) {
    throw new Error(
      "No contract address available for this credential. Issue it on-chain first.",
    );
  }

  setNetworkId(PREPROD_CONFIG.networkId);

  const publicDataProvider = indexerPublicDataProvider(
    PREPROD_CONFIG.indexerUri,
    PREPROD_CONFIG.indexerWsUri,
  );

  const state = await publicDataProvider.queryContractState(contractAddress);
  if (!state) {
    throw new Error(
      `No contract state found at ${contractAddress}. ` +
        "The contract may not be deployed yet, or the indexer hasn't caught up.",
    );
  }

  const ledgerState = ledger(state.data);
  const present = ledgerState.proofs.member(hexToBytes(commitmentHex));
  const isRevoked = ledgerState.revoked.member(hexToBytes(revokeMarkerHex));

  return {
    present,
    revoked: isRevoked,
    valid: present && !isRevoked,
    totalProofs: Number(ledgerState.proofs.size()),
  };
}
