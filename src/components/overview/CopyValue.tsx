"use client";

import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";

export function CopyValue({ value, masked }: Readonly<{ value: string; masked?: boolean }>) {
  const toast = useToast();
  const copy = async () => {
    await navigator.clipboard?.writeText(value);
    toast.push({ message: "Copied to clipboard" });
  };
  return (
    <div className="row">
      <span className={`val${masked ? " mask" : ""}`}>{value}</span>
      <button className="conn-copy" onClick={copy} aria-label="Copy" type="button">
        <Icon name="copy" />
      </button>
    </div>
  );
}
