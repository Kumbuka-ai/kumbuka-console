import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Mock @/lib/theme + @/lib/api so we can assert delegation +
// revalidatePath cache-busting without standing up the real BFF.
const { revalidatePathMock, apiMocks, persistThemeMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  persistThemeMock: vi.fn(),
  apiMocks: {
    createScope: vi.fn(),
    renameScope: vi.fn(),
    archiveScope: vi.fn(),
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    inviteUser: vi.fn(),
    updateUser: vi.fn(),
    updateSettings: vi.fn(),
    rotateConnectorSecret: vi.fn(),
    updateMe: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (p: string) => revalidatePathMock(p),
}));
vi.mock("@/lib/theme", () => ({
  setTheme: (t: string) => persistThemeMock(t),
}));
vi.mock("@/lib/api", () => apiMocks);

import {
  archiveScopeAction,
  createEntryAction,
  createScopeAction,
  deleteEntryAction,
  inviteUserAction,
  renameScopeAction,
  rotateSecretAction,
  setThemeAction,
  updateEntryAction,
  updateMeAction,
  updateSettingsAction,
  updateUserAction,
} from "./actions";

describe("Server Actions — delegation + cache invalidation", () => {
  beforeEach(() => {
    revalidatePathMock.mockReset();
    persistThemeMock.mockReset();
    for (const fn of Object.values(apiMocks)) fn.mockReset();
  });

  // ---------- theme ------------------------------------------------------

  it("setThemeAction forwards to persistTheme, no path revalidation (the cookie roundtrip is enough)", async () => {
    await setThemeAction("dark");
    expect(persistThemeMock).toHaveBeenCalledWith("dark");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  // ---------- scopes -----------------------------------------------------

  it("createScopeAction returns the api result and revalidates /scopes + /overview", async () => {
    apiMocks.createScope.mockResolvedValue({ slug: "alpha" });
    const out = await createScopeAction({ slug: "alpha", name: "Alpha" });
    expect(out).toEqual({ slug: "alpha" });
    expect(revalidatePathMock).toHaveBeenCalledWith("/scopes");
    expect(revalidatePathMock).toHaveBeenCalledWith("/overview");
  });

  it("renameScopeAction passes name/description through and revalidates the specific scope + list", async () => {
    apiMocks.renameScope.mockResolvedValue({ slug: "alpha", name: "New" });
    await renameScopeAction("alpha", "New", "desc");
    expect(apiMocks.renameScope).toHaveBeenCalledWith("alpha", { name: "New", description: "desc" });
    expect(revalidatePathMock).toHaveBeenCalledWith("/scopes/alpha");
    expect(revalidatePathMock).toHaveBeenCalledWith("/scopes");
  });

  it("renameScopeAction tolerates an omitted description (UI lets you edit name alone)", async () => {
    apiMocks.renameScope.mockResolvedValue({});
    await renameScopeAction("alpha", "New");
    expect(apiMocks.renameScope).toHaveBeenCalledWith("alpha", { name: "New", description: undefined });
  });

  it("archiveScopeAction calls the BFF, returns void, revalidates list + overview", async () => {
    apiMocks.archiveScope.mockResolvedValue(undefined);
    const out = await archiveScopeAction("alpha");
    expect(out).toBeUndefined();
    expect(apiMocks.archiveScope).toHaveBeenCalledWith("alpha");
    expect(revalidatePathMock).toHaveBeenCalledWith("/scopes");
    expect(revalidatePathMock).toHaveBeenCalledWith("/overview");
  });

  // ---------- entries ----------------------------------------------------

  it("createEntryAction targets the scope page + overview", async () => {
    apiMocks.createEntry.mockResolvedValue({ id: "e1" });
    const out = await createEntryAction("alpha", { type: "decision", content: "x" });
    expect(out).toEqual({ id: "e1" });
    expect(revalidatePathMock).toHaveBeenCalledWith("/scopes/alpha");
    expect(revalidatePathMock).toHaveBeenCalledWith("/overview");
  });

  it("updateEntryAction only revalidates the specific scope (no overview — content edits don't change activity ordering by spec)", async () => {
    apiMocks.updateEntry.mockResolvedValue({ id: "e1" });
    await updateEntryAction("alpha", "e1", { content: "v2" });
    expect(revalidatePathMock).toHaveBeenCalledWith("/scopes/alpha");
    expect(revalidatePathMock).not.toHaveBeenCalledWith("/overview");
  });

  it("deleteEntryAction revalidates scope + overview", async () => {
    apiMocks.deleteEntry.mockResolvedValue(undefined);
    await deleteEntryAction("alpha", "e1");
    expect(apiMocks.deleteEntry).toHaveBeenCalledWith("alpha", "e1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/scopes/alpha");
    expect(revalidatePathMock).toHaveBeenCalledWith("/overview");
  });

  // ---------- users ------------------------------------------------------

  it("inviteUserAction returns the new user and revalidates /team", async () => {
    apiMocks.inviteUser.mockResolvedValue({ id: "u1", email: "u@x" });
    const out = await inviteUserAction({ email: "u@x", role: "member" });
    expect(out.id).toBe("u1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/team");
  });

  it("updateUserAction targets /team only", async () => {
    apiMocks.updateUser.mockResolvedValue({ id: "u1" });
    await updateUserAction("u1", { role: "admin" });
    expect(apiMocks.updateUser).toHaveBeenCalledWith("u1", { role: "admin" });
    expect(revalidatePathMock).toHaveBeenCalledWith("/team");
    expect(revalidatePathMock).not.toHaveBeenCalledWith("/overview");
  });

  // ---------- settings ---------------------------------------------------

  it("updateSettingsAction targets /settings", async () => {
    apiMocks.updateSettings.mockResolvedValue({ writePolicy: "global" });
    const out = await updateSettingsAction({ writePolicy: "global" });
    expect(out.writePolicy).toBe("global");
    expect(revalidatePathMock).toHaveBeenCalledWith("/settings");
  });

  // ---------- connector --------------------------------------------------

  it("rotateSecretAction revalidates settings + overview (secret card is on both)", async () => {
    apiMocks.rotateConnectorSecret.mockResolvedValue({ clientSecretMasked: "•w123" });
    const out = await rotateSecretAction();
    expect(out.clientSecretMasked).toBe("•w123");
    expect(revalidatePathMock).toHaveBeenCalledWith("/settings");
    expect(revalidatePathMock).toHaveBeenCalledWith("/overview");
  });

  // ---------- account ----------------------------------------------------

  it("updateMeAction revalidates account + overview (member list on overview shows displayName)", async () => {
    apiMocks.updateMe.mockResolvedValue({ subject: "s", displayName: "Patched" });
    const out = await updateMeAction({ displayName: "Patched" });
    expect(out.displayName).toBe("Patched");
    expect(revalidatePathMock).toHaveBeenCalledWith("/account");
    expect(revalidatePathMock).toHaveBeenCalledWith("/overview");
  });
});
