import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { MoveScopeDialog } from "./MoveScopeDialog";
import { remapEntryAction } from "@/app/(app)/actions";
import type { EntryView, ScopeView } from "@/lib/api/types";

// The dialog calls a server action; stub it (jsdom can't reach the BFF).
vi.mock("@/app/(app)/actions", () => ({
  remapEntryAction: vi.fn(),
}));

const mockRemap = vi.mocked(remapEntryAction);

const scope = (slug: string, over: Partial<ScopeView> = {}): ScopeView => ({
  slug,
  name: slug,
  kind: "project",
  fixed: false,
  archived: false,
  locked: false,
  description: null,
  entryCount: 0,
  createdAt: "2026-06-18T00:00:00Z",
  ...over,
});

const SOURCE = scope("atlas-web");
const ENTRY: EntryView = {
  id: "e1",
  type: "decision",
  key: "db.system-of-record",
  content: "We use Postgres.",
  reference: null,
  authorSubject: "kc-1",
  source: "console",
  createdAt: "2026-06-18T00:00:00Z",
  updatedAt: "2026-06-18T00:00:00Z",
};

function renderDialog(scopes: ScopeView[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <MoveScopeDialog entry={ENTRY} scope={SOURCE} scopes={scopes} onClose={() => {}} />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

const moveBtn = () => screen.getByRole("button", { name: /^move$/i }) as HTMLButtonElement;
const targetSelect = () => screen.getByRole("combobox") as HTMLSelectElement;

describe("MoveScopeDialog — target picker (D-CORE-17)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers other shared scopes as targets, excluding the current and archived ones", () => {
    renderDialog([SOURCE, scope("global", { kind: "global" }), scope("old", { archived: true })]);
    const opts = Array.from(targetSelect().options).map((o) => o.value);
    expect(opts).toContain("global");
    expect(opts).not.toContain("atlas-web"); // current scope
    expect(opts).not.toContain("old"); // archived
  });

  it("shows a no-targets banner and no picker when nothing else exists", () => {
    renderDialog([SOURCE]);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText(/no other scope/i)).toBeTruthy();
  });

  it("calls remapEntryAction with source, id and chosen target on Move", async () => {
    mockRemap.mockResolvedValue({ ok: true });
    renderDialog([SOURCE, scope("global", { kind: "global" })]);
    fireEvent.change(targetSelect(), { target: { value: "global" } });
    fireEvent.click(moveBtn());
    await waitFor(() =>
      expect(mockRemap).toHaveBeenCalledWith("atlas-web", "e1", "global", undefined),
    );
  });

  it("reveals the key-override field after a 409 KEY_EXISTS collision", async () => {
    mockRemap.mockResolvedValue({ ok: false, reason: "exists" });
    renderDialog([SOURCE, scope("global", { kind: "global" })]);
    fireEvent.change(targetSelect(), { target: { value: "global" } });
    fireEvent.click(moveBtn());
    // After the collision the rename field appears so the curator can resolve it.
    await waitFor(() => expect(screen.getByPlaceholderText(/release-process/i)).toBeTruthy());
  });
});
