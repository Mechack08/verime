import { Link } from "react-router-dom";
import type { LinkProps } from "react-router-dom";

interface ButtonLinkProps extends Omit<LinkProps, "className"> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const variantClasses: Record<NonNullable<ButtonLinkProps["variant"]>, string> = {
  primary:
    "bg-[var(--color-violet)] text-white shadow-[0_8px_24px_-10px_var(--color-violet-glow)] hover:bg-[var(--color-violet-soft)] hover:shadow-[0_10px_30px_-8px_var(--color-violet-glow)] active:bg-[var(--color-violet-dim)] active:translate-y-px",
  secondary:
    "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)]",
  ghost:
    "text-[var(--color-text-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)]",
  danger:
    "border border-[var(--color-fail)] text-[var(--color-fail)] hover:bg-[var(--color-fail-soft)]",
};

const sizeClasses: Record<NonNullable<ButtonLinkProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-xs rounded-[var(--radius-sm)]",
  md: "px-4 py-2 text-sm rounded-[var(--radius)]",
  lg: "px-6 py-3 text-base rounded-[var(--radius)]",
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={[
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 select-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </Link>
  );
}
