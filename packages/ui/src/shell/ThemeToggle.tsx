"use client";

import { useTransition } from "react";
import { Icon } from "../primitives/Icon";
import { Seg, SegButton } from "../primitives/Seg";

export type Theme = "light" | "dark";

/**
 * Theme toggle. The library is persistence-agnostic — `onApply` is
 * called with the chosen theme, and the consumer decides whether to
 * cookie it, persist it via a server action, or both.
 */
export function ThemeToggle({
  theme,
  onApply,
}: Readonly<{
  theme: Theme;
  onApply: (next: Theme) => void | Promise<void>;
}>) {
  const [pending, start] = useTransition();
  const apply = (next: Theme) => {
    if (next === theme || pending) return;
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = next;
    }
    start(() => {
      void onApply(next);
    });
  };
  return (
    <Seg ariaLabel="Theme">
      <SegButton on={theme === "light"} onClick={() => apply("light")} title="Light">
        <Icon name="sun" />
      </SegButton>
      <SegButton on={theme === "dark"} onClick={() => apply("dark")} title="Dark">
        <Icon name="moon" />
      </SegButton>
    </Seg>
  );
}
