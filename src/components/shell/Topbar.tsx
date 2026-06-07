import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import type { Theme } from "@/lib/theme";

export function Topbar({
  title,
  meta,
  theme,
  trailing,
}: {
  title: string;
  meta: string;
  theme: Theme;
  trailing?: ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="crumb">
        <h1>{title}</h1>
        <span className="crumb-meta">// {meta}</span>
      </div>
      <span className="topbar-spacer" />
      {trailing}
      <ThemeToggle theme={theme} />
    </header>
  );
}
