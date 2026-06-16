import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { serverFetchMock } = vi.hoisted(() => ({
  serverFetchMock: vi.fn(),
}));
vi.mock("./client", () => ({
  serverFetch: (path: string, init?: unknown) => serverFetchMock(path, init),
}));

import * as live from "./impl-live";

describe("impl-live thin REST wrappers", () => {
  beforeEach(() => {
    serverFetchMock.mockReset();
  });
  afterEach(() => {
    serverFetchMock.mockReset();
  });

  // ---------- Session ----------------------------------------------------

  it("getSession hits /api/auth/me with GET (no method override)", async () => {
    serverFetchMock.mockResolvedValue({ subject: "u" });
    await live.getSession();
    expect(serverFetchMock).toHaveBeenCalledWith("/api/auth/me", undefined);
  });

  it("updateMe PATCHes /api/auth/me with the request body", async () => {
    serverFetchMock.mockResolvedValue({ subject: "u" });
    await live.updateMe({ displayName: "Alice" });
    expect(serverFetchMock).toHaveBeenCalledWith("/api/auth/me", {
      method: "PATCH",
      body: { displayName: "Alice" },
    });
  });

  // ---------- Scopes -----------------------------------------------------

  it("listScopes GETs /api/scopes", async () => {
    serverFetchMock.mockResolvedValue([]);
    await live.listScopes();
    expect(serverFetchMock).toHaveBeenCalledWith("/api/scopes", undefined);
  });

  it("getScope filters listScopes by slug, returns null on miss", async () => {
    serverFetchMock.mockResolvedValue([
      { slug: "alpha", name: "Alpha" },
      { slug: "beta", name: "Beta" },
    ]);
    const found = await live.getScope("alpha");
    expect(found?.slug).toBe("alpha");

    serverFetchMock.mockResolvedValue([{ slug: "alpha" }]);
    const miss = await live.getScope("gamma");
    expect(miss).toBeNull();
  });

  it("createScope POSTs the request body", async () => {
    serverFetchMock.mockResolvedValue({ slug: "alpha" });
    await live.createScope({ slug: "alpha", name: "Alpha" });
    expect(serverFetchMock).toHaveBeenCalledWith("/api/scopes", {
      method: "POST",
      body: { slug: "alpha", name: "Alpha" },
    });
  });

  it("renameScope URL-encodes the slug and PATCHes", async () => {
    serverFetchMock.mockResolvedValue({});
    await live.renameScope("with space", { name: "Renamed" });
    const [path, init] = serverFetchMock.mock.calls[0];
    expect(path).toBe("/api/scopes/with%20space");
    expect(init).toEqual({ method: "PATCH", body: { name: "Renamed" } });
  });

  it("archiveScope POSTs to the ':archive' subresource", async () => {
    serverFetchMock.mockResolvedValue(undefined);
    await live.archiveScope("alpha");
    expect(serverFetchMock).toHaveBeenCalledWith("/api/scopes/alpha:archive", { method: "POST" });
  });

  // ---------- Entries ----------------------------------------------------

  it("listEntries URL-encodes the slug", async () => {
    serverFetchMock.mockResolvedValue([]);
    await live.listEntries("alpha/beta");
    expect(serverFetchMock).toHaveBeenCalledWith("/api/scopes/alpha%2Fbeta/entries", undefined);
  });

  it("createEntry encodes slug + POSTs request", async () => {
    serverFetchMock.mockResolvedValue({});
    await live.createEntry("alpha", { type: "decision", content: "x" });
    expect(serverFetchMock).toHaveBeenCalledWith("/api/scopes/alpha/entries", {
      method: "POST",
      body: { type: "decision", content: "x" },
    });
  });

  it("updateEntry encodes both slug and id, PATCHes", async () => {
    serverFetchMock.mockResolvedValue({});
    await live.updateEntry("alpha", "abc/123", { content: "y" });
    expect(serverFetchMock).toHaveBeenCalledWith("/api/scopes/alpha/entries/abc%2F123", {
      method: "PATCH",
      body: { content: "y" },
    });
  });

  it("deleteEntry encodes both segments, sends DELETE", async () => {
    serverFetchMock.mockResolvedValue(undefined);
    await live.deleteEntry("alpha", "abc");
    expect(serverFetchMock).toHaveBeenCalledWith("/api/scopes/alpha/entries/abc", { method: "DELETE" });
  });

  // ---------- Users ------------------------------------------------------

  it("listUsers maps RawUserView[] through deriveUserView", async () => {
    serverFetchMock.mockResolvedValue([
      { id: "k1", email: "a@x", firstName: "Alice", lastName: "Smith", role: "admin", status: "active" },
    ]);

    const out = await live.listUsers();
    expect(out).toHaveLength(1);
    expect(out[0].displayName).toBe("Alice Smith");
    expect(out[0].subject).toBe("k1");
  });

  it("listDirectory hits /api/users/directory and passes entries through", async () => {
    serverFetchMock.mockResolvedValue([
      { subject: "k1", displayName: "Alice Smith" },
      { subject: "k2", displayName: null },
    ]);

    const out = await live.listDirectory();
    expect(serverFetchMock).toHaveBeenCalledWith("/api/users/directory");
    expect(out).toEqual([
      { subject: "k1", displayName: "Alice Smith" },
      { subject: "k2", displayName: null },
    ]);
  });

  it("inviteUser splits displayName into first/last name and POSTs the legacy body", async () => {
    serverFetchMock.mockResolvedValue({
      id: "k1", email: "a@x", firstName: "Alice", lastName: "Marie Smith", role: "member", status: "invited",
    });
    await live.inviteUser({ email: "a@x", displayName: "Alice Marie Smith", role: "member" });

    const [path, init] = serverFetchMock.mock.calls[0];
    expect(path).toBe("/api/users");
    expect(init.method).toBe("POST");
    expect(init.body).toEqual({
      email: "a@x",
      firstName: "Alice",
      lastName: "Marie Smith",
      role: "member",
    });
  });

  it("inviteUser maps undefined displayName to null first/last name", async () => {
    serverFetchMock.mockResolvedValue({
      id: "k1", email: "a@x", firstName: null, lastName: null, role: "member", status: "invited",
    });
    await live.inviteUser({ email: "a@x", role: "member" });

    expect(serverFetchMock.mock.calls[0][1].body).toEqual({
      email: "a@x",
      firstName: null,
      lastName: null,
      role: "member",
    });
  });

  it("inviteUser maps single-name displayName to firstName only (lastName null)", async () => {
    serverFetchMock.mockResolvedValue({
      id: "k1", email: "a@x", firstName: "Alice", lastName: null, role: "member", status: "invited",
    });
    await live.inviteUser({ email: "a@x", displayName: "Alice", role: "member" });

    expect(serverFetchMock.mock.calls[0][1].body).toEqual({
      email: "a@x",
      firstName: "Alice",
      lastName: null,
      role: "member",
    });
  });

  it("updateUser includes only the fields the request actually sets", async () => {
    serverFetchMock.mockResolvedValue({
      id: "k1", email: "a@x", firstName: null, lastName: null, role: "admin", status: "active",
    });

    await live.updateUser("k1", { role: "admin" });
    expect(serverFetchMock.mock.calls[0][1].body).toEqual({ role: "admin" });

    serverFetchMock.mockResolvedValue({
      id: "k1", email: "a@x", firstName: null, lastName: null, role: "member", status: "disabled",
    });
    await live.updateUser("k1", { status: "disabled" });
    // UI's status enum is mapped to backend's boolean.
    expect(serverFetchMock.mock.calls[1][1].body).toEqual({ enabled: false });

    serverFetchMock.mockResolvedValue({
      id: "k1", email: "a@x", firstName: null, lastName: null, role: "member", status: "active",
    });
    await live.updateUser("k1", { status: "active" });
    expect(serverFetchMock.mock.calls[2][1].body).toEqual({ enabled: true });
  });

  it("updateUser PATCHes the URL-encoded id", async () => {
    serverFetchMock.mockResolvedValue({
      id: "x/y", email: "u@x", firstName: null, lastName: null, role: "member", status: "active",
    });
    await live.updateUser("x/y", { role: "member" });
    expect(serverFetchMock.mock.calls[0][0]).toBe("/api/users/x%2Fy");
  });

  it("eraseUser POSTs the typed confirm to the erase sub-resource", async () => {
    serverFetchMock.mockResolvedValue({ id: "k1", email: "u@x", keycloakRemoved: true });
    const out = await live.eraseUser("k1", "u@x");
    expect(out.keycloakRemoved).toBe(true);
    expect(serverFetchMock).toHaveBeenCalledWith("/api/users/k1/erase", {
      method: "POST",
      body: { typedConfirm: "u@x" },
    });
  });

  it("resendInvite POSTs the resend-invite sub-resource", async () => {
    serverFetchMock.mockResolvedValue(undefined);
    await live.resendInvite("k1");
    expect(serverFetchMock).toHaveBeenCalledWith("/api/users/k1/resend-invite", { method: "POST" });
  });

  it("cancelInvite DELETEs the URL-encoded user id", async () => {
    serverFetchMock.mockResolvedValue(undefined);
    await live.cancelInvite("x/y");
    expect(serverFetchMock).toHaveBeenCalledWith("/api/users/x%2Fy", { method: "DELETE" });
  });

  // ---------- Settings + Connector + Overview ----------------------------

  it("getSettings GETs /api/settings; updateSettings PATCHes", async () => {
    serverFetchMock.mockResolvedValue({});
    await live.getSettings();
    expect(serverFetchMock).toHaveBeenLastCalledWith("/api/settings", undefined);

    await live.updateSettings({ writePolicy: "ask" });
    expect(serverFetchMock).toHaveBeenLastCalledWith("/api/settings", {
      method: "PATCH",
      body: { writePolicy: "ask" },
    });
  });

  it("getConnector GETs /api/connector; rotateConnectorSecret POSTs the rotate subresource", async () => {
    serverFetchMock.mockResolvedValue({});
    await live.getConnector();
    expect(serverFetchMock).toHaveBeenLastCalledWith("/api/connector", undefined);

    await live.rotateConnectorSecret();
    expect(serverFetchMock).toHaveBeenLastCalledWith("/api/connector/secret/rotate", { method: "POST" });
  });

  it("getOverview GETs /api/overview", async () => {
    serverFetchMock.mockResolvedValue({});
    await live.getOverview();
    expect(serverFetchMock).toHaveBeenLastCalledWith("/api/overview", undefined);
  });
});
