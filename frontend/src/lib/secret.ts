/**
 * secret.ts — Re-export from SDK for use in frontend hooks.
 *
 * The frontend imports secret utilities from the SDK via this thin re-export
 * so that the path alias `@/lib/secret` resolves correctly and the SDK source
 * stays the single source of truth.
 */

export {
  loadOrCreateMasterSecret,
  generateMasterSecret,
  clearMasterSecret,
  derivedSecretFor,
  deriveRevokeKey,
} from "@verime/sdk/secret";
