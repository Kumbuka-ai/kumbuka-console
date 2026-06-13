import { describe, expect, it, vi } from "vitest";

// TeamTable is a client module importing server actions; stub the chain.
vi.mock("server-only", () => ({}));
vi.mock("@/app/(app)/actions", () => ({ updateUserAction: vi.fn() }));

import { confirmCopy } from "./TeamTable";

describe("confirmCopy (D-CORE-2 + account actions)", () => {
  it("mute: calm + non-danger, names the member, spells out the scope", () => {
    const c = confirmCopy("mute", "Tobias");
    expect(c.eyebrow).toBe("mute member");
    expect(c.title).toContain("Tobias");
    expect(c.danger).toBe(false);
    expect(c.body).toMatch(/shared writes are suspended/i);
    expect(c.body).toMatch(/private memory/i);
  });

  it("unmute: shared writes resume", () => {
    expect(confirmCopy("unmute", "X").body).toMatch(/resume/i);
  });

  it("disable is the only danger action; enable is not", () => {
    expect(confirmCopy("disable", "X").danger).toBe(true);
    expect(confirmCopy("enable", "X").danger).toBe(false);
  });
});
