"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { ScopeEditor } from "@/components/editors/ScopeEditor";
import type { ScopeView } from "@/lib/api/types";

/**
 * How many scopes the band shows before it collapses to a summary + a live
 * filter. ONE constant on purpose: `many`, the collapsed slice, and the
 * "+N more" count must stay equal or the band's height jumps. Production
 * value — the design prototype ran at 5 so the collapsed state was visible in
 * a 6-scope demo dataset; 8–10 is the realistic production threshold.
 */
export const SCOPE_LIMIT = 8;

/**
 * Block 2 — "Anweisung für den Assistenten". Scope picker + the generated
 * instruction block + copy button; stays permanently visible (scopes get
 * switched). Two paths, both needed:
 *
 *  - Path A (the normal case): the block goes into the client's project
 *    instructions; the assistant loads the scope's context from the first
 *    turn of every session.
 *  - Path B (its own, subordinate step): a one-sentence copy for the
 *    ad-hoc case without project instructions.
 *
 * The block's wording is canonical and pinned by test — it is a GUEST in
 * the user's project instructions and competes with their own rules;
 * brevity is survival strategy. The gatekeeper paragraph stays verbatim
 * (it comes from a real incident). The literal slug is interpolated into
 * the SAME string that is displayed and copied, so the two cannot drift.
 */
