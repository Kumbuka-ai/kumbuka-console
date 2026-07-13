"use server";

import { revalidatePath } from "next/cache";
import { setTheme as persistTheme, type Theme } from "@/lib/theme";
import { setLocale as persistLocaleCookie } from "@/lib/locale";
import type { Locale } from "@/i18n/config";
import {
  ApiAuthError,
  ApiError,
  archiveScope,
  unarchiveScope,
  lockScope,
  unlockScope,
  cancelInvite,
  createEntry,
  createScope,
  deleteEntry,
  remapEntry,
  eraseUser,
  getSession,
  inviteUser,
  renameScope,
  resendInvite,
  updateEntry,
  terminateSession,
  logoutOtherSessions,
  deleteCredential,
  updateMe,
  updateSettings,
  updateUser,
} from "@/lib/api";
import type {
  CreateEntryRequest,
  CreateScopeRequest,
  EntryActionResult,
  InviteUserRequest,
  OnboardingState,
  ScopeActionResult,
  UpdateEntryRequest,
  UpdateMeRequest,
  UpdateSettingsRequest,
  UpdateUserRequest,
} from "@/lib/api/types";

type WriteFailure = Extract<EntryActionResult, { ok: false }>;

const PROTECTED_CODES = new Set(["PROTECTED_UPSERT_BLOCKED", "PROTECTED_DELETE_BLOCKED"]);

// After widening entry writes to members server-side, a 403 means the caller is
// muted (D-CORE-2) — distinguish it from the admin-only path via their session.
async function resolveForbidden(): Promise<WriteFailure> {
  let muted = false;
  try {
    muted = (await getSession()).muted;
  } catch {
    /* fall back to the admin-only message */
  }
  return { ok: false, reason: muted ? "muted" : "forbidden" };
}

function mapApiError(err: ApiError): WriteFailure {
  const body = err.body as { code?: string; message?: string } | undefined;
  if (err.status === 409 && body?.code && PROTECTED_CODES.has(body.code)) {
    return { ok: false, reason: "protected" };
  }
  // FEAT-19 / D-CORE-18: a member's write to a content-locked scope is rejected
  // by the server with 409 SCOPE_READ_ONLY. Surface a read-only message, never a
  // generic failure. (Admins don't hit this — their console write is an override.)
  if (err.status === 409 && body?.code === "SCOPE_READ_ONLY") {
    return { ok: false, reason: "readOnly" };
  }
  // D-CORE-16: a key already exists in the scope — surface the rename hint, never
  // a silent overwrite. (Until the server ships KEY_EXISTS, a duplicate may be a
  // 500 → "generic"; the console live-guard catches the common visible case.)
  if (err.status === 409 && body?.code === "KEY_EXISTS") {
    return { ok: false, reason: "exists" };
  }
  // §A1.6 optimistic locking: a concurrent edit advanced the version under this
  // write — offer a reload-and-retry, never a silent clobber.
  if (err.status === 409 && body?.code === "STALE_VERSION") {
    return { ok: false, reason: "stale" };
  }
  if (err.status === 400) {
    return { ok: false, reason: "validation", detail: body?.message };
  }
  return { ok: false, reason: "generic" };
}

/**
 * Map a backend write failure to a typed result the form can translate.
 * Without this, a non-2xx bubbles as an uncaught Server-Components render
 * error that production redacts to a generic message (SESSION_016/017).
 * ApiAuthError is re-thrown so the session-expiry → /signin redirect still
 * fires.
 */
async function entryWriteFailure(err: unknown): Promise<WriteFailure> {
  if (err instanceof ApiAuthError) throw err;
  if (!(err instanceof ApiError)) return { ok: false, reason: "generic" };
  if (err.status === 403) return resolveForbidden();
  return mapApiError(err);
}

/**
 * Map a failed scope write to a typed ScopeActionResult (dogfood-19) — the same
 * shape as entryWriteFailure so a non-2xx never bubbles into a Server-Components
 * crash. A 409 (with code SCOPE_EXISTS once the server maps it, or any 409) =
 * the slug is taken; ApiAuthError is re-thrown for the /signin redirect. Until
 * the server ships the typed 409, a duplicate currently arrives as a 500 and
 * degrades to `generic` — still a readable toast, not a crash; the client
 * dup-guard catches the common (visible-slug) case before the request.
 */
