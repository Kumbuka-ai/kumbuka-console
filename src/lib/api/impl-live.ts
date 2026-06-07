/**
 * Live BFF-backed implementation of the data access surface. Each function
 * is the thinnest possible wrapper over serverFetch so call sites stay
 * declarative and the only place we touch HTTP is here.
 */
import { serverFetch } from "./client";
import { deriveUserView } from "./types";
import type {
  ConnectorView,
  CreateEntryRequest,
  CreateScopeRequest,
  EntryView,
  InviteUserRequest,
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
  const raw = await serverFetch<RawUserView>(`/api/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
  return deriveUserView(raw);
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
