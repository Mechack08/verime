interface IconProps {
  size?: number;
  className?: string;
}

const base = (size: number, className: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
  "aria-hidden": true,
});

export function ScanIcon({ size = 22, className = "" }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </svg>
  );
}

export function ShieldIcon({ size = 22, className = "" }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3 5 6v5c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function EyeOffIcon({ size = 22, className = "" }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c5 0 9 5 9 8a12 12 0 0 1-1.7 2.7M6.6 6.6C3.9 8.2 2 11 2 12c0 3 4 8 9 8 1.6 0 3-.4 4.3-1.1" />
      <path d="m3 3 18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function LinkIcon({ size = 22, className = "" }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
    </svg>
  );
}

export function KeyIcon({ size = 22, className = "" }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="7.5" cy="15.5" r="3.5" />
      <path d="m10 13 8-8M16 7l2 2M18.5 4.5l1.5 1.5" />
    </svg>
  );
}

export function QrIcon({ size = 22, className = "" }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3M21 14v.01M14 21h.01M21 21v-3h-3M17 21h.01" />
    </svg>
  );
}

export function CheckIcon({ size = 22, className = "" }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