function scopeWriteFailure(err: unknown): Extract<ScopeActionResult, { ok: false }> {
  if (err instanceof ApiAuthError) throw err;
  if (!(err instanceof ApiError)) return { ok: false, reason: "generic" };
  const body = err.body as { code?: string; message?: string } | undefined;
  if (err.status === 409) return { ok: false, reason: "exists" };
  if (err.status === 403) return { ok: false, reason: "forbidden" };
  if (err.status === 400) return { ok: false, reason: "validation", detail: body?.message };
  return { ok: false, reason: "generic" };
}

export async function setThemeAction(t: Theme) {
  await persistTheme(t);
}

/**
 * #49: switch UI language. The cookie is the SSR source of truth (applied
 * immediately); persisting to user_account.locale is best-effort so the
 * choice follows the user across devices — a backend hiccup must not block
 * the local switch.
 */
export async function setLocaleAction(l: Locale) {
  await persistLocaleCookie(l);
  try {
    await updateMe({ locale: l });
  } catch {
    // Cookie already applied; the backend will catch up on the next change.
  }
}

// Scopes ---------------------------------------------------------------
// dogfood-19: these RETURN a typed ScopeActionResult instead of throwing, so a
// non-2xx (e.g. duplicate slug) never bubbles into an uncaught Server-Components
// render crash — same discipline as the entry actions.
export async function createScopeAction(req: CreateScopeRequest): Promise<ScopeActionResult> {
  try {
    await createScope(req);
  } catch (err) {
    return scopeWriteFailure(err);
  }
  revalidatePath("/scopes");
  revalidatePath("/overview");
  return { ok: true };
}
export async function renameScopeAction(
  slug: string,
  name: string,
  description?: string,
): Promise<ScopeActionResult> {
  try {
    await renameScope(slug, { name, description });
  } catch (err) {
    return scopeWriteFailure(err);
  }
  revalidatePath(`/scopes/${slug}`);
  revalidatePath("/scopes");
  return { ok: true };
}
export async function archiveScopeAction(slug: string): Promise<ScopeActionResult> {
  try {
    await archiveScope(slug);
  } catch (err) {
    return scopeWriteFailure(err);
  }
  revalidatePath("/scopes");
  revalidatePath("/overview");
  return { ok: true };
}
// dogfood-16: reverse of archive. Consumes the server POST /api/scopes/{slug}:unarchive
// (SPRINT_21.S2). Until that endpoint is deployed this returns reason:"generic"
// (a readable toast, not a crash) — see the handover.
export async function unarchiveScopeAction(slug: string): Promise<ScopeActionResult> {
  try {
    await unarchiveScope(slug);
  } catch (err) {
    return scopeWriteFailure(err);
  }
  revalidatePath(`/scopes/${slug}`);
  revalidatePath("/scopes");
  revalidatePath("/overview");
  return { ok: true };
}

// FEAT-19 / D-CORE-18: content-lock toggle (admin-only; the server @RolesAllowed
// is the guarantee, a 403 → forbidden). Mirrors archiveScopeAction's shape —
// returns a typed ScopeActionResult, revalidates the scope + list + overview so
// the lock state and the derived gating re-render. The console never audits;
// the server emits the scope.lock / scope.unlock governance event.
export async function lockScopeAction(slug: string): Promise<ScopeActionResult> {
  try {
    await lockScope(slug);
  } catch (err) {
    return scopeWriteFailure(err);
  }
  revalidatePath(`/scopes/${slug}`);
  revalidatePath("/scopes");
  revalidatePath("/overview");
  return { ok: true };
}
export async function unlockScopeAction(slug: string): Promise<ScopeActionResult> {
  try {
    await unlockScope(slug);
  } catch (err) {
    return scopeWriteFailure(err);
  }
  revalidatePath(`/scopes/${slug}`);
  revalidatePath("/scopes");
  revalidatePath("/overview");
  return { ok: true };
}

