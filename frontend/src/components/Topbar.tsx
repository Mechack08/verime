// Topbar — shows the app name and wallet connection status.
import { Link, useLocation } from "react-router-dom";
import { useWalletContext } from "@/contexts/WalletContext";
import { Button } from "./ui/Button";
import { Logo } from "./Logo";

export function Topbar() {
  const { status, shieldedAddress, connect, disconnect, availableWallets } = useWalletContext();
  const { pathname } = useLocation();

  const addressDisplay = shieldedAddress
    ? `${shieldedAddress.slice(0, 8)}…${shieldedAddress.slice(-6)}`
    : null;

  const navItems = [
    { to: "/scan", label: "Scan ID" },
    { to: "/credentials", label: "Credentials" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-void)]/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link
          to="/"
          className="group inline-flex items-center gap-2 transition-opacity hover:opacity-90"
          aria-label="verime home"
        >
          <Logo size={26} />
          <span className="text-base font-semibold tracking-tight text-[var(--color-ink)]">
            veri<span className="gradient-text">me</span>
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1 text-xs">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors",
                  active
                    ? "text-[var(--color-ink)] bg-[var(--color-surface-hover)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-ink)]",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div>
          {status === "connected" && addressDisplay ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ok)] shadow-[0_0_8px_var(--color-ok)]" />
                <span className="font-commit text-[var(--color-text-muted)]">{addressDisplay}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={disconnect}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              loading={status === "connecting"}
              disabled={availableWallets.length === 0 && status !== "error"}
              onClick={() => connect()}
            >
              {status === "error" ? "Retry" : "Connect Wallet"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
