import type { ReactNode } from "react";

export function Seg({
  ariaLabel,
  accent = false,
  children,
}: Readonly<{
  ariaLabel: string;
  accent?: boolean;
  children: ReactNode;
}>) {
  return (
    <div className={`seg${accent ? " accent" : ""}`} role="group" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export function SegButton({
  on,
  onClick,
  title,
  children,
}: Readonly<{
  on: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}>) {
  return (
    <button className={on ? "on" : ""} onClick={onClick} aria-pressed={on} title={title} type="button">
      {children}
    </button>
  );
}
