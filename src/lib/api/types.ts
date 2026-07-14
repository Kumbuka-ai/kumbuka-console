/**
 * Mirrors ai.kumbuka.admin.dto.AdminDtos and Dtos. Hand-written rather than
 * generated to keep the shape readable. Any drift surfaces in TypeScript at
 * the call sites, which is the desired failure mode.
 *
 * Per ADR-0003 the admin API never returns private rows; the union below
 * deliberately excludes `private` so an unsafe scope cannot type-check.
 */

import type { Locale } from "@/i18n/config";

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

// Entry-type labels + descriptions are localized — see the `entryTypes`
// message namespace (resolved via useTranslations in TypeChip / the editors).

export type ScopeView = {
  slug: string;
  name: string;
  kind: ScopeKind;
  fixed: boolean;
  archived: boolean;
  /**
   * FEAT-19 / D-CORE-18: scope-level content lock (read-only). Orthogonal to
   * `fixed` (existence/identity) and `archived` (hidden) — never conflate them.
   * Server-returned; a member's mutation of a locked scope is rejected
   * (`409 SCOPE_READ_ONLY`), an admin's console write is an audited override.
   */
  locked: boolean;
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

/**
 * Server-derived system identity (D-CORE-11). Authors the protected
 * `how-to-kumbuka` seed mnemonics, which are structurally undeletable and
 * read-only in the console (rendered as "System").
 */
export const SYSTEM_SUBJECT = "__system__";

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

/**
 * The backend `EntryView` wire shape (mirrors `AdminDtos.EntryView`). ADR-0024
 * Amendment 3 made `logicalId` the entry's reference identity, so the wire field
 * is `logicalId` (not `id`); `deriveEntryView` maps it to the internal
 * `EntryView.id` at the adapter seam. `updatedBy`/`updatedSource` (Amendment 4)
 * are received here so the type is honest, but deliberately NOT mapped onto the
 * internal `EntryView` — a "last edited by" display is a later feature.
 */
export type RawEntryView = {
  logicalId: string;
  type: EntryType;
  key: string | null;
  content: string;
  reference: string | null;
  authorSubject: string;
  source: EntrySource;
  updatedBy: string | null;
  updatedSource: string | null;
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
  /** D-CORE-2: shared writes suspended while true. */
  muted: boolean;
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
  /** D-CORE-2: shared writes suspended while true. */
  muted: boolean;
};

/**
 * Member-safe projection of the tenant's users — subject + displayName only.
 * Backs `GET /api/users/directory`, which any member may read (the full roster
 * via `listUsers` is admin-only, P0 read-authz). `displayName` is null when the
 * Keycloak account has no name; callers fall back to the subject.
 */
export type MemberDirectoryEntry = {
  subject: string;
  displayName: string | null;
};

/** Shape coming straight off the backend's AdminUsersResource. */
export type RawUserView = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  status: UserStatus;
  /** D-CORE-2; optional for forward-compat — `deriveUserView` defaults it to false. */
  muted?: boolean;
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
    muted: raw.muted ?? false,
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
  /**
   * Authorize-endpoint base for Keycloak Application Initiated Actions. The
   * account screen appends `&redirect_uri=<origin>/account&kc_action=<ACTION>`
   * to deep-link password / 2FA / passkey management (instead of the generic
   * signing-in page). Carries a fresh PKCE challenge. Optional for
   * forward-compat with mock/older payloads.
   */
  securityActionUrl?: string;
  /** Optional convenience — see ADR-0009. */
  loginUrl?: string;
  /** D-CORE-2: the caller's own mute state — drives the member notice + gating. */
  muted: boolean;
  /**
   * #49: the user's persisted UI language (user_account.locale, Flyway V11).
   * Optional for forward-compat with mock/older payloads; the cookie is the
   * SSR source of truth and is seeded from this on a fresh device.
   */
  locale?: Locale;
  /**
   * D-CORE-10.1: the tenant-owner's onboarding-wizard state, server-side per
   * account so "first login" and "resume" survive across devices (never
   * localStorage). Optional/forward-compat: until the backend persists it
   * (the `user_account` field is the returned Stage-0 gap — mirror V11 locale),
   * this is absent and the console treats the wizard as not-yet-dismissed.
   */
  onboarding?: OnboardingState;
  /**
   * Per-user UI presentation settings (user_account.settings — one typed
   * jsonb field, server-validated). Presentation state ONLY, never anything
   * that reveals how a user works. Optional for forward-compat with
   * mock/older payloads; unset fields mean "user never chose" and the
   * surface defaults to expanded.
   */
  settings?: UiSettings;
};

/**
 * D-CORE-10.1 onboarding-wizard state. `dismissed` once the owner finishes or
 * opts out (both reach the same dismissed state); `lastStep` is the resume
 * point (0-based) while still pending.
 */
