import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Mock @/lib/theme + @/lib/api so we can assert delegation +
// revalidatePath cache-busting without standing up the real BFF.
const { revalidatePathMock, apiMocks, persistThemeMock, persistLocaleMock, ApiError, ApiAuthError } =
  vi.hoisted(() => {
    class ApiError extends Error {
      status: number;
      body: unknown;
      constructor(status: number, message: string, body?: unknown) {
        super(message);
        this.status = status;
        this.body = body;
        this.name = "ApiError";
      }
    }
    class ApiAuthError extends Error {
      loginUrl: string;
      constructor(loginUrl: string) {
        super("Unauthenticated");
        this.loginUrl = loginUrl;
        this.name = "ApiAuthError";
      }
    }
    return {
      revalidatePathMock: vi.fn(),
      persistThemeMock: vi.fn(),
      persistLocaleMock: vi.fn(),
      ApiError,
      ApiAuthError,
      apiMocks: {
        createScope: vi.fn(),
        renameScope: vi.fn(),
        archiveScope: vi.fn(),
        unarchiveScope: vi.fn(),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        remapEntry: vi.fn(),
        getSession: vi.fn(),
        inviteUser: vi.fn(),
        updateUser: vi.fn(),
        eraseUser: vi.fn(),
        resendInvite: vi.fn(),
        cancelInvite: vi.fn(),
        updateSettings: vi.fn(),
        rotateConnectorSecret: vi.fn(),
        updateMe: vi.fn(),
        terminateSession: vi.fn(),
      },
    };
  });

vi.mock("next/cache", () => ({
  revalidatePath: (p: string) => revalidatePathMock(p),
}));
vi.mock("@/lib/theme", () => ({
  setTheme: (t: string) => persistThemeMock(t),
}));
vi.mock("@/lib/locale", () => ({
  setLocale: (l: string) => persistLocaleMock(l),
}));
vi.mock("@/lib/api", () => ({ ...apiMocks, ApiError, ApiAuthError }));

import {
  archiveScopeAction,
  unarchiveScopeAction,
  cancelInviteAction,
  createEntryAction,
  createScopeAction,
  deleteEntryAction,
  remapEntryAction,
  eraseUserAction,
  inviteUserAction,
  renameScopeAction,
  resendInviteAction,
  rotateSecretAction,
  setLocaleAction,
  setOnboardingAction,
  setThemeAction,
  terminateSessionAction,
  updateEntryAction,
  updateMeAction,
  updateSettingsAction,
  updateUserAction,
} from "./actions";

