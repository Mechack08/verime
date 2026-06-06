import { Topbar } from "@/components/Topbar";
import { Footer } from "@/components/Footer";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Logo } from "@/components/Logo";
import {
  ScanIcon,
  EyeOffIcon,
  LinkIcon,
  KeyIcon,
  ShieldIcon,
  ArrowRightIcon,
} from "@/components/icons";
import { useWalletContext } from "@/contexts/WalletContext";

const steps = [
  {
    icon: ScanIcon,
    title: "Scan your ID",
    body: "Your webcam reads the MRZ strip locally. Only the birth year is kept — the image is never stored or uploaded.",
  },
  {
    icon: KeyIcon,
    title: "Pick a predicate",
    body: "Choose what to prove — “Over 18”, “Between 18 and 35”, or any custom range. A per-predicate secret is derived in-browser.",
  },
  {
    icon: ShieldIcon,
    title: "Generate the proof",
    body: "A zero-knowledge proof is computed and a single 32-byte commitment is produced — optionally recorded on the Midnight ledger.",
  },
];

const privacy = [
  {
    icon: EyeOffIcon,
    label: "Stays on your device",
    value: "Birth year, document number, nationality, the raw photo, and your master secret.",
    tone: "cyan" as const,
  },
  {
    icon: LinkIcon,
    label: "Goes on-chain",
    value: "One 32-byte commitment — computationally unlinkable to you without your private key.",
    tone: "violet" as const,
  },
];

export default function Home() {
  const { status } = useWalletContext();

  return (
    <div className="min-h-dvh app-bg flex flex-col">
      <Topbar />

      <main className="mx-auto w-full max-w-4xl px-4 flex-1">
        {/* ── Hero ── */}
        <section className="pt-20 pb-16 sm:pt-28 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="animate-rise">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-1 text-xs text-[var(--color-text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-violet)] shadow-[0_0_8px_var(--color-violet)]" />
              Zero-Knowledge · Midnight Network
            </div>

            <h1 className="mt-5 text-4xl sm:text-5xl font-semibold leading-[1.05] tracking-tight text-[var(--color-ink)]">
              Prove your age.
              <br />
              <span className="gradient-text">Reveal nothing else.</span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--color-text-muted)]">
              VeriMe generates a zero-knowledge proof that your age satisfies a
              predicate — without disclosing your date of birth, document number,
              or nationality. Every computation happens in your browser.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/scan" variant="primary" size="lg">
                Scan ID <ArrowRightIcon size={18} />
              </ButtonLink>
              <ButtonLink to="/credentials" variant="secondary" size="lg">
                My Credentials
              </ButtonLink>
            </div>

            {status === "connected" && (
              <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-[var(--color-ok)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ok)]" />
                Wallet connected — proofs can be recorded on-chain.
              </p>
            )}
          </div>

          {/* Hero visual: a "credential" card */}
          <div className="animate-fade-in">
            <HeroCard />
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="py-12 border-t border-[var(--color-border)]">
          <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-subtle)] mb-8">
            How it works
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="vm-card vm-card-interactive p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-violet-ghost)] text-[var(--color-violet-soft)]">
                    <Icon size={20} />
                  </span>
                  <span className="font-mono text-xs text-[var(--color-text-subtle)]">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-1.5">{title}</h3>
                <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Privacy model ── */}
        <section className="py-12 border-t border-[var(--color-border)]">
          <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-subtle)] mb-8">
            What is private, what is public
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {privacy.map(({ icon: Icon, label, value, tone }) => (
              <div key={label} className="vm-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={[
                      "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border",
                      tone === "cyan"
                        ? "border-[var(--color-cyan)]/40 bg-[var(--color-cyan-ghost)] text-[var(--color-cyan-soft)]"
                        : "border-[var(--color-violet)]/40 bg-[var(--color-violet-ghost)] text-[var(--color-violet-soft)]",
                    ].join(" ")}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="text-sm font-semibold text-[var(--color-ink)]">{label}</span>
                </div>
                <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{value}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function HeroCard() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[var(--radius-xl)] bg-[radial-gradient(circle_at_70%_30%,var(--color-violet-glow),transparent_70%)] blur-2xl" />
      <div className="relative vm-card p-6 glow-violet">
        <div className="flex items-center justify-between">
          <Logo size={32} withWordmark />
          <span className="rounded-full border border-[var(--color-violet)]/40 bg-[var(--color-violet-ghost)] px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-[var(--color-violet-soft)]">
            Verified
          </span>
        </div>

        <div className="mt-6">
          <div className="text-xs uppercase tracking-wide text-[var(--color-text-subtle)]">
            Predicate
          </div>
          <div className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">Over 18</div>
        </div>

        <div className="mt-5 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
          <div className="text-xs uppercase tracking-wide text-[var(--color-text-subtle)] mb-1.5">
            On-chain commitment
          </div>
          <div className="font-commit text-[var(--color-cyan-soft)]">
            13c5b96e80bab1608451d9b37c41e2a2
            <br />
            806e4ecbe2b7471f739afa0da287d37a
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <ShieldIcon size={14} className="text-[var(--color-ok)]" />
          No birth date, name, or document number disclosed.
        </div>
      </div>
    </div>
  );
}
