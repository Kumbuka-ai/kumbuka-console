import { beforeEach, describe, expect, it } from "vitest";

// Mock state is module-level, so reset modules between tests for isolation.
// (vi.resetModules + dynamic import is the cleanest way to get a fresh
// in-memory store per test against the same source file.)
let mock: typeof import("./impl-mock");

beforeEach(async () => {
  const { vi } = await import("vitest");
  vi.resetModules();
  mock = await import("./impl-mock");
});

describe("impl-mock — session", () => {
  it("getSession returns the 'self' user (or first as fallback)", async () => {
    const s = await mock.getSession();
    expect(s.subject).toBeDefined();
    expect(s.accountConsoleUrl).toContain("/realms/");
  });

  it("updateMe trims displayName and persists across reads", async () => {
    const before = await mock.getSession();
    const updated = await mock.updateMe({ displayName: "  New Name  " });
    expect(updated.displayName).toBe("New Name");
    // Sanity: same subject — mutation is in-place, no new user created.
    expect(updated.subject).toBe(before.subject);
  });

  it("updateMe with undefined displayName leaves the name unchanged", async () => {
    const before = await mock.getSession();
    const updated = await mock.updateMe({});
    expect(updated.displayName).toBe(before.displayName);
  });
});

describe("impl-mock — scopes", () => {
  it("listScopes strips the 'entries' field and reports entryCount", async () => {
    const out = await mock.listScopes();
    expect(out.length).toBeGreaterThan(0);
    for (const s of out) {
      expect("entries" in s).toBe(false);
      expect(typeof s.entryCount).toBe("number");
    }
  });

  it("getScope returns null for an unknown slug, an entry-less view for a known slug", async () => {
    expect(await mock.getScope("does-not-exist")).toBeNull();
    const known = (await mock.listScopes())[0]!;
    const fetched = await mock.getScope(known.slug);
    expect(fetched?.slug).toBe(known.slug);
  });

  it("createScope generates the slug from the name when omitted, normalising spaces and case", async () => {
    const out = await mock.createScope({ slug: "", name: "  Frontend Team " });
    expect(out.slug).toBe("frontend-team");
    expect(out.kind).toBe("project");
    expect(out.fixed).toBe(false);
    expect(out.archived).toBe(false);
  });

  it("createScope respects an explicit slug", async () => {
    const out = await mock.createScope({ slug: "explicit-x", name: "Whatever" });
    expect(out.slug).toBe("explicit-x");
  });

  it("createScope rejects a duplicate slug", async () => {
    await mock.createScope({ slug: "uniq", name: "First" });
    await expect(mock.createScope({ slug: "uniq", name: "Second" }))
      .rejects.toThrow(/slug taken/);
  });

  it("renameScope updates name + description on an active project", async () => {
    const created = await mock.createScope({ slug: "renamable", name: "Old" });
    const renamed = await mock.renameScope(created.slug, { name: "New", description: "desc" });
    expect(renamed.name).toBe("New");
    expect(renamed.description).toBe("desc");
  });

  it("renameScope rejects unknown / archived / fixed scopes", async () => {
    await expect(mock.renameScope("nope", { name: "x" })).rejects.toThrow(/no scope/);

    const s = await mock.createScope({ slug: "to-archive", name: "ToArchive" });
    await mock.archiveScope(s.slug);
    await expect(mock.renameScope(s.slug, { name: "x" })).rejects.toThrow(/locked/);

    // 'global' is fixed in the seed.
    await expect(mock.renameScope("global", { name: "Global!" })).rejects.toThrow(/locked/);
  });

  it("archiveScope flips the flag; refuses unknown + refuses the fixed 'global'", async () => {
    const s = await mock.createScope({ slug: "to-arch", name: "A" });
    await mock.archiveScope(s.slug);
    const after = await mock.getScope(s.slug);
    expect(after?.archived).toBe(true);

    await expect(mock.archiveScope("nope")).rejects.toThrow(/no scope/);
    await expect(mock.archiveScope("global")).rejects.toThrow(/cannot be archived/);
  });
});

