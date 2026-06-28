/**
 * In-process mock that matches the live API surface. Mutations write to
 * module-level state — fine for KUMBUKA_API_MOCK=1 dev mode (one Node
 * process), not fine for production. The interface is identical to
 * impl-live.ts so the swap is the only difference.
 */
import type {
  ActiveSession,
  ConnectorView,
  CreateEntryRequest,
  CreateScopeRequest,
  EntryView,
  EraseResult,
  InviteUserRequest,
  MemberDirectoryEntry,
  OnboardingState,
  OverviewView,
  ScopeView,
  SessionView,
  SettingsView,
  UpdateEntryRequest,
  UpdateMeRequest,
  UpdateScopeRequest,
  UpdateSettingsRequest,
  UpdateUserRequest,
  UserView,
  EntryType,
  RecentActivity,
} from "../api/types";
import { CONNECTOR, SCOPES, SETTINGS, USERS } from "./seed";

const state = {
  scopes: SCOPES,
  settings: { ...SETTINGS },
  connector: { ...CONNECTOR },
  users: USERS.map((u) => ({ ...u })),
  sessions: [
    {
      id: "sess-console",
      ipAddress: "192.0.2.10",
      startedAt: new Date(Date.now() - 36e5).toISOString(),
      lastAccessAt: new Date(Date.now() - 6e4).toISOString(),
      rememberMe: false,
      clients: ["kumbuka-admin"],
      current: true,
    },
    {
      id: "sess-connector",
      ipAddress: "198.51.100.4",
      startedAt: new Date(Date.now() - 3 * 864e5).toISOString(),
      lastAccessAt: new Date(Date.now() - 12 * 36e5).toISOString(),
      rememberMe: true,
      clients: ["kumbuka-connector-acme"],
      current: false,
    },
  ] as ActiveSession[],
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const newId = () => `e-${Math.random().toString(36).slice(2, 9)}`;

const nowIso = () => new Date().toISOString();

const stripEntries = (s: (typeof state.scopes)[number]): ScopeView => {
  const { entries, ...rest } = s;
  return { ...rest, entryCount: entries.length };
};

// ---------- Session ----------------------------------------------------
// D-CORE-10.1: onboarding state lives on the owner account server-side. In the
// mock it is process-local so the wizard is fully exercisable in MOCK_SESSION
// dev mode (undefined ⇒ not-yet-dismissed ⇒ first-login auto-open).
let mockOnboarding: OnboardingState | undefined;

export async function getSession(): Promise<SessionView> {
  const me = state.users.find((u) => u.self) ?? state.users[0];
  return {
    subject: me.subject,
    email: me.email,
    displayName: me.displayName,
    role: me.role,
    accountConsoleUrl: "/auth/realms/kumbuka/account",
    securityActionUrl:
      "/auth/realms/kumbuka/protocol/openid-connect/auth?client_id=kumbuka-admin" +
      "&response_type=code&scope=openid&code_challenge_method=S256&code_challenge=mock",
    muted: me.muted,
    onboarding: mockOnboarding,
  };
}
export async function updateMe(req: UpdateMeRequest): Promise<SessionView> {
  const me = state.users.find((u) => u.self) ?? state.users[0];
  if (req.displayName !== undefined) me.displayName = req.displayName.trim();
  if (req.onboarding !== undefined) mockOnboarding = req.onboarding;
  return getSession();
}

// ---------- Scopes -----------------------------------------------------
export async function listScopes(): Promise<ScopeView[]> {
  return state.scopes.map(stripEntries);
}
export async function getScope(slug: string): Promise<ScopeView | null> {
  const s = state.scopes.find((x) => x.slug === slug);
  return s ? stripEntries(s) : null;
}
export async function createScope(req: CreateScopeRequest): Promise<ScopeView> {
  const slug = req.slug || slugify(req.name);
  if (state.scopes.some((s) => s.slug === slug)) throw new Error(`slug taken: ${slug}`);
  const fresh: (typeof state.scopes)[number] = {
    slug,
    name: req.name,
    kind: "project",
    fixed: false,
    archived: false,
    locked: false,
    description: req.description ?? null,
    entryCount: 0,
    createdAt: nowIso(),
    entries: [],
    empty: true,
  };
  state.scopes.push(fresh);
  return stripEntries(fresh);
}
export async function renameScope(slug: string, req: UpdateScopeRequest): Promise<ScopeView> {
  const s = state.scopes.find((x) => x.slug === slug);
  if (!s) throw new Error(`no scope: ${slug}`);
  if (s.archived || s.fixed) throw new Error(`scope locked: ${slug}`);
  if (req.name !== undefined) s.name = req.name;
  if (req.description !== undefined) s.description = req.description;
  return stripEntries(s);
}
export async function archiveScope(slug: string): Promise<void> {
  const s = state.scopes.find((x) => x.slug === slug);
  if (!s) throw new Error(`no scope: ${slug}`);
  if (s.fixed) throw new Error("global scope cannot be archived");
  s.archived = true;
}
export async function unarchiveScope(slug: string): Promise<void> {
  const s = state.scopes.find((x) => x.slug === slug);
  if (!s) throw new Error(`no scope: ${slug}`);
  s.archived = false;
}
// FEAT-19 / D-CORE-18: content-lock toggle (orthogonal to fixed/archived — a
// fixed scope is lockable). Mirrors the server's setLocked.
export async function lockScope(slug: string): Promise<void> {
  const s = state.scopes.find((x) => x.slug === slug);
  if (!s) throw new Error(`no scope: ${slug}`);
  s.locked = true;
}
export async function unlockScope(slug: string): Promise<void> {
  const s = state.scopes.find((x) => x.slug === slug);
  if (!s) throw new Error(`no scope: ${slug}`);
  s.locked = false;
}

// ---------- Entries ----------------------------------------------------
export async function listEntries(slug: string): Promise<EntryView[]> {
  const s = state.scopes.find((x) => x.slug === slug);
  if (!s) throw new Error(`no scope: ${slug}`);
  if (s.syncError) {
    const err: Error & { status?: number } = new Error("Upstream sync error");
    err.status = 503;
    throw err;
  }
  return s.entries.slice();
}
export async function createEntry(slug: string, req: CreateEntryRequest): Promise<EntryView> {
  const s = state.scopes.find((x) => x.slug === slug);
  if (!s) throw new Error(`no scope: ${slug}`);
  if (s.archived) throw new Error("archived scope is read-only");
  const me = state.users.find((u) => u.self) ?? state.users[0];
  const fresh: EntryView = {
    id: newId(),
    type: req.type,
    key: req.key ?? null,
    content: req.content,
    reference: req.reference?.trim() || null,
    authorSubject: me.subject,
    source: "console",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  s.entries.unshift(fresh);
  s.entryCount = s.entries.length;
  s.empty = false;
  return fresh;
}
export async function updateEntry(
  slug: string,
  id: string,
  req: UpdateEntryRequest,
): Promise<EntryView> {
  const s = state.scopes.find((x) => x.slug === slug);
  if (!s) throw new Error(`no scope: ${slug}`);
  const entry = s.entries.find((x) => x.id === id);
  if (!entry) throw new Error(`no entry: ${id}`);
  if (req.type !== undefined) entry.type = req.type;
  if (req.content !== undefined) entry.content = req.content;
  // Parity with the backend: an explicit "" clears, a URL sets, undefined preserves.
  if (req.reference !== undefined) entry.reference = req.reference.trim() || null;
  entry.updatedAt = nowIso();
  return entry;
}
export async function deleteEntry(slug: string, id: string): Promise<void> {
  const s = state.scopes.find((x) => x.slug === slug);
  if (!s) throw new Error(`no scope: ${slug}`);
  s.entries = s.entries.filter((x) => x.id !== id);
  s.entryCount = s.entries.length;
  s.empty = s.entries.length === 0;
}
// D-CORE-17: atomic, lossless re-home of an entry to another shared scope.
// Mirrors the server contract: a target key-collision throws KEY_EXISTS (409)
// unless an optional `key` override is supplied; private scopes are excluded
// structurally (P1) and never appear as a target.
export async function remapEntry(
  sourceSlug: string,
  id: string,
  targetScope: string,
  key?: string,
): Promise<void> {
  const from = state.scopes.find((x) => x.slug === sourceSlug);
  if (!from) throw new Error(`no scope: ${sourceSlug}`);
  const to = state.scopes.find((x) => x.slug === targetScope);
  if (!to) throw new Error(`no scope: ${targetScope}`);
  const entry = from.entries.find((x) => x.id === id);
  if (!entry) throw new Error(`no entry: ${id}`);
  const nextKey = key?.trim() || entry.key;
  if (nextKey && to.entries.some((e) => e.key === nextKey)) {
    const err: Error & { status?: number; code?: string } = new Error("key already exists");
    err.status = 409;
    err.code = "KEY_EXISTS";
    throw err;
  }
  from.entries = from.entries.filter((x) => x.id !== id);
  from.entryCount = from.entries.length;
  from.empty = from.entries.length === 0;
  entry.key = nextKey;
  entry.updatedAt = nowIso();
  to.entries.unshift(entry);
  to.entryCount = to.entries.length;
  to.empty = false;
}

// ---------- Users ------------------------------------------------------
export async function listUsers(): Promise<UserView[]> {
  return state.users.map((u) => ({ ...u }));
}
export async function listDirectory(): Promise<MemberDirectoryEntry[]> {
  return state.users.map((u) => ({ subject: u.subject, displayName: u.displayName }));
}
export async function inviteUser(req: InviteUserRequest): Promise<UserView> {
  const fresh: UserView = {
    id: `u-${Math.random().toString(36).slice(2, 7)}`,
    subject: `kc-${Math.random().toString(36).slice(2, 7)}`,
    email: req.email,
    displayName: req.displayName ?? req.email.split("@")[0],
    role: req.role,
    status: "invited",
    lastSeenAt: null,
    muted: false,
  };
  state.users.push(fresh);
  return fresh;
}
export async function updateUser(id: string, req: UpdateUserRequest): Promise<UserView> {
  const u = state.users.find((x) => x.id === id);
  if (!u) throw new Error(`no user: ${id}`);
  if (req.role !== undefined) u.role = req.role;
  if (req.status !== undefined) u.status = req.status;
  if (req.muted !== undefined) u.muted = req.muted;   // D-CORE-2
  return { ...u };
}
export async function eraseUser(id: string, _typedConfirm: string): Promise<EraseResult> {
  const idx = state.users.findIndex((x) => x.id === id);
  if (idx < 0) throw new Error(`no user: ${id}`);
  const [removed] = state.users.splice(idx, 1);
  return {
    id,
    email: removed.email,
    privatePurged: 0,
    sharedTombstoned: 0,
    scopesTombstoned: 0,
    keycloakRemoved: true,
  };
}
export async function resendInvite(id: string): Promise<void> {
  if (!state.users.some((x) => x.id === id)) throw new Error(`no user: ${id}`);
}
export async function cancelInvite(id: string): Promise<void> {
  const idx = state.users.findIndex((x) => x.id === id);
  if (idx < 0) throw new Error(`no user: ${id}`);
  state.users.splice(idx, 1);
}

// ---------- Settings ---------------------------------------------------
export async function getSettings(): Promise<SettingsView> {
  return { ...state.settings };
}
export async function updateSettings(req: UpdateSettingsRequest): Promise<SettingsView> {
  if (req.writePolicy) state.settings.writePolicy = req.writePolicy;
  if (req.defaultScopeSlug !== undefined) state.settings.defaultScopeSlug = req.defaultScopeSlug;
  if (req.createScopes) state.settings.createScopes = req.createScopes;
  // Re-resolve effective.
  state.settings.effectiveWritePolicy = state.settings.writePolicy;
  const defaultArchived = state.settings.defaultScopeSlug
    ? state.scopes.find((s) => s.slug === state.settings.defaultScopeSlug)?.archived
    : false;
  state.settings.defaultScopeStatus = defaultArchived ? "archived" : "ok";
  return { ...state.settings };
}

// ---------- Connector --------------------------------------------------
export async function getConnector(): Promise<ConnectorView> {
  return { ...state.connector };
}
export async function rotateConnectorSecret(): Promise<ConnectorView> {
  const rnd = Math.random().toString(36).slice(2, 8);
  state.connector.clientSecretMasked = `sk_live_${rnd}••••••••••••••••${rnd.slice(0, 4)}`;
  return { ...state.connector };
}

// ---------- Overview ---------------------------------------------------
export async function getOverview(): Promise<OverviewView> {
  const all = state.scopes.flatMap((s) => s.entries);
  const byType: Partial<Record<EntryType, number>> = {};
  for (const e of all) byType[e.type] = (byType[e.type] ?? 0) + 1;

  const recent: RecentActivity[] = state.scopes
    .filter((s) => !s.archived)
    .flatMap((s) =>
      s.entries.map((e) => ({
        entryId: e.id,
        scopeSlug: s.slug,
        type: e.type,
        key: e.key,
        authorSubject: e.authorSubject,
        source: e.source,
        updatedAt: e.updatedAt,
      })),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);

  return {
    scopesTotal: state.scopes.filter((s) => !s.archived).length,
    scopesArchived: state.scopes.filter((s) => s.archived).length,
    entriesTotal: all.length,
    entriesByType: byType,
    recent,
    members: state.users.map((u) => ({
      id: u.id,
      subject: u.subject,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      status: u.status,
      muted: u.muted,
    })),
  };
}

// ---------- Active sessions (D-CORE-8) ---------------------------------
export async function listSessions(): Promise<ActiveSession[]> {
  return state.sessions.map((s) => ({ ...s, clients: [...s.clients] }));
}
export async function terminateSession(id: string): Promise<void> {
  const before = state.sessions.length;
  state.sessions = state.sessions.filter((s) => s.id !== id);
  if (state.sessions.length === before) {
    // Parity with the backend: an unknown / foreign id is a 404, not a no-op.
    throw new Error(`no session: ${id}`);
  }
}
