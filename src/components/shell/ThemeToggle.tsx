"use client";

import { Icon } from "@/components/ui/Icon";
import { Seg, SegButton } from "@/components/ui/Seg";
import { setThemeAction } from "@/app/(app)/actions";
import { useTransition } from "react";
import type { Theme } from "@/lib/theme";

export function ThemeToggle({ theme }: { theme: Theme }) {
  const [pending, start] = useTransition();
  const apply = (t: Theme) => {
    if (t === theme) return;
    // Optimistic: flip the attribute immediately so the swap feels instant.
    document.documentElement.setAttribute("data-theme", t);
    start(() => {
      void setThemeAction(t);
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
