/**
 * Block-2 contract. The heart of it: the German instruction block is
 * CHARACTER-IDENTICAL to the canonical template (tokens excepted) — the
 * template is production-proven wording; silent drift is the failure
 * mode this test exists for. Companion pins: the remember offer and the
 * gatekeeper paragraph are load-bearing (never optional), recall stays
 * out, and both paths copy exactly what they display.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import de from "@/i18n/messages/de.json";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { InstructionBlock, SCOPE_LIMIT } from "./InstructionBlock";
import type { ScopeView } from "@/lib/api/types";

// The band's "Scope anlegen" button reuses the real ScopeEditor, which calls
// the create-scope server action. Stub it so the flow resolves in jsdom without
// a network round-trip; the real DB write path is covered by the server suite.
const createScopeAction = vi.fn(async () => ({ ok: true }) as const);
vi.mock("@/app/(app)/actions", () => ({
  createScopeAction: () => createScopeAction(),
  renameScopeAction: async () => ({ ok: true }) as const,
}));

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

  it("re-pins the literal slug when a scope chip is clicked", () => {
    renderBlock("de", [scope("kumbuka", "global"), scope("atlas", "project")]);
    fireEvent.click(screen.getByRole("radio", { name: /^atlas$/ }));
    const code = screen.getByText(/memory_load_context/);
    expect(code.textContent).toContain("`atlas`");
    expect(code.textContent).not.toContain("`kumbuka`");
  });
});

/** n scopes: the global one first, then n-1 projects (svc-1 … svc-(n-1)). */
function manyScopes(n: number): ScopeView[] {
  const list = [scope("global", "global")];
  for (let i = 1; i < n; i++) list.push(scope(`svc-${i}`, "project"));
  return list;
}

describe("InstructionBlock — the scope band", () => {
  it("is a radiogroup with a radio per scope; global is active and noted org-wide", () => {
    renderBlock("de", [scope("kumbuka", "global"), scope("atlas", "project")]);
    expect(screen.getByRole("radiogroup")).toBeTruthy();
    const globalChip = screen.getByRole("radio", { name: /kumbuka/i });
    expect(globalChip.getAttribute("aria-checked")).toBe("true");
    expect(within(globalChip).getByText("organisationsweit")).toBeTruthy();
    const atlasChip = screen.getByRole("radio", { name: /^atlas$/ });
    expect(atlasChip.getAttribute("aria-checked")).toBe("false");
    expect(within(atlasChip).queryByText("organisationsweit")).toBeNull();
  });

  it("shows every chip and no filter/toggle at or below the limit", () => {
    renderBlock("de", manyScopes(SCOPE_LIMIT)); // exactly 8, not "many"
    expect(screen.getAllByRole("radio")).toHaveLength(SCOPE_LIMIT);
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /weitere|weniger zeigen/i })).toBeNull();
  });

  it("collapses beyond the limit to SCOPE_LIMIT chips + a '+N weitere' toggle, and expands", () => {
    renderBlock("de", manyScopes(SCOPE_LIMIT + 4)); // > limit; hidden = 4
    expect(screen.getAllByRole("radio")).toHaveLength(SCOPE_LIMIT);
    const more = screen.getByRole("button", { name: /4 weitere/i }); // 12 - 8
    fireEvent.click(more);
    expect(screen.getAllByRole("radio")).toHaveLength(12);
    fireEvent.click(screen.getByRole("button", { name: /weniger zeigen/i }));
    expect(screen.getAllByRole("radio")).toHaveLength(SCOPE_LIMIT);
  });

  it("filters live and beats collapse (matches shown, no toggle)", () => {
    renderBlock("de", manyScopes(SCOPE_LIMIT + 4));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "svc-1" } });
    // svc-1, svc-10, svc-11 match; a non-match is gone; no collapse toggle
    expect(screen.getByRole("radio", { name: /^svc-1$/ })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: /^svc-2$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /weitere|weniger zeigen/i })).toBeNull();
  });

  it("keeps the active scope pinned when it is filtered out, without the empty message", () => {
    renderBlock("de", manyScopes(SCOPE_LIMIT + 4)); // active = global
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzzz" } });
    // Rule 1: active 'global' stays pinned; Rule 2: no empty message beside it
    expect(screen.getByRole("radio", { name: /global/i })).toBeTruthy();
    expect(screen.queryByText(/kein scope passt/i)).toBeNull();
  });

  it("shows the empty message only when nothing is visible at all", () => {
    renderBlock("de", [{ ...scope("global", "global"), archived: true }]);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.getByText(/kein scope passt zum filter/i)).toBeTruthy();
  });

  it("localises the band (EN)", () => {
    renderBlock("en", manyScopes(SCOPE_LIMIT + 4));
    expect(screen.getByRole("radiogroup", { name: /scope/i })).toBeTruthy();
    expect((screen.getByRole("searchbox") as HTMLInputElement).placeholder).toBe("Filter scopes");
    expect(screen.getByRole("button", { name: /4 more/i })).toBeTruthy();
  });
});

describe("InstructionBlock — create scope from the band", () => {
  beforeEach(() => createScopeAction.mockClear());

  it("shows the 'Scope anlegen' button + hint and opens the scope editor", () => {
    renderBlock("de", [scope("kumbuka", "global")]);
    expect(screen.getByText(/leg ihn hier an/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /scope anlegen/i }));
    // the reused ScopeEditor is now open (its create submit button is present)
    expect(screen.getByRole("button", { name: /^scope erstellen$/i })).toBeTruthy();
  });

  it("focuses the first text field on open, not the header close button", async () => {
    renderBlock("de", [scope("kumbuka", "global")]);
    fireEvent.click(screen.getByRole("button", { name: /scope anlegen/i }));
    const nameField = screen.getByPlaceholderText("z. B. Billing Platform");
    await waitFor(() => expect(document.activeElement).toBe(nameField));
  });

  it("creates a scope inline, then selects it and clears the filter", async () => {
    renderBlock("de", [scope("kumbuka", "global"), scope("atlas", "project")]);
    fireEvent.click(screen.getByRole("button", { name: /scope anlegen/i }));
    fireEvent.change(screen.getByPlaceholderText("z. B. Billing Platform"), {
      target: { value: "Billing" },
    });
    fireEvent.change(screen.getByPlaceholderText("billing-platform"), {
      target: { value: "billing" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^scope erstellen$/i }));

    await waitFor(() => expect(createScopeAction).toHaveBeenCalledTimes(1));
    // the new scope is now a chip AND the active selection
    await waitFor(() => {
      const chip = screen.getByRole("radio", { name: /^billing$/i });
      expect(chip.getAttribute("aria-checked")).toBe("true");
    });
    // and the instruction block re-pins to the new slug
    expect(screen.getByText(/memory_load_context/).textContent).toContain("`billing`");
  });

  it("submits the editor on Enter in a field (shared ScopeEditor — both surfaces)", async () => {
    renderBlock("de", [scope("kumbuka", "global")]);
    fireEvent.click(screen.getByRole("button", { name: /scope anlegen/i }));
    fireEvent.change(screen.getByPlaceholderText("z. B. Billing Platform"), {
      target: { value: "Billing" },
    });
    const slugField = screen.getByPlaceholderText("billing-platform");
    fireEvent.change(slugField, { target: { value: "billing" } });
    fireEvent.keyDown(slugField, { key: "Enter" });

    await waitFor(() => expect(createScopeAction).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /^billing$/i }).getAttribute("aria-checked")).toBe("true"),
    );
  });
});
