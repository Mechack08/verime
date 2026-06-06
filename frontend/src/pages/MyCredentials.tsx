import { useState, useCallback } from "react";
import QRCode from "react-qr-code";
import { Topbar } from "@/components/Topbar";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { ShieldIcon, QrIcon } from "@/components/icons";
import { truncateHex } from "@/lib/utils";
import { loadCredentials, deleteCredential } from "@verime/sdk/storage";
import { verifyProofOnChain } from "@verime/sdk/contract-verify";
import type { CredentialRecord } from "@verime/sdk/types";

const STORED_CONTRACT_KEY = "verime:contract_address";

type VerifyState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "valid"; totalProofs: number }
  | { status: "revoked" }
  | { status: "absent" }
  | { status: "error"; message: string };

export default function MyCredentials() {
  const [credentials, setCredentials] = useState<CredentialRecord[]>(() =>
    loadCredentials().sort((a, b) => b.issuedAt - a.issuedAt),
  );
  const [qrTarget, setQrTarget] = useState<CredentialRecord | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = useCallback(async (hex: string, id: string) => {
    await navigator.clipboard.writeText(hex);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteCredential(id);
    setCredentials((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return (
    <div className="min-h-dvh app-bg">
      <Topbar />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              My Credentials
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {credentials.length === 0
                ? "Your zero-knowledge credentials live here."
                : `${credentials.length} credential${credentials.length === 1 ? "" : "s"} stored in this browser.`}
            </p>
          </div>
          <ButtonLink to="/scan" variant="secondary" size="sm">+ New</ButtonLink>
        </div>

        {credentials.length === 0 ? (
          <div className="vm-card p-12 text-center">
            <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-violet-ghost)] text-[var(--color-violet-soft)]">
              <ShieldIcon size={24} />
            </span>
            <p className="text-sm text-[var(--color-text-muted)] mb-5">
              No credentials yet. Scan your ID to generate your first proof.
            </p>
            <ButtonLink to="/scan" variant="primary">Scan ID</ButtonLink>
          </div>
        ) : (
          <ul className="space-y-3">
            {credentials.map((cred) => (
              <CredentialRow
                key={cred.id}
                cred={cred}
                copied={copied === cred.id}
                onCopy={() => handleCopy(cred.commitment, cred.id)}
                onQr={() => setQrTarget(cred)}
                onDelete={() => handleDelete(cred.id)}
              />
            ))}
          </ul>
        )}
      </main>

      <Modal
        open={qrTarget !== null}
        onClose={() => setQrTarget(null)}
        title="Share Commitment"
      >
        {qrTarget && (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-3 rounded-[var(--radius)]">
              <QRCode value={qrTarget.commitment} size={200} />
            </div>
            <p className="text-xs text-[var(--color-text-muted)] text-center">
              Share this QR with a verifier. It encodes only your commitment hash — no identity data.
            </p>
            <p className="font-commit break-all text-center">{qrTarget.commitment}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

interface CredentialRowProps {
  cred: CredentialRecord;
  copied: boolean;
  onCopy: () => void;
  onQr: () => void;
  onDelete: () => void;
}

function CredentialRow({ cred, copied, onCopy, onQr, onDelete }: CredentialRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [verify, setVerify] = useState<VerifyState>({ status: "idle" });
  const issuedDate = new Date(cred.issuedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const resolvedAddress =
    cred.contractAddress ||
    (typeof localStorage !== "undefined"
      ? localStorage.getItem(STORED_CONTRACT_KEY) ?? ""
      : "");

  const handleVerify = useCallback(async () => {
    setVerify({ status: "checking" });
    try {
      const res = await verifyProofOnChain(
        resolvedAddress,
        cred.commitment,
        cred.revokeMarker,
      );
      if (res.revoked) {
        setVerify({ status: "revoked" });
      } else if (res.valid) {
        setVerify({ status: "valid", totalProofs: res.totalProofs });
      } else {
        setVerify({ status: "absent" });
      }
    } catch (err) {
      setVerify({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [resolvedAddress, cred.commitment, cred.revokeMarker]);

  return (
    <li className="vm-card vm-card-interactive p-4 sm:p-5 space-y-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-violet-ghost)] text-[var(--color-violet-soft)]">
            <ShieldIcon size={18} />
          </span>
          <div>
            <span className="text-sm font-semibold text-[var(--color-ink)]">
              {cred.predicate.label}
            </span>
            <div className="text-xs text-[var(--color-text-subtle)] mt-0.5">{issuedDate}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {cred.isOnChain ? (
            <Badge variant="violet">On-chain</Badge>
          ) : (
            <Badge variant="neutral">Local only</Badge>
          )}
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
        <div className="text-xs uppercase tracking-wide text-[var(--color-text-subtle)] mb-1.5">
          Commitment
        </div>
        <div className="font-commit text-[var(--color-cyan-soft)]" title={cred.commitment}>
          {truncateHex(cred.commitment)}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="secondary" size="sm" onClick={onCopy}>
          {copied ? "Copied!" : "Copy"}
        </Button>
        <Button variant="secondary" size="sm" onClick={onQr}>
          <QrIcon size={14} /> QR Code
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleVerify}
          disabled={verify.status === "checking"}
        >
          {verify.status === "checking" ? (
            <span className="inline-flex items-center gap-1.5">
              <Spinner size={14} /> Verifying…
            </span>
          ) : (
            "Verify on-chain"
          )}
        </Button>
        {!confirmDelete ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--color-text-subtle)] ml-auto"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
        ) : (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-[var(--color-text-muted)]">Sure?</span>
            <Button variant="danger" size="sm" onClick={onDelete}>
              Yes, delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {verify.status !== "idle" && verify.status !== "checking" && (
        <VerifyResult state={verify} />
      )}
    </li>
  );
}

type VerifyDisplayState = Exclude<VerifyState, { status: "idle" } | { status: "checking" }>;

function VerifyResult({ state }: { state: VerifyDisplayState }) {
  if (state.status === "valid") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="ok">Valid on-chain</Badge>
        <span className="text-[var(--color-text-muted)]">
          Commitment found in the contract&apos;s proofs set
          {` (${state.totalProofs} total)`}.
        </span>
      </div>
    );
  }
  if (state.status === "revoked") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="fail">Revoked</Badge>
        <span className="text-[var(--color-text-muted)]">
          This credential has been revoked on-chain.
        </span>
      </div>
    );
  }
  if (state.status === "absent") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="warn">Not found</Badge>
        <span className="text-[var(--color-text-muted)]">
          Commitment is not present in the contract. It may not be finalized yet.
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 text-xs">
      <Badge variant="fail">Error</Badge>
      <span className="text-[var(--color-text-muted)] break-all">{state.message}</span>
    </div>
  );
}