export type OnboardingState = { dismissed: boolean; lastStep: number };

/**
 * Per-user UI presentation settings, mirrored from the server's typed shape.
 * Each field is tri-state: `true`/`false` = the user chose, `null`/absent =
 * unset (surface renders expanded). When PATCHing, send only the field being
 * changed — the server merges field-wise (see UpdateMeRequest.settings).
 */
export type UiSettings = {
  /** The connect block on the overview page is collapsed. */
  connectCollapsed?: boolean | null;
  /** The navigation sidebar is collapsed. */
  navCollapsed?: boolean | null;
  /** The scope list on the scope browser is collapsed. */
  scopesCollapsed?: boolean | null;
};

/**
 * D-CORE-8: one of the member's own active Keycloak sessions. Scoped to
 * `subject == caller` server-side — never another member's. `clients` are
 * the OAuth clients seen on the session (`kumbuka-admin`,
 * `kumbuka-connector-<alias>`), shown as a human label. `current` marks the
 * session backing the active console request.
 */
export type ActiveSession = {
  id: string;
  ipAddress: string | null;
  startedAt: string | null;
  lastAccessAt: string | null;
  rememberMe: boolean;
  clients: string[];
  current: boolean;
};

/** FEAT-32: the self-service credential types a member can see and remove. */
export type CredentialType = "otp" | "webauthn" | "webauthn-passwordless";

/**
 * FEAT-32: one of the caller's own credentials (authenticator app or passkey /
 * security key). Keycloak stores no "last used", so only `userLabel` (may be
 * null) and `createdDate` are shown.
 */
export type CredentialView = {
  id: string;
  type: CredentialType;
  userLabel: string | null;
  createdDate: string | null;
};

/**
 * FEAT-32: the `GET /api/credentials` payload. Wraps the credential list with
 * `recoveryCodesConfigured` — presence-only (the caller holds a Keycloak
 * `recovery-authn-codes` credential); the codes themselves are never returned
 * (Keycloak shows them once on its own themed AIA page).
 */
export type CredentialsView = {
  credentials: CredentialView[];
  recoveryCodesConfigured: boolean;
};

// ---------- Requests ----------------------------------------------------

export type CreateScopeRequest = { slug: string; name: string; description?: string };
export type UpdateScopeRequest = { name?: string; description?: string };
export type CreateEntryRequest = { type: EntryType; key?: string; content: string; reference?: string };
export type UpdateEntryRequest = { type?: EntryType; content?: string; reference?: string };

/**
 * Why an entry write failed, mapped from the backend's typed error contract so
 * the editor can render a translated message instead of crashing the render
 * (SESSION_016/017). `validation` may carry the backend's specific reason.
 */
export type EntryWriteError =
  | "muted"
  | "forbidden"
  | "protected"
  | "readOnly"
  | "exists"
  | "validation"
  | "stale"
  | "generic";
export type EntryActionResult =
  | { ok: true }
  | { ok: false; reason: EntryWriteError; detail?: string };

/**
 * Scope create/rename/archive/unarchive outcome (dogfood-19). Like
 * EntryActionResult, scope-write actions RETURN this instead of throwing, so a
 * non-2xx never bubbles into an uncaught Server-Components render crash.
 * `exists` = the slug is taken (often by an ARCHIVED scope — surface the
 * archived-collision hint). Server 409 `SCOPE_EXISTS` maps here when present;
 * until that server mapping ships, a duplicate degrades to `generic`.
 */
export type ScopeWriteError = "exists" | "forbidden" | "validation" | "generic";
export type ScopeActionResult =
  | { ok: true }
  | { ok: false; reason: ScopeWriteError; detail?: string };
export type UpdateSettingsRequest = {
  writePolicy?: WritePolicy;
  defaultScopeSlug?: string | null;
  createScopes?: CreateScopes;
};
/**
 * `settings` is a field-wise patch: send ONLY the field being changed — the
 * server merges it into the stored object, so two surfaces saving in
 * parallel (two tabs) cannot erase each other's writes. Unknown or
 * wrong-typed settings fields are rejected server-side with 400, never stored.
 */
export type UpdateMeRequest = {
  displayName?: string;
  locale?: Locale;
  onboarding?: OnboardingState;
  settings?: UiSettings;
};
export type InviteUserRequest = { email: string; displayName?: string; role: UserRole };
export type UpdateUserRequest = { role?: UserRole; status?: UserStatus; muted?: boolean };

/**
 * Outcome of a member erasure (D-OPS-16). Counts only — never content. The UI
 * uses it for the success toast; the authoritative effect is server-side.
 */
export type EraseResult = {
  id: string;
  email: string;
  privatePurged: number;
  sharedTombstoned: number;
  scopesTombstoned: number;
  keycloakRemoved: boolean;
};
