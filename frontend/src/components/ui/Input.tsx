import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string | undefined;
  error?: string | undefined;
}

export function Input({ label, error, id, className = "", ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={[
          "w-full bg-[var(--color-surface-raised)] border text-[var(--color-ink)] px-3 py-2 text-sm rounded-[var(--radius-sm)]",
          "placeholder:text-[var(--color-text-subtle)]",
          "transition-colors outline-none",
          error
            ? "border-[var(--color-fail)]"
            : "border-[var(--color-border)] focus:border-[var(--color-violet)]",
          className,
        ].join(" ")}
        {...rest}
      />
      {error && <p className="text-xs text-[var(--color-fail)]">{error}</p>}
    </div>
  );
}
