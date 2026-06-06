import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--color-violet)] text-white shadow-[0_8px_24px_-10px_var(--color-violet-glow)] hover:bg-[var(--color-violet-soft)] hover:shadow-[0_10px_30px_-8px_var(--color-violet-glow)] active:bg-[var(--color-violet-dim)] active:translate-y-px disabled:opacity-40 disabled:shadow-none",
  secondary:
    "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)] disabled:opacity-40",
  ghost:
    "text-[var(--color-text-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40",
  danger:
    "border border-[var(--color-fail)] text-[var(--color-fail)] hover:bg-[var(--color-fail-soft)] disabled:opacity-40",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-xs rounded-[var(--radius-sm)]",
  md: "px-4 py-2 text-sm rounded-[var(--radius)]",
  lg: "px-6 py-3 text-base rounded-[var(--radius)]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled ?? loading}
      className={[
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 cursor-pointer select-none disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}

function Spinner({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="31.4"
        strokeDashoffset="10"
        opacity="0.3"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="10 21.4"
      />
    </svg>
  );
}
