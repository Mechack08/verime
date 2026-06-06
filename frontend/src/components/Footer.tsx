import { Link } from "react-router-dom";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] mt-8">
      <div className="mx-auto max-w-4xl px-4 py-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Logo size={20} />
          <span className="text-sm text-[var(--color-text-muted)]">
            veri<span className="text-[var(--color-ink)]">me</span>
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--color-text-muted)]">
          <Link to="/scan" className="hover:text-[var(--color-ink)] transition-colors">
            Scan ID
          </Link>
          <Link to="/credentials" className="hover:text-[var(--color-ink)] transition-colors">
            Credentials
          </Link>
          <a
            href="https://docs.midnight.network"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--color-ink)] transition-colors"
          >
            Midnight Docs
          </a>
        </nav>

        <p className="text-xs text-[var(--color-text-subtle)]">
          Client-side · No backend · Your keys stay yours
        </p>
      </div>
    </footer>
  );
}
