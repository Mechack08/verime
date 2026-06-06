export type ProofStatus = "idle" | "scanning" | "building" | "proving" | "done" | "error";

export interface Predicate {
  minAge: number;
  /** 0 = no upper bound */
  maxAge: number;
  /** Human-readable label derived from minAge/maxAge */
  label: string;
}

export interface CredentialRecord {
  id: string;                    // uuid
  predicate: Predicate;
  commitment: string;            // hex commitment stored in proofs Set
  revokeMarker: string;          // hex revoke marker for verify_proof
  contractAddress: string;
  issuedAt: number;              // unix ms
  isOnChain: boolean;
}

export interface IssueProofResult {
  commitment: string;
  revokeMarker: string;
  contractAddress: string;
}

export interface ScannedId {
  birthYear: number;
  /** e.g. "PASSPORT", "NATIONAL_ID" */
  documentType: string;
  expiryYear: number;
  isExpired: boolean;
}

export interface NetworkConfig {
  indexerUri:        string;
  indexerWsUri:      string;
  proofServerUri:    string;
  networkId:         string;
}

/** Midnight pre-production network (Lace / 1AM default for dev). */
export const PREPROD_CONFIG: NetworkConfig = {
  indexerUri:     "https://indexer.preprod.midnight.network/api/v4/graphql",
  indexerWsUri:   "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
  proofServerUri: "http://localhost:6300",
  networkId:      "preprod",
};

/** @deprecated Use PREPROD_CONFIG */
export const TESTNET_CONFIG = PREPROD_CONFIG;
