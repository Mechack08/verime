interface BadgeProps {
  variant: "ok" | "warn" | "fail" | "neutral" | "violet";
  children: React.ReactNode;
}

const variantClasses: Record<BadgeProps["variant"], string> = {
  ok:      "bg-[var(--color-ok-soft)] text-[var(--color-ok)] border-[var(--color-ok)]",
  warn:    "bg-[var(--color-warn-soft)] text-[var(--color-warn)] border-[var(--color-warn)]",
  fail:    "bg-[var(--color-fail-soft)] text-[var(--color-fail)] border-[var(--color-fail)]",
  neutral: "bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-[var(--color-border)]",
  violet:  "bg-[var(--color-violet-ghost)] text-[var(--color-violet-soft)] border-[var(--color-violet)]",
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-medium tracking-wide uppercase rounded-full",
        variantClasses[variant],
      ].join(" ")}
    >
      {children}
    </span>
  );
}
