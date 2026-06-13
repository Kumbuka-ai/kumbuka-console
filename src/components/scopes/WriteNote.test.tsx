import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ScopeView } from "@/lib/api/types";

// EntriesView is a client module whose import chain reaches server actions.
vi.mock("server-only", () => ({}));
vi.mock("@/app/(app)/actions", () => ({
  deleteEntryAction: vi.fn(),
  createEntryAction: vi.fn(),
  updateEntryAction: vi.fn(),
}));

import { WriteNote } from "./EntriesView";

const scope = (kind: ScopeView["kind"], archived = false): ScopeView => ({
  slug: "alpha",
  name: "Alpha",
  kind,
  fixed: false,
  archived,
  description: null,
  entryCount: 0,
  createdAt: "2026-01-01T00:00:00Z",
});

describe("WriteNote (D-CORE-2)", () => {
  it("muted takes precedence: a calm suspension notice", () => {
    render(<WriteNote scope={scope("project")} isArchived={false} callerMuted />);
    expect(screen.getByText(/shared writes are suspended for your account/i)).toBeTruthy();
  });

  it("global scope → org-wide write target", () => {
    render(<WriteNote scope={scope("global")} isArchived={false} callerMuted={false} />);
    expect(screen.getByText(/org-wide/i)).toBeTruthy();
  });

  it("archived scope → read-only", () => {
    render(<WriteNote scope={scope("project", true)} isArchived callerMuted={false} />);
    expect(screen.getByText(/read-only/i)).toBeTruthy();
  });

  it("default project → writable by admins + members", () => {
    render(<WriteNote scope={scope("project")} isArchived={false} callerMuted={false} />);
    expect(screen.getByText(/writable by/i)).toBeTruthy();
  });
});
