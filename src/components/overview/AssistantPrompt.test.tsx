import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { AssistantPrompt } from "./AssistantPrompt";
import type { ScopeView } from "@/lib/api/types";

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeText.mockClear();
  Object.assign(navigator, { clipboard: { writeText } });
});

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

const SCOPES: ScopeView[] = [
  scope("global", "global"),
  scope("gartenarbeit", "project"),
  scope("billing-platform", "project"),
];

function renderPrompt(scopes: ScopeView[] = SCOPES) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <AssistantPrompt scopes={scopes} />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

describe("AssistantPrompt — thin per-scope block (D-GTM-6 B)", () => {
  it("renders the heading and the load_context trigger", () => {
    renderPrompt();
    expect(screen.getByText("Prime your assistant")).toBeTruthy();
    expect(screen.getByText(/memory_load_context/)).toBeTruthy();
  });

  it("defaults the pin to the first PROJECT scope and pins its slug LITERALLY", () => {
    renderPrompt();
    const code = screen.getByText(/memory_load_context/);
    // literal slug of the default (first project) scope, inside the call
    expect(code.textContent).toContain("`memory_load_context` with the scope `gartenarbeit`");
  });

  it("carries the canonical block: gatekeeper guard + the remember offer, no recall", () => {
    renderPrompt();
    const code = screen.getByText(/memory_load_context/);
    // the gatekeeper paragraph stays verbatim (it comes from a real incident)
    expect(code.textContent).toMatch(/gatekeeper/i);
    expect(code.textContent).toMatch(/decides WHAT gets captured/i);
    // read AND propose: without the remember offer the memory stays empty
    expect(code.textContent).toContain("memory_remember");
    // recall is redundant (the digest already sits in the context window)
    expect(code.textContent).not.toContain("memory_recall");
  });

  it("NEGATIVE (Sprint-19 hard rule): never a derived 'project name' reference", () => {
    renderPrompt();
    const code = screen.getByText(/memory_load_context/);
    expect(code.textContent).not.toMatch(/project name/i);
    expect(code.textContent).not.toMatch(/projektname/i);
  });

  it("copies the displayed block verbatim, with the literal slug", async () => {
    renderPrompt();
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain("memory_load_context");
    expect(copied).toContain("`gartenarbeit`");
    expect(copied).not.toMatch(/project name/i);
    // display and clipboard match
    expect(screen.getByText(/memory_load_context/).textContent).toBe(copied);
    expect(await screen.findByText(/Instructions copied/i)).toBeTruthy();
  });

  it("the scope picker re-pins the slug literally for another scope", () => {
    renderPrompt();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "billing-platform" } });
    const code = screen.getByText(/memory_load_context/);
    expect(code.textContent).toContain("`memory_load_context` with the scope `billing-platform`");
    expect(code.textContent).not.toContain("`gartenarbeit`");
  });

  it("with no project scopes, falls back to the global scope and shows no picker", () => {
    renderPrompt([scope("global", "global")]);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText(/memory_load_context/).textContent).toContain("scope `global`");
  });
});
