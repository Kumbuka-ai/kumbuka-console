/**
 * Live BFF-backed implementation of the data access surface. Each function
 * is the thinnest possible wrapper over serverFetch so call sites stay
 * declarative and the only place we touch HTTP is here.
 */
import { serverFetch } from "./client";
import { deriveUserView } from "./types";
import type {
  ActiveSession,
  ConnectorView,
  CreateEntryRequest,
  CreateScopeRequest,
  EntryView,
  EraseResult,
  InviteUserRequest,
  MemberDirectoryEntry,
  OverviewView,
  RawUserView,
  ScopeView,
  SessionView,
  SettingsView,
  UpdateEntryRequest,
  UpdateMeRequest,
  UpdateScopeRequest,
  UpdateSettingsRequest,
  UpdateUserRequest,
  UserView,
} from "./types";

// ---------- Session ----------------------------------------------------
export const getSession = () => serverFetch<SessionView>("/api/auth/me");
export const updateMe = (req: UpdateMeRequest) =>
  serverFetch<SessionView>("/api/auth/me", { method: "PATCH", body: req });

// ---------- Active sessions (D-CORE-8) ---------------------------------
export const listSessions = () => serverFetch<ActiveSession[]>("/api/sessions");
export const terminateSession = (id: string) =>
  serverFetch<void>(`/api/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });

// ---------- Scopes -----------------------------------------------------
export const listScopes = () => serverFetch<ScopeView[]>("/api/scopes");
export const getScope = async (slug: string) => {
  const all = await listScopes();
  return all.find((s) => s.slug === slug) ?? null;
};
export const createScope = (req: CreateScopeRequest) =>
  serverFetch<ScopeView>("/api/scopes", { method: "POST", body: req });
export const renameScope = (slug: string, req: UpdateScopeRequest) =>
  serverFetch<ScopeView>(`/api/scopes/${encodeURIComponent(slug)}`, { method: "PATCH", body: req });
export const archiveScope = (slug: string) =>
  serverFetch<void>(`/api/scopes/${encodeURIComponent(slug)}:archive`, { method: "POST" });
export const unarchiveScope = (slug: string) =>
  serverFetch<void>(`/api/scopes/${encodeURIComponent(slug)}:unarchive`, { method: "POST" });

// ---------- Entries ----------------------------------------------------
export const listEntries = (slug: string) =>
  serverFetch<EntryView[]>(`/api/scopes/${encodeURIComponent(slug)}/entries`);
export const createEntry = (slug: string, req: CreateEntryRequest) =>
  serverFetch<EntryView>(`/api/scopes/${encodeURIComponent(slug)}/entries`, { method: "POST", body: req });
export const updateEntry = (slug: string, id: string, req: UpdateEntryRequest) =>
  serverFetch<EntryView>(`/api/scopes/${encodeURIComponent(slug)}/entries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: req,
  });
export const deleteEntry = (slug: string, id: string) =>
  serverFetch<void>(`/api/scopes/${encodeURIComponent(slug)}/entries/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

// ---------- Users ------------------------------------------------------
/**
 * The backend currently returns RawUserView (Keycloak shape). We derive a
 * UI-friendly view here so the screens see a consistent shape regardless
 * of where the data came from (live vs mock).
 */
export async function listUsers(): Promise<UserView[]> {
  const raw = await serverFetch<RawUserView[]>("/api/users");
  return raw.map((r) => deriveUserView(r));
}
/**
 * Member-safe directory (subject + displayName only). Use this — not
 * `listUsers` — wherever a non-admin page needs to resolve author names
 * (layout rail, overview feed, scope authorship). `listUsers` is admin-only
 * (P0 read-authz): calling it as a member 403s.
 */
export async function listDirectory(): Promise<MemberDirectoryEntry[]> {
  return serverFetch<MemberDirectoryEntry[]>("/api/users/directory");
}
export async function inviteUser(req: InviteUserRequest): Promise<UserView> {
  // Backend's invite payload still uses firstName/lastName.
  const body = {
    email: req.email,
    firstName: req.displayName?.split(" ")[0] ?? null,
    lastName: req.displayName?.split(" ").slice(1).join(" ") || null,
    role: req.role,
  };
  const raw = await serverFetch<RawUserView>("/api/users", { method: "POST", body });
  return deriveUserView(raw);
}
export async function updateUser(id: string, req: UpdateUserRequest): Promise<UserView> {
  // Backend expects `enabled: boolean` rather than the UI's status enum.
  const body: Record<string, unknown> = {};
  if (req.role !== undefined) body.role = req.role;
  if (req.status !== undefined) body.enabled = req.status === "active";
  if (req.muted !== undefined) body.muted = req.muted;   // D-CORE-2
  const raw = await serverFetch<RawUserView>(`/api/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
  return deriveUserView(raw);
}
/**
 * Permanently erase a member (D-OPS-16). `typedConfirm` echoes the member's
 * email and is re-validated server-side; the purge is by subject and never
 * surfaces content (P1).
 */
export async function eraseUser(id: string, typedConfirm: string): Promise<EraseResult> {
  return serverFetch<EraseResult>(`/api/users/${encodeURIComponent(id)}/erase`, {
    method: "POST",
    body: { typedConfirm },
  });
}
/** Re-send the enrolment email for a member still in `invited` status. */
export async function resendInvite(id: string): Promise<void> {
  await serverFetch<void>(`/api/users/${encodeURIComponent(id)}/resend-invite`, { method: "POST" });
}
/** Cancel a pending invite — deletes the never-accepted Keycloak user. */
export async function cancelInvite(id: string): Promise<void> {
  await serverFetch<void>(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ---------- Settings ---------------------------------------------------
export const getSettings = () => serverFetch<SettingsView>("/api/settings");
export const updateSettings = (req: UpdateSettingsRequest) =>
  serverFetch<SettingsView>("/api/settings", { method: "PATCH", body: req });

// ---------- Connector --------------------------------------------------
export const getConnector = () => serverFetch<ConnectorView>("/api/connector");
export const rotateConnectorSecret = () =>
  serverFetch<ConnectorView>("/api/connector/secret/rotate", { method: "POST" });

// ---------- Overview ---------------------------------------------------
export const getOverview = () => serverFetch<OverviewView>("/api/overview");