describe("Server Actions — delegation + cache invalidation", () => {
  beforeEach(() => {
    revalidatePathMock.mockReset();
    persistThemeMock.mockReset();
    persistLocaleMock.mockReset();
    for (const fn of Object.values(apiMocks)) fn.mockReset();
  });

  // ---------- theme ------------------------------------------------------

  it("setThemeAction forwards to persistTheme, no path revalidation (the cookie roundtrip is enough)", async () => {
    await setThemeAction("dark");
    expect(persistThemeMock).toHaveBeenCalledWith("dark");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  // ---------- locale (#49) ----------------------------------------------

  it("setLocaleAction writes the cookie AND persists to user_account.locale via updateMe", async () => {
    apiMocks.updateMe.mockResolvedValue({ locale: "en" });
    await setLocaleAction("en");
    expect(persistLocaleMock).toHaveBeenCalledWith("en");
    expect(apiMocks.updateMe).toHaveBeenCalledWith({ locale: "en" });
  });

  it("setLocaleAction still applies the cookie when the backend persist fails (best-effort)", async () => {
    apiMocks.updateMe.mockRejectedValue(new Error("BFF down"));
    await expect(setLocaleAction("de")).resolves.toBeUndefined();
    expect(persistLocaleMock).toHaveBeenCalledWith("de");
    expect(apiMocks.updateMe).toHaveBeenCalledWith({ locale: "de" });
  });

  // ---------- scopes -----------------------------------------------------

  it("createScopeAction returns a typed ok result and revalidates /scopes + /overview", async () => {
    apiMocks.createScope.mockResolvedValue({ slug: "alpha" });
    const out = await createScopeAction({ slug: "alpha", name: "Alpha" });
    expect(out).toEqual({ ok: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/scopes");
    expect(revalidatePathMock).toHaveBeenCalledWith("/overview");
  });

  it("createScopeAction maps a 409 duplicate to a typed exists result (no throw, no revalidate)", async () => {
    apiMocks.createScope.mockRejectedValue(new ApiError(409, "conflict", { code: "SCOPE_EXISTS" }));
    const out = await createScopeAction({ slug: "alpha", name: "Alpha" });
    expect(out).toEqual({ ok: false, reason: "exists" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("unarchiveScopeAction returns ok and revalidates; degrades to a typed result on error", async () => {
    apiMocks.unarchiveScope.mockResolvedValue(undefined);
    expect(await unarchiveScopeAction("alpha")).toEqual({ ok: true });
    expect(apiMocks.unarchiveScope).toHaveBeenCalledWith("alpha");
    apiMocks.unarchiveScope.mockRejectedValue(new ApiError(404, "not found"));
    expect(await unarchiveScopeAction("alpha")).toEqual({ ok: false, reason: "generic" });
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

  it("archiveScopeAction calls the BFF, returns a typed ok result, revalidates list + overview", async () => {
    apiMocks.archiveScope.mockResolvedValue(undefined);
    const out = await archiveScopeAction("alpha");
    expect(out).toEqual({ ok: true });
    expect(apiMocks.archiveScope).toHaveBeenCalledWith("alpha");
    expect(revalidatePathMock).toHaveBeenCalledWith("/scopes");
    expect(revalidatePathMock).toHaveBeenCalledWith("/overview");
  });

  // ---------- entries ----------------------------------------------------

  it("createEntryAction targets the scope page + overview and reports success", async () => {
    apiMocks.createEntry.mockResolvedValue({ id: "e1" });
    const out = await createEntryAction("alpha", { type: "decision", content: "x" });
    expect(out).toEqual({ ok: true });
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
    const out = await deleteEntryAction("alpha", "e1");
    expect(out).toEqual({ ok: true });
    expect(apiMocks.deleteEntry).toHaveBeenCalledWith("alpha", "e1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/scopes/alpha");
    expect(revalidatePathMock).toHaveBeenCalledWith("/overview");
  });

  // ---------- entries: scope-remap (D-CORE-17) ---------------------------

  it("remapEntryAction moves an entry and revalidates source + target + overview", async () => {
    apiMocks.remapEntry.mockResolvedValue(undefined);
    const out = await remapEntryAction("alpha", "e1", "beta", "k.new");
    expect(out).toEqual({ ok: true });
    expect(apiMocks.remapEntry).toHaveBeenCalledWith("alpha", "e1", "beta", "k.new");
    expect(revalidatePathMock).toHaveBeenCalledWith("/scopes/alpha");
    expect(revalidatePathMock).toHaveBeenCalledWith("/scopes/beta");
    expect(revalidatePathMock).toHaveBeenCalledWith("/overview");
  });

  it("remapEntryAction maps a 409 KEY_EXISTS to reason=exists (no revalidate)", async () => {
    apiMocks.remapEntry.mockRejectedValue(new ApiError(409, "conflict", { code: "KEY_EXISTS" }));
    const out = await remapEntryAction("alpha", "e1", "beta");
    expect(out).toEqual({ ok: false, reason: "exists" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("remapEntryAction maps a 400 REMAP_PRIVATE_FORBIDDEN to reason=validation", async () => {
    apiMocks.remapEntry.mockRejectedValue(
      new ApiError(400, "bad request", { code: "REMAP_PRIVATE_FORBIDDEN", message: "private excluded" }),
    );
    const out = await remapEntryAction("alpha", "e1", "private-x");
    expect(out).toEqual({ ok: false, reason: "validation", detail: "private excluded" });
  });

  // ---------- entries: typed backend errors (SESSION-017) ----------------
  // A non-2xx must become a typed result, never throw into the render.

  it("maps a 403 from a muted member to reason=muted (no revalidation)", async () => {
    apiMocks.createEntry.mockRejectedValue(new ApiError(403, "forbidden"));
    apiMocks.getSession.mockResolvedValue({ muted: true });
    const out = await createEntryAction("alpha", { type: "decision", content: "x" });
    expect(out).toEqual({ ok: false, reason: "muted" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("maps a 403 for a non-muted caller to reason=forbidden (admin-only path)", async () => {
    apiMocks.updateEntry.mockRejectedValue(new ApiError(403, "forbidden"));
    apiMocks.getSession.mockResolvedValue({ muted: false });
    const out = await updateEntryAction("alpha", "e1", { content: "v2" });
    expect(out).toEqual({ ok: false, reason: "forbidden" });
  });

  it("maps a 409 PROTECTED_UPSERT_BLOCKED to reason=protected", async () => {
    apiMocks.createEntry.mockRejectedValue(
      new ApiError(409, "conflict", { code: "PROTECTED_UPSERT_BLOCKED" }),
    );
    const out = await createEntryAction("alpha", { type: "convention", content: "x" });
    expect(out).toEqual({ ok: false, reason: "protected" });
  });

  it("maps a 409 PROTECTED_DELETE_BLOCKED to reason=protected", async () => {
    apiMocks.deleteEntry.mockRejectedValue(
      new ApiError(409, "conflict", { code: "PROTECTED_DELETE_BLOCKED" }),
    );
    const out = await deleteEntryAction("alpha", "e1");
    expect(out).toEqual({ ok: false, reason: "protected" });
  });

  it("maps a 409 STALE_VERSION to reason=stale", async () => {
    // §A1.6 optimistic locking: a concurrent edit advanced the version.
    apiMocks.updateEntry.mockRejectedValue(
      new ApiError(409, "conflict", { code: "STALE_VERSION" }),
    );
    const out = await updateEntryAction("alpha", "e1", { content: "v2" });
    expect(out).toEqual({ ok: false, reason: "stale" });
  });

  it("maps a 400 to reason=validation carrying the backend reason", async () => {
    apiMocks.createEntry.mockRejectedValue(
      new ApiError(400, "bad request", { message: "content exceeds 1500 characters" }),
    );
    const out = await createEntryAction("alpha", { type: "decision", content: "x".repeat(1501) });
    expect(out).toEqual({
      ok: false,
      reason: "validation",
      detail: "content exceeds 1500 characters",
    });
  });

  it("maps any other non-2xx to reason=generic", async () => {
    apiMocks.createEntry.mockRejectedValue(new ApiError(500, "boom"));
    const out = await createEntryAction("alpha", { type: "decision", content: "x" });
    expect(out).toEqual({ ok: false, reason: "generic" });
  });

  it("re-throws ApiAuthError so the session-expiry → /signin redirect still fires", async () => {
    apiMocks.createEntry.mockRejectedValue(new ApiAuthError("/signin"));
    await expect(createEntryAction("alpha", { type: "decision", content: "x" })).rejects.toBeInstanceOf(
      ApiAuthError,
    );
    expect(revalidatePathMock).not.toHaveBeenCalled();
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

  it("eraseUserAction forwards the typed confirm and revalidates /team + /overview", async () => {
    apiMocks.eraseUser.mockResolvedValue({ id: "u1", email: "u@x", keycloakRemoved: true });
    const out = await eraseUserAction("u1", "u@x");
    expect(out.keycloakRemoved).toBe(true);
    expect(apiMocks.eraseUser).toHaveBeenCalledWith("u1", "u@x");
    expect(revalidatePathMock).toHaveBeenCalledWith("/team");
    expect(revalidatePathMock).toHaveBeenCalledWith("/overview");
  });

  it("resendInviteAction delegates and revalidates /team", async () => {
    apiMocks.resendInvite.mockResolvedValue(undefined);
    await resendInviteAction("u1");
    expect(apiMocks.resendInvite).toHaveBeenCalledWith("u1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/team");
  });

  it("cancelInviteAction delegates and revalidates /team + /overview", async () => {
    apiMocks.cancelInvite.mockResolvedValue(undefined);
    await cancelInviteAction("u1");
    expect(apiMocks.cancelInvite).toHaveBeenCalledWith("u1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/team");
    expect(revalidatePathMock).toHaveBeenCalledWith("/overview");
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

  // ---------- onboarding (D-CORE-10.1) -----------------------------------

  it("setOnboardingAction persists the wizard state via updateMe (no path revalidation)", async () => {
    apiMocks.updateMe.mockResolvedValue({});
    await setOnboardingAction({ dismissed: true, lastStep: 2 });
    expect(apiMocks.updateMe).toHaveBeenCalledWith({ onboarding: { dismissed: true, lastStep: 2 } });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("setOnboardingAction is best-effort: a backend failure never throws (local state already applied)", async () => {
    apiMocks.updateMe.mockRejectedValue(new Error("BFF down"));
    await expect(setOnboardingAction({ dismissed: false, lastStep: 1 })).resolves.toBeUndefined();
    expect(apiMocks.updateMe).toHaveBeenCalledWith({ onboarding: { dismissed: false, lastStep: 1 } });
  });

  it("terminateSessionAction (D-CORE-8) delegates by id and revalidates /account", async () => {
    apiMocks.terminateSession.mockResolvedValue(undefined);
    await terminateSessionAction("sess-connector");
    expect(apiMocks.terminateSession).toHaveBeenCalledWith("sess-connector");
    expect(revalidatePathMock).toHaveBeenCalledWith("/account");
  });
});