export function InstructionBlock({ scopes }: Readonly<{ scopes: ScopeView[] }>) {
  const t = useTranslations("connect.instruction");
  const toast = useToast();
  const base = scopes.filter((s) => !s.archived);
  // Scopes created inline via the band's "Scope anlegen" button appear at once;
  // createScopeAction revalidates /overview, so each is dropped again once the
  // refreshed `scopes` prop carries it (keyed by slug — no duplicate chip).
  const [created, setCreated] = useState<ScopeView[]>([]);
  const pinnable = [...base, ...created.filter((c) => !base.some((b) => b.slug === c.slug))];
  const [slug, setSlug] = useState<string>(
    () => base.find((s) => s.kind === "global")?.slug ?? base[0]?.slug ?? "global",
  );

  const block = t("block", { slug });
  const oneOff = t("oneOff", { slug });
  const copyBlock = async () => {
    await navigator.clipboard?.writeText(block);
    toast.push({ message: t("blockCopied") });
  };
  const copyOneOff = async () => {
    await navigator.clipboard?.writeText(oneOff);
    toast.push({ message: t("sentenceCopied") });
  };

  // --- scope band: segmented chips, with a filter + collapse once there are
  // many scopes. `pinnable` is the pre-existing "not archived" set. This
  // mirrors the FEAT-53 design prototype (spec/design/console) 1:1; SCOPE_LIMIT
  // is the only intended divergence — the production threshold vs. the
  // prototype's review value of 5.
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const many = pinnable.length > SCOPE_LIMIT;
  const query = filter.trim();
  const filtered = query
    ? pinnable.filter((s) => s.slug.toLowerCase().includes(query.toLowerCase()))
    : pinnable;
  let visible = !query && !expanded && many ? filtered.slice(0, SCOPE_LIMIT) : filtered;
  // The active scope is ALWAYS visible: if it fell behind the cut or outside
  // the filter, pin it to the front and drop the last chip so the count stays
  // constant. (Per the prototype the drop happens while filtering too, which
  // can hide a live match — flagged for Concept in the handover.)
  if (!visible.some((s) => s.slug === slug)) {
    const sel = pinnable.find((s) => s.slug === slug);
    if (sel) visible = [sel, ...visible.slice(0, Math.max(0, visible.length - 1))];
  }
  const hidden = filtered.length - visible.length;

  // A scope just created via the band's editor: show it and select it at once
  // (the revalidated prop is authoritative and takes over on the next render).
  const onScopeCreated = (c: { slug: string; name: string }) => {
    setCreated((prev) => [
      ...prev,
      {
        slug: c.slug,
        name: c.name,
        kind: "project",
        fixed: false,
        archived: false,
        locked: false,
        description: null,
        entryCount: 0,
        createdAt: new Date().toISOString(),
      },
    ]);
    setSlug(c.slug);
    setFilter("");
    setExpanded(true);
  };

  return (
    <div className="iblock" id="connect-instruction">
      <div className="iblock-intro">
        <h3 className="cw-box-title">
          <span className="cw-box-step">2</span>
          {t("title")}
        </h3>
        <p>{t("intro")}</p>
      </div>
      {/* Scope band — the scope choice as a visible decision, not a form
          field: it drives the context key in BOTH copy blocks below. */}
      <div className="scope-band" role="radiogroup" aria-label={t("scopeLabel")}>
        <div className="sb-head">
          <span className="sb-eyebrow">{`// ${t("scopeLabel")}`}</span>
          <span className="sb-ask">{t("scopeAsk")}</span>
          {many && (
            <input
              type="search"
              className="sb-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("scopeFilter")}
              aria-label={t("scopeFilter")}
            />
          )}
        </div>
        <div className="sb-chips">
          {visible.map((s) => (
            <button
              key={s.slug}
              type="button"
              role="radio"
              aria-checked={s.slug === slug}
              className={"sb-chip" + (s.slug === slug ? " on" : "")}
              onClick={() => setSlug(s.slug)}
            >
              <span className="sb-chip-key">{s.slug}</span>
              {s.kind === "global" && (
                <span className="sb-chip-note">{t("scopeOrgShort")}</span>
              )}
            </button>
          ))}
          {hidden > 0 && (
            <button type="button" className="sb-more" onClick={() => setExpanded(true)}>
              {t("scopeMore", { count: hidden })}
            </button>
          )}
          {expanded && !query && many && (
            <button type="button" className="sb-more" onClick={() => setExpanded(false)}>
              {t("scopeLess")}
            </button>
          )}
          {visible.length === 0 && <span className="sb-empty">{t("scopeNone")}</span>}
        </div>
        <div className="sb-add-row">
          <button type="button" className="sb-add" onClick={() => setNewOpen(true)}>
            <Icon name="plus" />
            {t("scopeAdd")}
          </button>
          <span className="sb-add-hint">{t("scopeAddHint")}</span>
        </div>
        <p className="sb-foot">{t("scopeFoot")}</p>
      </div>

      {/* Path A — the normal case */}
      <div className="iblock-step">
        <div className="ib-step-head">
          <span className="ib-step-tag">{t("pathATag")}</span>
          <span className="ib-step-title">{t("pathATitle")}</span>
        </div>
        <p className="ib-step-lead">{t("pathALead")}</p>
        <div className="iblock-out">
          <pre className="iblock-code">
            <code>{block}</code>
          </pre>
          <button
            className="iblock-copy"
            onClick={copyBlock}
            aria-label={t("copyBlock")}
            title={t("copyBlock")}
            type="button"
          >
            <Icon name="copy" />
          </button>
        </div>
      </div>

      {/* Path B — subordinate convenience alternative */}
      <div className="iblock-step subordinate">
        <div className="ib-step-head">
          <span className="ib-step-tag">{t("pathBTag")}</span>
          <span className="ib-step-title">{t("pathBTitle")}</span>
        </div>
        <p className="ib-step-lead">{t("pathBLead")}</p>
        <div className="iblock-out small">
          <pre className="iblock-code">
            <code>{oneOff}</code>
          </pre>
          <button
            className="iblock-copy"
            onClick={copyOneOff}
            aria-label={t("copySentence")}
            title={t("copySentence")}
            type="button"
          >
            <Icon name="copy" />
          </button>
        </div>
      </div>

      {newOpen && (
        <ScopeEditor
          scope={null}
          existingSlugs={pinnable.map((s) => s.slug)}
          onClose={() => setNewOpen(false)}
          onCreated={onScopeCreated}
        />
      )}
    </div>
  );
}
