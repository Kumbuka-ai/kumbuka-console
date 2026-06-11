"use client";

/**
 * Lightweight popover menu — positioned at the click coordinates, closes
 * on outside click / Escape. Matches the prototype's .menu styling.
 */
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";

export type MenuItem =
  | { kind: "sep" }
  | {
      kind?: "item";
      label: string;
      icon?: IconName;
      onSelect: () => void;
      disabled?: boolean;
      danger?: boolean;
    };

type Anchor = { x: number; y: number; placement?: "below" };

export function useMenu() {
  const [open, setOpen] = useState<{ anchor: Anchor; items: MenuItem[] } | null>(null);

  return {
    open: (e: { clientX: number; clientY: number }, items: MenuItem[]) =>
      setOpen({ anchor: { x: e.clientX, y: e.clientY, placement: "below" }, items }),
    close: () => setOpen(null),
    node: open ? <Menu items={open.items} anchor={open.anchor} onClose={() => setOpen(null)} /> : null,
  };
}

function Menu({ items, anchor, onClose }: Readonly<{ items: MenuItem[]; anchor: Anchor; onClose: () => void }>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target;
      if (target instanceof Node && !ref.current?.contains(target)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const left = Math.min(anchor.x, globalThis.window === undefined ? 9999 : globalThis.window.innerWidth - 200);
  const top = Math.min(anchor.y + 4, globalThis.window === undefined ? 9999 : globalThis.window.innerHeight - 200);

  return (
    <div className="menu" ref={ref} role="menu" style={{ left, top }}>
      {items.map((it, i) => {
        if (it.kind === "sep") return <div className="sep" key={`s-${i}`} />;
        return (
          <button
            key={`${it.label}-${i}`}
            type="button"
            role="menuitem"
            className={it.danger ? "danger" : undefined}
            disabled={it.disabled}
            onClick={() => {
              onClose();
              it.onSelect();
            }}
          >
            {it.icon ? <Icon name={it.icon} /> : null}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
