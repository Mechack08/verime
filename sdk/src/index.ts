// Public barrel for @verime/sdk
export type {
  ProofStatus,
  Predicate,
  CredentialRecord,
  IssueProofResult,
  ScannedId,
  NetworkConfig,
} from "./types.js";

export { PREPROD_CONFIG, TESTNET_CONFIG } from "./types.js";
export { loadOrCreateMasterSecret, generateMasterSecret, clearMasterSecret, derivedSecretFor, deriveRevokeKey } from "./secret.js";
export { loadCredentials, saveCredential, deleteCredential, markOnChain } from "./storage.js";
export { VeriMeAPI } from "./contract-api.js";
export { buildProviders } from "./providers.js";
export type { VeriMeProviders } from "./providers.js";
