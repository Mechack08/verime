import type { CredentialRecord } from "./types.js";

const CREDS_KEY = "verime:credentials";

export function loadCredentials(): CredentialRecord[] {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    return raw ? (JSON.parse(raw) as CredentialRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveCredential(record: CredentialRecord): void {
  const existing = loadCredentials().filter((c) => c.id !== record.id);
  localStorage.setItem(CREDS_KEY, JSON.stringify([...existing, record]));
}

export function deleteCredential(id: string): void {
  const updated = loadCredentials().filter((c) => c.id !== id);
  localStorage.setItem(CREDS_KEY, JSON.stringify(updated));
}

export function markOnChain(id: string, contractAddress: string): void {
  const updated = loadCredentials().map((c) =>
    c.id === id ? { ...c, isOnChain: true, contractAddress } : c,
  );
  localStorage.setItem(CREDS_KEY, JSON.stringify(updated));
}
