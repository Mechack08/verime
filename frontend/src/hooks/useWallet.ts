import { useState, useCallback, useRef, useEffect } from "react";
import type {
  InitialAPI,
  WalletConnectedAPI,
} from "@midnight-ntwrk/dapp-connector-api";
import { PREPROD_CONFIG } from "@verime/sdk/types";

export type WalletStatus = "disconnected" | "connecting" | "connected" | "error";

export interface AvailableWallet {
  key: string;
  name: string;
  icon?: string | undefined;
}

export interface UseWalletReturn {
  status: WalletStatus;
  wallet: WalletConnectedAPI | null;
  shieldedAddress: string | null;
  error: string | null;
  availableWallets: AvailableWallet[];
  connect: (walletKey?: string) => Promise<WalletConnectedAPI>;
  disconnect: () => void;
}

declare global {
  interface Window {
    midnight?: Record<string, InitialAPI>;
  }
}

function labelFromKey(key: string): string {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuid.test(key)) return "Wallet";
  return key.replace(/^mn/i, "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function useWallet(): UseWalletReturn {
  const [status, setStatus]               = useState<WalletStatus>("disconnected");
  const [wallet, setWallet]               = useState<WalletConnectedAPI | null>(null);
  const [shieldedAddress, setShieldedAddress] = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<AvailableWallet[]>([]);
  const walletRef = useRef<WalletConnectedAPI | null>(null);

  useEffect(() => {
    const detect = () => {
      const midnight = window.midnight ?? {};
      const wallets: AvailableWallet[] = Object.keys(midnight).map((key) => {
        const w = midnight[key];
        const entry: AvailableWallet = {
          key,
          name: w?.name ?? labelFromKey(key),
        };
        if (w?.icon) entry.icon = w.icon;
        return entry;
      });
      setAvailableWallets(wallets);
    };

    detect();
    window.addEventListener("midnight:walletChanged", detect);
    return () => window.removeEventListener("midnight:walletChanged", detect);
  }, []);

  const connect = useCallback(async (walletKey?: string): Promise<WalletConnectedAPI> => {
    const midnight = window.midnight;
    if (!midnight) {
      const msg = "No Midnight wallet detected. Install Lace or 1AM and refresh.";
      setError(msg);
      setStatus("error");
      throw new Error(msg);
    }

    const key = walletKey ?? Object.keys(midnight)[0];
    if (!key) {
      const msg = "No wallets available in window.midnight.";
      setError(msg);
      setStatus("error");
      throw new Error(msg);
    }

    setStatus("connecting");
    setError(null);

    try {
      const initial = midnight[key];
      if (!initial) throw new Error(`Wallet key "${key}" not found.`);
      const connected: WalletConnectedAPI = await initial.connect(PREPROD_CONFIG.networkId);

      let shieldedAddr: string | null = null;
      const MAX_ATTEMPTS = 10;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const { shieldedAddress } = await connected.getShieldedAddresses();
          shieldedAddr = shieldedAddress ?? null;
          break;
        } catch (syncErr) {
          const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
          if (attempt === MAX_ATTEMPTS) throw new Error(`Wallet still syncing: ${msg}`);
          await new Promise((r) => setTimeout(r, Math.min(500 * 2 ** attempt, 8000)));
        }
      }

      walletRef.current = connected;
      setWallet(connected);
      setShieldedAddress(shieldedAddr ?? null);
      setStatus("connected");
      return connected;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("error");
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    walletRef.current = null;
    setWallet(null);
    setShieldedAddress(null);
    setStatus("disconnected");
    setError(null);
  }, []);

  return { status, wallet, shieldedAddress, error, availableWallets, connect, disconnect };
}
