"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";

export function CopyValue({ value, masked }: Readonly<{ value: string; masked?: boolean }>) {
  const toast = useToast();
  const t = useTranslations("common");
  const copy = async () => {
    await navigator.clipboard?.writeText(value);
    toast.push({ message: t("copied") });
  };
  return (
    <div className="row">
      <span className={`val${masked ? " mask" : ""}`}>{value}</span>
      <button className="conn-copy" onClick={copy} aria-label={t("copy")} type="button">
        <Icon name="copy" />
      </button>
    </div>
  );
}