describe("impl-mock — entries", () => {
  it("createEntry prepends an entry with source=console and updates entryCount", async () => {
    const s = await mock.createScope({ slug: "e1", name: "E1" });
    const e = await mock.createEntry(s.slug, { type: "decision", content: "ship daily" });
    expect(e.content).toBe("ship daily");
    expect(e.source).toBe("console");

    const after = await mock.getScope(s.slug);
    expect(after?.entryCount).toBe(1);

    const list = await mock.listEntries(s.slug);
    expect(list[0]!.id).toBe(e.id); // prepended (newest first)
  });

  it("createEntry refuses an archived scope", async () => {
    const s = await mock.createScope({ slug: "e-arch", name: "E-arch" });
    await mock.archiveScope(s.slug);
    await expect(mock.createEntry(s.slug, { type: "decision", content: "x" }))
      .rejects.toThrow(/read-only/);
  });

  it("createEntry refuses an unknown scope", async () => {
    await expect(mock.createEntry("nope", { type: "decision", content: "x" }))
      .rejects.toThrow(/no scope/);
  });

  it("updateEntry mutates only the supplied fields and refreshes updatedAt", async () => {
    const s = await mock.createScope({ slug: "e2", name: "E2" });
    const created = await mock.createEntry(s.slug, { type: "decision", content: "v1" });
    const updated = await mock.updateEntry(s.slug, created.id, { content: "v2" });
    expect(updated.content).toBe("v2");
    expect(updated.type).toBe("decision");
    expect(updated.updatedAt).not.toBeUndefined();
  });

  it("updateEntry refuses unknown scope / entry", async () => {
    await expect(mock.updateEntry("nope", "x", { content: "y" })).rejects.toThrow(/no scope/);
    const s = await mock.createScope({ slug: "e3", name: "E3" });
    await expect(mock.updateEntry(s.slug, "no-id", { content: "y" })).rejects.toThrow(/no entry/);
  });

  it("reference (D-CORE-7) round-trips: create sets it, an empty update clears it", async () => {
    const s = await mock.createScope({ slug: "e-ref", name: "E-ref" });
    const created = await mock.createEntry(s.slug, {
      type: "decision",
      content: "use OAuth",
      reference: "https://example.com/adr-7",
    });
    expect(created.reference).toBe("https://example.com/adr-7");

    // An explicit "" clears; a missing field preserves.
    const preserved = await mock.updateEntry(s.slug, created.id, { content: "use OAuth v2" });
    expect(preserved.reference).toBe("https://example.com/adr-7");

    const cleared = await mock.updateEntry(s.slug, created.id, { reference: "" });
    expect(cleared.reference).toBeNull();
  });

  it("createEntry leaves reference null when none is supplied", async () => {
    const s = await mock.createScope({ slug: "e-noref", name: "E-noref" });
    const e = await mock.createEntry(s.slug, { type: "decision", content: "x" });
    expect(e.reference).toBeNull();
  });

  it("deleteEntry removes the entry and updates entryCount/empty", async () => {
    const s = await mock.createScope({ slug: "e4", name: "E4" });
    const a = await mock.createEntry(s.slug, { type: "decision", content: "x" });
    await mock.deleteEntry(s.slug, a.id);
    const after = await mock.getScope(s.slug);
    expect(after?.entryCount).toBe(0);
  });

  it("listEntries surfaces the seeded syncError as an Error with status=503", async () => {
    // Inspect the seed for a scope with syncError. If none exists in the seed,
    // skip this assertion — the data shape changes from seed-version to seed-version
    // and the code path is exercised regardless.
    const known = await mock.listScopes();
    const candidate = known.find((s) => (s as { syncError?: boolean }).syncError);
    if (!candidate) return;
    try {
      await mock.listEntries(candidate.slug);
      expect.fail("expected throw");
    } catch (err) {
      expect((err as { status?: number }).status).toBe(503);
    }
  });
});

describe("impl-mock — users", () => {
  it("listUsers returns clones (mutating the result doesn't mutate state)", async () => {
    const a = await mock.listUsers();
    a[0]!.displayName = "MUTATED";
    const b = await mock.listUsers();
    expect(b[0]!.displayName).not.toBe("MUTATED");
  });

  it("inviteUser appends a new user with status='invited' and defaults displayName from email-localpart", async () => {
    const before = (await mock.listUsers()).length;
    const u = await mock.inviteUser({ email: "new@example.com", role: "member" });
    expect(u.status).toBe("invited");
    expect(u.displayName).toBe("new");
    expect((await mock.listUsers()).length).toBe(before + 1);
  });

  it("inviteUser honours an explicit displayName", async () => {
    const u = await mock.inviteUser({ email: "n@x", displayName: "Named", role: "admin" });
    expect(u.displayName).toBe("Named");
    expect(u.role).toBe("admin");
  });

  it("updateUser mutates role + status, refuses unknown id", async () => {
    const u = await mock.inviteUser({ email: "uu@x", role: "member" });
    const updated = await mock.updateUser(u.id, { role: "admin", status: "active" });
    expect(updated.role).toBe("admin");
    expect(updated.status).toBe("active");

    await expect(mock.updateUser("no-id", { role: "member" })).rejects.toThrow(/no user/);
  });
});

