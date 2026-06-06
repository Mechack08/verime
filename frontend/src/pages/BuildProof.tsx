/**
 * BuildProof.tsx — Deep-link flow for verifier-specified predicates.
 *
 * A verifier can link to: /build-proof?predicate=18:0
 * This pre-selects the predicate and skips step 2 of the Scan flow.
 * If the user has not yet scanned their ID, redirects to /scan.
 */

import { useSearchParams } from "react-router-dom";
import { Topbar } from "@/components/Topbar";
import { Footer } from "@/components/Footer";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ShieldIcon, EyeOffIcon, ArrowRightIcon } from "@/components/icons";
import { buildPredicate, validatePredicate } from "@/lib/utils";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh app-bg flex flex-col">
      <Topbar />
      <main className="mx-auto w-full max-w-xl px-4 py-16 flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default function BuildProof() {
  const [searchParams] = useSearchParams();
  const predicateParam = searchParams.get("predicate");

  if (!predicateParam) {
    return (
      <Shell>
        <div className="vm-card p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            No predicate specified. Use{" "}
            <code className="font-mono text-xs bg-[var(--color-surface-raised)] px-1.5 py-0.5 rounded">
              ?predicate=18:0
            </code>{" "}
            in the URL.
          </p>
          <ButtonLink to="/scan" variant="secondary">Go to Scan</ButtonLink>
        </div>
      </Shell>
    );
  }

  const parts = predicateParam.split(":").map((s) => parseInt(s, 10));
  const minAge = parts[0] ?? 0;
  const maxAge = parts[1] ?? 0;
  const validationError = validatePredicate(minAge, maxAge);

  if (validationError) {
    return (
      <Shell>
        <div className="vm-card p-8 text-center">
          <p className="text-sm text-[var(--color-fail)] mb-4">{validationError}</p>
          <ButtonLink to="/scan" variant="secondary">Go to Scan</ButtonLink>
        </div>
      </Shell>
    );
  }

  const predicate = buildPredicate(minAge, maxAge);

  return (
    <Shell>
      <div className="vm-card p-8 glow-violet animate-rise">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius)] border border-[var(--color-violet)]/40 bg-[var(--color-violet-ghost)] text-[var(--color-violet-soft)]">
          <ShieldIcon size={26} />
        </span>

        <div className="mt-5 text-xs font-medium uppercase tracking-widest text-[var(--color-text-subtle)]">
          Verifier request
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Prove <span className="gradient-text">{predicate.label}</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
          A verifier is requesting cryptographic proof that you satisfy this age
          predicate. Scan your ID to generate the proof — your birth date is never
          revealed.
        </p>

        <div className="mt-5 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <EyeOffIcon size={14} className="text-[var(--color-cyan-soft)]" />
          Only a 32-byte commitment is shared — nothing else.
        </div>

        <div className="mt-7">
          <ButtonLink to={`/scan?predicate=${predicateParam}`} variant="primary" size="lg">
            Scan ID &amp; Generate Proof <ArrowRightIcon size={18} />
          </ButtonLink>
        </div>
      </div>
    </Shell>
  );
}
