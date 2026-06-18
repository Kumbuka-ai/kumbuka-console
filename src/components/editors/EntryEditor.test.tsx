import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { EntryEditor } from "./EntryEditor";
import type { ScopeView } from "@/lib/api/types";

// Editor imports server actions; stub them (jsdom can't reach the BFF).
vi.mock("@/app/(app)/actions", () => ({
  createEntryAction: vi.fn(),
  updateEntryAction: vi.fn(),
}));

const SCOPE: ScopeView = {
  slug: "atlas-web",
  name: "Atlas Web",
  kind: "project",
  fixed: false,
  archived: false,
  description: null,
  entryCount: 0,
  createdAt: "2026-06-18T00:00:00Z",
};

function renderEditor() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <EntryEditor entry={null} scope={SCOPE} onClose={() => {}} />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

const keyField = () => screen.getByPlaceholderText(/db\.system-of-record/i) as HTMLInputElement;
const saveBtn = () => screen.getByRole("button", { name: /create/i }) as HTMLButtonElement;

describe("EntryEditor — inline key validation (dogfood-17, mirrors E2E-06)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flags an underscore key live and blocks save", () => {
    renderEditor();
    // content must be present so the save gate isolates the key validity
    const content = screen.getAllByRole("textbox").find((el) => el.tagName === "TEXTAREA")!;
    fireEvent.change(content, { target: { value: "We use Postgres." } });

    fireEvent.change(keyField(), { target: { value: "open_question.teich" } });
    // underscore is invalid → inline error shown + save disabled
    expect(screen.getByRole("alert").textContent).toMatch(/no underscores/i);
    expect(keyField().getAttribute("aria-invalid")).toBe("true");
    expect(saveBtn().disabled).toBe(true);
  });

  it("accepts a valid dot/hyphen key (no error, save enabled)", () => {
    renderEditor();
    const content = screen.getAllByRole("textbox").find((el) => el.tagName === "TEXTAREA")!;
    fireEvent.change(content, { target: { value: "We use Postgres." } });

    fireEvent.change(keyField(), { target: { value: "db.system-of-record" } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(keyField().getAttribute("aria-invalid")).toBeNull();
    expect(saveBtn().disabled).toBe(false);
  });

  it("empty key is allowed (key is optional)", () => {
    renderEditor();
    const content = screen.getAllByRole("textbox").find((el) => el.tagName === "TEXTAREA")!;
    fireEvent.change(content, { target: { value: "We use Postgres." } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(saveBtn().disabled).toBe(false);
  });
});
