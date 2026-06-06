interface LogoProps {
  size?: number;
  className?: string;
  /** Render the wordmark next to the glyph. */
  withWordmark?: boolean;
}

/**
 * VeriMe brand mark — a shield (trust) enclosing a keyhole formed from a
 * zero ("zero-knowledge") and a verifying check. Violet→cyan gradient.
 */
export function Logo({ size = 28, className = "", withWordmark = false }: LogoProps) {
  const glyph = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="vm-logo-grad" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A892FF" />
          <stop offset="1" stopColor="#38E0D0" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5 4.5 6.4v8.1c0 6.6 4.4 12.2 11.5 14.9 7.1-2.7 11.5-8.3 11.5-14.9V6.4L16 2.5Z"
        stroke="url(#vm-logo-grad)"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="rgba(124,92,252,0.08)"
      />
      <circle cx="16" cy="14" r="4" stroke="url(#vm-logo-grad)" strokeWidth="1.8" />
      <path
        d="M16 18v3.5"
        stroke="url(#vm-logo-grad)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );

  if (!withWordmark) return glyph;

  return (
    <span className="inline-flex items-center gap-2">
      {glyph}
      <span className="text-base font-semibold tracking-tight">
        veri<span className="gradient-text">me</span>
      </span>
    </span>
  );
}
