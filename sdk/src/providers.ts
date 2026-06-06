/**
 * providers.ts — Midnight provider factory.
 *
 * Builds the full ContractProviders set required by midnight-js-contracts v4.
 */

import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { createProofProvider } from "@midnight-ntwrk/midnight-js-types";
import type {
  MidnightProvider,
  MidnightProviders,
  WalletProvider,
} from "@midnight-ntwrk/midnight-js-types";
import type { WalletConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { Transaction } from "@midnight-ntwrk/ledger-v8";
import { fromHex, toHex } from "@midnight-ntwrk/midnight-js-utils";
import type { NetworkConfig } from "./types.js";

export type VeriMeProviders = MidnightProviders;

async function resolveAccountId(walletApi: WalletConnectedAPI): Promise<string> {
  const { shieldedAddress } = await walletApi.getShieldedAddresses();
  return shieldedAddress;
}

function deriveStoragePassword(accountId: string): string {
  const base = (accountId + "Vm!9Xk#2Pz@5Qw").slice(0, 20);
  return base + "Aa1!";
}

function createWalletProvider(
  walletApi: WalletConnectedAPI,
  coinPublicKey: string,
  encryptionPublicKey: string,
): WalletProvider {
  return {
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey,
    balanceTx: async (tx) => {
      // `tx.toString()` is a human-readable debug form — the wallet needs the
      // binary-serialized transaction, hex-encoded.
      const { tx: balanced } = await walletApi.balanceUnsealedTransaction(
        toHex(tx.serialize()),
      );
      return Transaction.deserialize(
        "signature",
        "proof",
        "binding",
        fromHex(balanced),
      );
    },
  };
}

function createMidnightProvider(walletApi: WalletConnectedAPI): MidnightProvider {
  return {
    submitTx: async (tx) => {
      await walletApi.submitTransaction(toHex(tx.serialize()));
      const ids = tx.identifiers();
      if (ids.length === 0) {
        throw new Error("Transaction submitted but no identifier was returned.");
      }
      return ids[0]!;
    },
  };
}

/**
 * Resolves the base URL that hosts the compiled ZK artifacts
 * (`keys/*.prover`, `keys/*.verifier`, `zkir/*.bzkir`).
 *
 * IMPORTANT: these artifacts are app-specific and are served by *this* app
 * (the Vite `/zk` static route in dev). They are NOT served by the wallet's
 * prover server — `proverServerUri` is consumed separately inside
 * `walletApi.getProvingProvider(...)`. Routing artifact fetches there yields
 * `ZKConfigurationReadError: Failed to read verifier key`.
 */
export function resolveZkConfigBaseUrl(config: NetworkConfig): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/zk`;
  }
  return `${config.proofServerUri.replace(/\/$/, "")}/zk`;
}

/**
 * Builds the full provider set for on-chain interactions.
 */
export async function buildProviders(
  config: NetworkConfig,
  walletApi: WalletConnectedAPI,
): Promise<VeriMeProviders> {
  const walletConfig = await walletApi.getConfiguration();
  setNetworkId(walletConfig.networkId);

  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } =
    await walletApi.getShieldedAddresses();

  const zkBaseUrl = resolveZkConfigBaseUrl(config);
  const zkConfigProvider = new FetchZkConfigProvider<
    "issue_proof" | "verify_proof" | "revoke"
  >(zkBaseUrl, fetch.bind(globalThis));

  const publicDataProvider = indexerPublicDataProvider(
    walletConfig.indexerUri,
    walletConfig.indexerWsUri,
  );

  const privateStateProvider = levelPrivateStateProvider({
    accountId: await resolveAccountId(walletApi),
    privateStoragePasswordProvider: async () =>
      deriveStoragePassword(await resolveAccountId(walletApi)),
  });

  const provingProvider = await walletApi.getProvingProvider(zkConfigProvider);
  const proofProvider = createProofProvider(provingProvider);

  const walletProvider = createWalletProvider(
    walletApi,
    shieldedCoinPublicKey,
    shieldedEncryptionPublicKey,
  );

  const midnightProvider = createMidnightProvider(walletApi);

  return {
    zkConfigProvider,
    publicDataProvider,
    privateStateProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };
}
