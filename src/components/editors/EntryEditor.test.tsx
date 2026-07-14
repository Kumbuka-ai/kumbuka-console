import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { EntryEditor } from "./EntryEditor";
import { SYSTEM_SUBJECT, type EntryView, type ScopeView } from "@/lib/api/types";

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
  locked: false,
  description: null,
  entryCount: 0,
  createdAt: "2026-06-18T00:00:00Z",
};

const ENTRY: EntryView = {
  id: "e1",
  type: "decision",
  key: "ship.cadence",
  content: "We ship daily.",
  reference: null,
  authorSubject: "u-1",
  source: "console",
  createdAt: "2026-06-18T00:00:00Z",
  updatedAt: "2026-06-18T00:00:00Z",
};

function renderEditor(existingKeys: readonly string[] = []) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <EntryEditor entry={null} scope={SCOPE} existingKeys={existingKeys} onClose={() => {}} />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

function renderEditing(
  over: Partial<Parameters<typeof EntryEditor>[0]> = {},
  entry: EntryView = ENTRY,
) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <EntryEditor entry={entry} scope={SCOPE} onClose={() => {}} {...over} />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

const contentArea = () =>
  screen.getAllByRole("textbox").find((el) => el.tagName === "TEXTAREA") as HTMLTextAreaElement;

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

describe("EntryEditor — key-collision guard on a new entry (D-CORE-16, dogfood-21)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flags a key that already exists in the scope and blocks save (no silent overwrite)", () => {
    renderEditor(["db.system-of-record"]);
    const content = screen.getAllByRole("textbox").find((el) => el.tagName === "TEXTAREA")!;
    fireEvent.change(content, { target: { value: "We use Postgres." } });

    fireEvent.change(keyField(), { target: { value: "db.system-of-record" } });
    expect(screen.getByRole("alert").textContent).toMatch(/already exists/i);
    expect(keyField().getAttribute("aria-invalid")).toBe("true");
    expect(saveBtn().disabled).toBe(true);
  });

  it("allows a fresh (non-colliding) key with save enabled", () => {
    renderEditor(["db.system-of-record"]);
    const content = screen.getAllByRole("textbox").find((el) => el.tagName === "TEXTAREA")!;
    fireEvent.change(content, { target: { value: "We use Postgres." } });

    fireEvent.change(keyField(), { target: { value: "db.replica" } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(saveBtn().disabled).toBe(false);
  });
});

describe("EntryEditor — scope-lock override (FEAT-19 §B3)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("member in a locked scope: read-only View, fields disabled, no Save", () => {
    renderEditing({ scopeLocked: true, isAdmin: false });
    expect(screen.getByText("View memory")).toBeTruthy();
    expect(contentArea().readOnly).toBe(true);
    expect(screen.queryByRole("button", { name: /save changes/i })).toBeNull();
    expect(screen.getByRole("button", { name: /^ok$/i })).toBeTruthy();
    // the member read-only band, not the override audit note
    expect(screen.getByText(/only admins can change entries/i)).toBeTruthy();
  });

  it("admin in a locked scope: read-only until the Edit-despite-lock gesture", () => {
    renderEditing({ scopeLocked: true, isAdmin: true });
    // starts read-only with the gesture offered
    expect(contentArea().readOnly).toBe(true);
    expect(screen.queryByRole("button", { name: /save changes/i })).toBeNull();
    const gesture = screen.getByRole("button", { name: /edit despite lock/i });

    fireEvent.click(gesture);

    // fields unlock, the audit note appears, Save is active
    expect(contentArea().readOnly).toBe(false);
    expect(screen.getByText(/saves as an admin override and is recorded in the audit log/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeTruthy();
  });

  it("admin override Cancel resets to the read-only hold", () => {
    renderEditing({ scopeLocked: true, isAdmin: true });
    fireEvent.click(screen.getByRole("button", { name: /edit despite lock/i }));
    expect(contentArea().readOnly).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    // back to the hold: fields read-only again, the gesture offered again
    expect(contentArea().readOnly).toBe(true);
    expect(screen.getByRole("button", { name: /edit despite lock/i })).toBeTruthy();
  });

  it("axis composition: a system-seed entry stays read-only even for an admin in a locked scope", () => {
    const sysEntry: EntryView = { ...ENTRY, authorSubject: SYSTEM_SUBJECT };
    renderEditing({ scopeLocked: true, isAdmin: true }, sysEntry);
    expect(contentArea().readOnly).toBe(true);
    // the entry-level lock wins: no override gesture, just OK-to-close
    expect(screen.queryByRole("button", { name: /edit despite lock/i })).toBeNull();
    expect(screen.getByRole("button", { name: /^ok$/i })).toBeTruthy();
  });
});

describe("content character budget (the 1500-char entry contract)", () => {
  const counter = () => document.querySelector(".char-counter") as HTMLElement;

  it("caps the textarea at the server contract and shows the budget", () => {
    renderEditing();
    // The hard stop is the contract the backend enforces (validator + DB CHECK).
    expect(contentArea().maxLength).toBe(1500);
    // "We ship daily." = 14 chars, en locale formats the limit with a comma.
    expect(counter().textContent).toBe("14 / 1,500");
    expect(counter().className).toBe("char-counter");
  });

  it("stays quiet while more than 100 characters remain", () => {
    renderEditing();
    fireEvent.change(contentArea(), { target: { value: "x".repeat(1399) } });
    expect(counter().textContent).toBe("1,399 / 1,500");
    expect(counter().className).toBe("char-counter");
  });

  it("turns amber once 100 or fewer characters remain", () => {
    renderEditing();
    fireEvent.change(contentArea(), { target: { value: "x".repeat(1400) } });
    expect(counter().className).toContain("warn");
    expect(counter().className).not.toContain("limit");
  });

  it("turns red at the limit", () => {
    renderEditing();
    fireEvent.change(contentArea(), { target: { value: "x".repeat(1500) } });
    expect(counter().textContent).toBe("1,500 / 1,500");
    expect(counter().className).toContain("limit");
  });
});
