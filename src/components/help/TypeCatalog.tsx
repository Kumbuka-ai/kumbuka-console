"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { TypeChip } from "@/components/ui/Chip";
import { HELP_TYPES, TYPE_TEACHING_ORDER } from "@/help/types-manifest";
import type { Locale } from "@/i18n/config";
import type { EntryType } from "@/lib/api/types";

/**
 * The `[type-catalog]` block — one collapsible row per type in
 * TYPE_TEACHING_ORDER. Collapsed: the type chip plus its meaning.
 * Expanded: the example (a sentence a human says to their assistant,
 * never a tool call) and the entry that comes out of it, rendered as an
 * entry rather than prose.
 *
 * Each row carries `id={type}` — the deep-link target the connect area's
 * usage examples point at (/help/types#decision). A client island inside
 * the server-rendered section page: the rows toggle, and the row a hash
 * names must open, not merely exist.
 */
export function TypeCatalog({ locale }: Readonly<{ locale: Locale }>) {
  const t = useTranslations("help.catalog");
  const [open, setOpen] = useState<Partial<Record<EntryType, boolean>>>({});

  useEffect(() => {
    // Expand and reveal the row a deep link names — on load and on every
    // in-page hash change (the browser alone would scroll to a collapsed,
    // near-invisible row).
    const apply = () => {
      const slug = window.location.hash.slice(1) as EntryType;
      if (!TYPE_TEACHING_ORDER.includes(slug)) return;
      setOpen((o) => ({ ...o, [slug]: true }));
      requestAnimationFrame(() => {
        document.getElementById(slug)?.scrollIntoView({ block: "start" });
      });
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  return (
    <div className="hd-cat">
      {TYPE_TEACHING_ORDER.map((type) => {
        const entry = HELP_TYPES[type];
        const expanded = open[type] === true;
        return (
          <div className="hd-cat-row" id={type} key={type}>
            <button
              type="button"
              className="hd-cat-head"
              aria-expanded={expanded}
              onClick={() => setOpen((o) => ({ ...o, [type]: !expanded }))}
            >
              <TypeChip type={type} boxed />
              <span className="hd-cat-meaning">{entry.meaning[locale]}</span>
              <Icon name={expanded ? "chevUp" : "chevDown"} className="ico hd-cat-chev" />
            </button>
            {expanded ? (
              <div className="hd-cat-body">
                <p className="hd-cat-say">„{entry.example[locale]}“</p>
                <div className="hd-cat-entry">
                  <span className="hd-cat-entry-label">{t("resultLabel")}</span>
                  <div className="hd-cat-entry-head">
                    <TypeChip type={type} boxed />
                    <code className="hd-cat-key">{entry.result.key}</code>
                  </div>
                  <p className="hd-cat-content">{entry.result.content[locale]}</p>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