// Entries --------------------------------------------------------------
export async function createEntryAction(slug: string, req: CreateEntryRequest): Promise<EntryActionResult> {
  try {
    await createEntry(slug, req);
  } catch (err) {
    return entryWriteFailure(err);
  }
  revalidatePath(`/scopes/${slug}`);
  revalidatePath("/overview");
  return { ok: true };
}
export async function updateEntryAction(
  slug: string,
  id: string,
  req: UpdateEntryRequest,
): Promise<EntryActionResult> {
  try {
    await updateEntry(slug, id, req);
  } catch (err) {
    return entryWriteFailure(err);
  }
  revalidatePath(`/scopes/${slug}`);
  return { ok: true };
}
export async function deleteEntryAction(slug: string, id: string): Promise<EntryActionResult> {
  try {
    await deleteEntry(slug, id);
  } catch (err) {
    return entryWriteFailure(err);
  }
  revalidatePath(`/scopes/${slug}`);
  revalidatePath("/overview");
  return { ok: true };
}
// D-CORE-17: re-home an entry to another shared scope (admin). Reuses
// scopeWriteFailure so a target key-collision (409 KEY_EXISTS) maps to
// reason:"exists" and the private-target rejection (400 REMAP_PRIVATE_FORBIDDEN)
// to reason:"validation" — never a Server-Components crash. Forward-compatible:
// until S3 ships the :remap endpoint a 404 degrades to "generic" (readable toast).
export async function remapEntryAction(
  sourceSlug: string,
  id: string,
  targetScope: string,
  key?: string,
): Promise<ScopeActionResult> {
  try {
    await remapEntry(sourceSlug, id, targetScope, key);
  } catch (err) {
    return scopeWriteFailure(err);
  }
  revalidatePath(`/scopes/${sourceSlug}`);
  revalidatePath(`/scopes/${targetScope}`);
  revalidatePath("/overview");
  return { ok: true };
}

// Users ----------------------------------------------------------------
export async function inviteUserAction(req: InviteUserRequest) {
  const out = await inviteUser(req);
  revalidatePath("/team");
  return out;
}
export async function updateUserAction(id: string, req: UpdateUserRequest) {
  const out = await updateUser(id, req);
  revalidatePath("/team");
  return out;
}
export async function eraseUserAction(id: string, typedConfirm: string) {
  const out = await eraseUser(id, typedConfirm);
  revalidatePath("/team");
  revalidatePath("/overview");
  return out;
}
export async function resendInviteAction(id: string) {
  await resendInvite(id);
  revalidatePath("/team");
}
export async function cancelInviteAction(id: string) {
  await cancelInvite(id);
  revalidatePath("/team");
  revalidatePath("/overview");
}

// Settings -------------------------------------------------------------
export async function updateSettingsAction(req: UpdateSettingsRequest) {
  const out = await updateSettings(req);
  revalidatePath("/settings");
  return out;
}

// Account --------------------------------------------------------------
export async function updateMeAction(req: UpdateMeRequest) {
  const out = await updateMe(req);
  revalidatePath("/account");
  revalidatePath("/overview");
  return out;
}

/**
 * D-CORE-10.1: persist the onboarding-wizard state on the owner account so
 * dismissal + resume survive across devices (never localStorage). Best-effort,
 * exactly like setLocaleAction's updateMe: the wizard's local open/step state
 * already reflects the user's action, so a backend hiccup must not block the
 * UI. NOTE (Stage-0 gap): until the server persists `onboarding` on
 * `user_account` (mirror V11 locale — see the handover), this write is a no-op
 * server-side and the wizard reopens on the next login. The console side is
 * forward-compatible: the day the field lands, this starts persisting with no
 * console change.
 */
export async function setOnboardingAction(state: OnboardingState) {
  try {
    await updateMe({ onboarding: state });
  } catch {
    // Local wizard state already updated; the backend will catch up once the
    // account field exists. Never surface this to the user.
  }
}

// D-CORE-8: terminate one of the caller's own sessions. The backend
// enforces subject == caller and 404s a foreign id; we just revalidate so
// the account page re-reads the (now shorter) list.
export async function terminateSessionAction(id: string) {
  await terminateSession(id);
  revalidatePath("/account");
}

// F-0082: end every session except the current one. The backend spares the
// caller's current session and 409s if it can't be identified (never a silent
// "log out everything"); we revalidate so the account page re-reads the list.
export async function logoutOtherSessionsAction() {
  await logoutOtherSessions();
  revalidatePath("/account");
}

// FEAT-32: remove one of the caller's own credentials (authenticator / passkey).
// The backend enforces subject == caller + self-service type and 404s anything
// else; we revalidate so the account page re-reads the (now shorter) list.
export async function deleteCredentialAction(id: string) {
  await deleteCredential(id);
  revalidatePath("/account");
}
