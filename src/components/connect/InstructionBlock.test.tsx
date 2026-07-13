/**
 * Block-2 contract. The heart of it: the German instruction block is
 * CHARACTER-IDENTICAL to the canonical template (tokens excepted) — the
 * template is production-proven wording; silent drift is the failure
 * mode this test exists for. Companion pins: the remember offer and the
 * gatekeeper paragraph are load-bearing (never optional), recall stays
 * out, and both paths copy exactly what they display.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import de from "@/i18n/messages/de.json";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { InstructionBlock } from "./InstructionBlock";
import type { ScopeView } from "@/lib/api/types";

/** The canonical template — copied here verbatim so catalog edits fail loud. */
const CANONICAL_DE = [
  "Du hast über den MCP-Konnektor Zugriff auf kumbuka — das geteilte Gedächtnis unseres Teams.",
  "",
  "Rufe zu Beginn jeder Sitzung `memory_load_context` mit dem Scope `kumbuka` auf und folge den Konventionen, die es zurückgibt — sie legen fest, wie dieses Team kumbuka nutzt.",
  "",
  "Wenn im Gespräch eine Entscheidung, Konvention oder ein Constraint entsteht, biete an, sie mit `memory_remember` festzuhalten — schlage Typ und Key vor und warte auf Bestätigung.",
  "",
  "Du bist nicht der Torwächter über Inhalte: Der Nutzer allein entscheidet, WAS festgehalten wird — du entscheidest höchstens WOHIN, und das nur durch Fragen, nie durch Ablehnen. Leite aus Scope-Namen niemals einen Zweck ab.",
].join("\n");

const CANONICAL_ONEOFF_DE = "Lade den Kontext für `kumbuka`.";

function scope(slug: string, kind: "global" | "project"): ScopeView {
  return {
    slug,
    name: slug,
    kind,
    fixed: kind === "global",
    archived: false,
    locked: false,
    description: null,
    entryCount: 0,
    createdAt: "2026-06-17T00:00:00Z",
  };
}

const writeText = vi.fn().mockResolvedValue(undefined);
beforeEach(() => {
  writeText.mockClear();
  Object.assign(navigator, { clipboard: { writeText } });
});

function renderBlock(locale: "de" | "en" = "de", scopes: ScopeView[] = [scope("kumbuka", "global")]) {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "de" ? de : en}>
      <ToastHost>
        <InstructionBlock scopes={scopes} />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

describe("InstructionBlock — the canonical template", () => {
  it("is character-identical to the canonical German template (tokens excepted)", () => {
    renderBlock("de");
    const code = screen.getByText(/memory_load_context/);
    expect(code.textContent).toBe(CANONICAL_DE);
  });

  it("path B is the canonical one-off sentence", () => {
    renderBlock("de");
    expect(screen.getByText(CANONICAL_ONEOFF_DE)).toBeTruthy();
  });

  it("uses only tool verbs that exist, and no recall", () => {
    renderBlock("en");
    const code = screen.getByText(/memory_load_context/);
    expect(code.textContent).toContain("memory_load_context");
    expect(code.textContent).toContain("memory_remember");
    expect(code.textContent).not.toContain("memory_recall");
    expect(code.textContent).not.toMatch(/memory_(search|list|write)/);
  });

  it("copies exactly what it displays, for both paths", async () => {
    renderBlock("de");
    fireEvent.click(screen.getByRole("button", { name: /block kopieren/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenLastCalledWith(CANONICAL_DE);

    fireEvent.click(screen.getByRole("button", { name: /satz kopieren/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(writeText).toHaveBeenLastCalledWith(CANONICAL_ONEOFF_DE);
  });

  it("re-pins the literal slug when the scope changes", () => {
    renderBlock("de", [scope("kumbuka", "global"), scope("atlas", "project")]);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "atlas" } });
    const code = screen.getByText(/memory_load_context/);
    expect(code.textContent).toContain("`atlas`");
    expect(code.textContent).not.toContain("`kumbuka`");
  });
});