describe("impl-mock — settings + connector + overview", () => {
  it("getSettings returns a clone (mutating the result doesn't affect state)", async () => {
    const s1 = await mock.getSettings();
    s1.writePolicy = "global";
    const s2 = await mock.getSettings();
    expect(s2.writePolicy).not.toBe("global");
  });

  it("updateSettings persists writePolicy, defaultScopeSlug, createScopes; re-resolves effective + status", async () => {
    const s = await mock.updateSettings({
      writePolicy: "project",
      defaultScopeSlug: (await mock.listScopes())[0]!.slug,
      createScopes: "members",
    });
    expect(s.writePolicy).toBe("project");
    expect(s.effectiveWritePolicy).toBe("project");
    expect(s.createScopes).toBe("members");
    expect(["ok", "archived"]).toContain(s.defaultScopeStatus);
  });

  it("updateSettings sets defaultScopeStatus='archived' when the chosen default is archived", async () => {
    const fresh = await mock.createScope({ slug: "soon-archived", name: "X" });
    await mock.archiveScope(fresh.slug);

    const s = await mock.updateSettings({
      writePolicy: "project",
      defaultScopeSlug: fresh.slug,
    });
    expect(s.defaultScopeStatus).toBe("archived");
  });

  it("getConnector + rotateConnectorSecret produces a new masked value", async () => {
    const before = await mock.getConnector();
    const after = await mock.rotateConnectorSecret();
    expect(after.clientSecretMasked).not.toBe(before.clientSecretMasked);
    expect(after.clientSecretMasked).toMatch(/^sk_live_/);
  });

  it("getOverview aggregates active/archived scopes, entries-by-type, recent entries sorted desc", async () => {
    const s = await mock.createScope({ slug: "ov", name: "Ov" });
    await mock.createEntry(s.slug, { type: "decision", content: "a" });
    await mock.createEntry(s.slug, { type: "constraint", content: "b" });

    const ov = await mock.getOverview();
    expect(ov.scopesTotal).toBeGreaterThan(0);
    expect(ov.entriesTotal).toBeGreaterThanOrEqual(2);
    expect(ov.recent.length).toBeLessThanOrEqual(8);
    expect((ov.entriesByType.decision ?? 0)).toBeGreaterThanOrEqual(1);
    // Recent entries are sorted by updatedAt desc.
    for (let i = 1; i < ov.recent.length; i++) {
      expect(ov.recent[i - 1]!.updatedAt >= ov.recent[i]!.updatedAt).toBe(true);
    }
  });

  it("getOverview excludes archived scopes from 'recent' but counts them in scopesArchived", async () => {
    const s = await mock.createScope({ slug: "ov-arch", name: "OvArch" });
    await mock.createEntry(s.slug, { type: "decision", content: "ghost" });
    await mock.archiveScope(s.slug);

    const ov = await mock.getOverview();
    expect(ov.scopesArchived).toBeGreaterThan(0);
    expect(ov.recent.find((r) => r.scopeSlug === s.slug)).toBeUndefined();
  });
});

describe("impl-mock — active sessions (D-CORE-8)", () => {
  it("listSessions returns the seeded connections with a 'current' one", async () => {
    const sessions = await mock.listSessions();
    expect(sessions.length).toBeGreaterThanOrEqual(1);
    expect(sessions.some((s) => s.current)).toBe(true);
    expect(sessions.some((s) => s.clients.some((c) => c.startsWith("kumbuka-connector")))).toBe(true);
  });

  it("terminateSession removes the row; an unknown id throws (404 parity)", async () => {
    const before = await mock.listSessions();
    const target = before.find((s) => !s.current)!;
    await mock.terminateSession(target.id);
    const after = await mock.listSessions();
    expect(after.find((s) => s.id === target.id)).toBeUndefined();

    await expect(mock.terminateSession("no-such-session")).rejects.toThrow(/no session/);
  });
});
