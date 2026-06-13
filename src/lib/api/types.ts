/**
 * Mirrors ai.kumbuka.admin.dto.AdminDtos and Dtos. Hand-written rather than
 * generated to keep the shape readable. Any drift surfaces in TypeScript at
 * the call sites, which is the desired failure mode.
 *
 * Per ADR-0003 the admin API never returns private rows; the union below
 * deliberately excludes `private` so an unsafe scope cannot type-check.
 */

export type ScopeKind = "global" | "project";

export const ENTRY_TYPE_ORDER = [
  "decision",
  "convention",
  "constraint",
  "open_question",
  "glossary",
  "status",
] as const;
export type EntryType = (typeof ENTRY_TYPE_ORDER)[number];

export const ENTRY_TYPES: Record<EntryType, { label: string; description: string }> = {
  decision: { label: "Decision", description: "A choice made and the reasoning that fixed it." },
  convention: { label: "Convention", description: "How the team does a thing — a recurring pattern." },
  constraint: { label: "Constraint", description: "A hard rule from outside the team (legal, perf, contract)." },
  open_question: { label: "Open question", description: "A known unknown, waiting on data or a stakeholder." },
  glossary: { label: "Glossary", description: "A term whose meaning the team needs to share." },
  status: { label: "Status", description: "Current state of a thing — short-lived." },
};

export type ScopeView = {
  slug: string;
  name: string;
  kind: ScopeKind;
  fixed: boolean;
  archived: boolean;
  description: string | null;
  entryCount: number;
  createdAt: string;
  /** Client-side flag; backend signals via 5xx on entries fetch — see scopes API module. */
  syncError?: boolean;
  /** Client-side flag derived from entryCount === 0. */
  empty?: boolean;
};

/** `source` = "console" (human via admin UI) or "mcp" (assistant) — see ADR-0008. */
export type EntrySource = "console" | "mcp";

export type EntryView = {
  id: string;
  type: EntryType;
  key: string | null;
  content: string;
  /** D-CORE-7: optional external provenance URL (where this came from); never auto-fetched. */
  reference: string | null;
  authorSubject: string;
  source: EntrySource;
  createdAt: string;
  updatedAt: string;
};

export type WritePolicy = "ask" | "project" | "global";
export type CreateScopes = "admins" | "members";
export type DefaultScopeStatus = "ok" | "missing" | "archived" | "invalid";

export type SettingsView = {
  writePolicy: WritePolicy;
  effectiveWritePolicy: WritePolicy;
  defaultScopeSlug: string | null;
  defaultScopeStatus: DefaultScopeStatus;
  createScopes: CreateScopes;
};

export type ConnectorView = {
  endpoint: string;
  /** Tenant-correct public MCP URL, server-derived (D-CORE-4). Render this. */
  mcpUrl: string;
  clientId: string;
  /** Masked secret for CE confidential connectors; null for SaaS public + PKCE connectors. */
  clientSecretMasked: string | null;
  idpName: string;
};

export type RecentActivity = {
  entryId: string;
  scopeSlug: string;
  type: EntryType;
  key: string | null;
  authorSubject: string;
  source: EntrySource;
  updatedAt: string;
};

export type MemberSummary = {
  id: string;
  subject: string;
  email: string;
  displayName: string;
  role: "admin" | "member";
  status: "active" | "invited" | "disabled";
};

export type OverviewView = {
  scopesTotal: number;
  scopesArchived: number;
  entriesTotal: number;
  entriesByType: Partial<Record<EntryType, number>>;
  recent: RecentActivity[];
  members: MemberSummary[];
};

export type UserRole = "admin" | "member";
export type UserStatus = "active" | "invited" | "disabled";

/**
 * The shape the UI consumes. `subject` and `displayName` are guaranteed
 * non-null; the live API layer derives them from the backend's Keycloak
 * fields (firstName / lastName / id) when the backend doesn't carry them
 * directly. `lastSeenAt` is best-effort.
 */
export type UserView = {
  id: string;
  subject: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  lastSeenAt: string | null;
  self?: boolean;
};

/** Shape coming straight off the backend's AdminUsersResource. */
export type RawUserView = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  status: UserStatus;
};

export function deriveUserView(raw: RawUserView, sessionSubject?: string): UserView {
  const name = [raw.firstName, raw.lastName].filter(Boolean).join(" ").trim();
  return {
    id: raw.id,
    // Backend currently doesn't return the Keycloak sub. The id (Keycloak
    // user id) is a stable surrogate that works for client-side keys and
    // author lookups while we wait for a proper subject claim.
    subject: raw.id,
    email: raw.email,
    displayName: name || raw.email,
    role: raw.role,
    status: raw.status,
    lastSeenAt: null,
    self: sessionSubject ? raw.email === sessionSubject : undefined,
  };
}

export type SessionView = {
  subject: string;
  /** Backend may return null when the OIDC token didn't carry an email claim. */
  email: string | null;
  /** Backend may return null when the user hasn't set a display name yet. */
  displayName: string | null;
  role: UserRole;
  accountConsoleUrl: string;
  /** Optional convenience — see ADR-0009. */
  loginUrl?: string;
};

// ---------- Requests ----------------------------------------------------

export type CreateScopeRequest = { slug: string; name: string; description?: string };
export type UpdateScopeRequest = { name?: string; description?: string };
export type CreateEntryRequest = { type: EntryType; key?: string; content: string; reference?: string };
export type UpdateEntryRequest = { type?: EntryType; content?: string; reference?: string };
export type UpdateSettingsRequest = {
  writePolicy?: WritePolicy;
  defaultScopeSlug?: string | null;
  createScopes?: CreateScopes;
};
export type UpdateMeRequest = { displayName?: string };
export type InviteUserRequest = { email: string; displayName?: string; role: UserRole };
export type UpdateUserRequest = { role?: UserRole; status?: UserStatus };
