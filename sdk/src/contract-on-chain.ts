/**
 * On-chain proof submission — isolated so local proof path avoids Midnight deps.
 */

import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import {
  deployContract,
  findDeployedContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import type { WalletConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { Contract } from "../../generated/contract/index.js";
import type { IssueProofResult } from "./types.js";
import { commitmentFromField } from "./commitment.js";
import { buildProviders } from "./providers.js";
import { PREPROD_CONFIG } from "./types.js";

const CONTRACT_ADDRESS_KEY = "verime:contract_address";

function loadStoredContractAddress(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(CONTRACT_ADDRESS_KEY);
}

function saveContractAddress(address: string): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(CONTRACT_ADDRESS_KEY, address);
  }
}

type VerimeWitnesses = {
  derived_secret: (_ctx: unknown) => [undefined, bigint];
  birth_year: (_ctx: unknown) => [undefined, bigint];
  revoke_key: (_ctx: unknown) => [undefined, bigint];
};

function buildCompiledContract(witnesses: VerimeWitnesses) {
  return CompiledContract.withWitnesses(
    CompiledContract.make("verime", Contract),
    witnesses,
  );
}

interface OnChainContract {
  deployTxData: { public: { contractAddress: string } };
  callTx: {
    issue_proof: (
      minAgeArg: bigint,
      maxAgeArg: bigint,
      currentYearArg: bigint,
    ) => Promise<unknown>;
  };
}

export async function issueProofOnChain(
  derivedSecret: bigint,
  revokeKey: bigint,
  birthYear: number,
  minAge: number,
  maxAge: number,
  walletApi: WalletConnectedAPI,
): Promise<IssueProofResult> {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

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

  const providers = await buildProviders(PREPROD_CONFIG, walletApi);
  const witnesses: VerimeWitnesses = {
    derived_secret: () => [undefined, derivedSecret],
    birth_year: () => [undefined, BigInt(birthYear)],
    revoke_key: () => [undefined, revokeKey],
  };
  const compiledContract = buildCompiledContract(witnesses);
  const currentYearBig = BigInt(currentYear);

  let contractInstance: OnChainContract | null = null;
  const storedAddress = loadStoredContractAddress();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const midnightProviders = providers as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compiled = compiledContract as any;

  if (storedAddress) {
    try {
      contractInstance = (await findDeployedContract(midnightProviders, {
        compiledContract: compiled,
        contractAddress: storedAddress,
      })) as unknown as OnChainContract;
    } catch {
      contractInstance = null;
    }
  }

  if (!contractInstance) {
    const deployed = (await deployContract(midnightProviders, {
      compiledContract: compiled,
      args: [],
    })) as unknown as OnChainContract;
    saveContractAddress(deployed.deployTxData.public.contractAddress);
    contractInstance = deployed;
  }

  const contractAddress =
    contractInstance.deployTxData.public.contractAddress;

  await contractInstance.callTx.issue_proof(
    BigInt(minAge),
    BigInt(maxAge),
    currentYearBig,
  );

  return {
    commitment: commitmentFromField(derivedSecret),
    revokeMarker: commitmentFromField(revokeKey),
    contractAddress,
  };
}
