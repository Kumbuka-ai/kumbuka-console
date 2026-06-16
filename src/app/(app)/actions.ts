"use server";

import { revalidatePath } from "next/cache";
import { setTheme as persistTheme, type Theme } from "@/lib/theme";
import { setLocale as persistLocaleCookie } from "@/lib/locale";
import type { Locale } from "@/i18n/config";
import {
  ApiAuthError,
  ApiError,
  archiveScope,
  cancelInvite,
  createEntry,
  createScope,
  deleteEntry,
  eraseUser,
  getSession,
  inviteUser,
  renameScope,
  resendInvite,
  rotateConnectorSecret,
  updateEntry,
  terminateSession,
  updateMe,
  updateSettings,
  updateUser,
} from "@/lib/api";
import type {
  CreateEntryRequest,
  CreateScopeRequest,
  EntryActionResult,
  InviteUserRequest,
  UpdateEntryRequest,
  UpdateMeRequest,
  UpdateSettingsRequest,
  UpdateUserRequest,
} from "@/lib/api/types";

/**
 * Map a backend write failure to a typed result the form can translate.
 * Without this, a non-2xx bubbles as an uncaught Server-Components render
 * error that production redacts to a generic message (SESSION_016/017).
 * ApiAuthError is re-thrown so the session-expiry → /signin redirect still
 * fires.
 */
async function entryWriteFailure(err: unknown): Promise<Extract<EntryActionResult, { ok: false }>> {
  if (err instanceof ApiAuthError) throw err;
  if (err instanceof ApiError) {
    if (err.status === 403) {
      // After widening entry writes to members server-side, a 403 means the
      // caller is muted (D-CORE-2) — distinguish it from the admin-only path.
      let muted = false;
      try {
        muted = (await getSession()).muted;
      } catch {
        /* fall back to the admin-only message */
      }
      return { ok: false, reason: muted ? "muted" : "forbidden" };
    }
    if (err.status === 409) {
      const code = (err.body as { code?: string } | undefined)?.code;
      if (code === "PROTECTED_UPSERT_BLOCKED" || code === "PROTECTED_DELETE_BLOCKED") {
        return { ok: false, reason: "protected" };
      }
    }
    if (err.status === 400) {
      const message = (err.body as { message?: string } | undefined)?.message;
      return { ok: false, reason: "validation", detail: message };
    }
  }
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
export async function createScopeAction(req: CreateScopeRequest) {
  const out = await createScope(req);
  revalidatePath("/scopes");
  revalidatePath("/overview");
  return out;
}
export async function renameScopeAction(slug: string, name: string, description?: string) {
  const out = await renameScope(slug, { name, description });
  revalidatePath(`/scopes/${slug}`);
  revalidatePath("/scopes");
  return out;
}
export async function archiveScopeAction(slug: string) {
  await archiveScope(slug);
  revalidatePath("/scopes");
  revalidatePath("/overview");
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

// Connector ------------------------------------------------------------
export async function rotateSecretAction() {
  const out = await rotateConnectorSecret();
  revalidatePath("/settings");
  revalidatePath("/overview");
  return out;
}

// Account --------------------------------------------------------------
export async function updateMeAction(req: UpdateMeRequest) {
  const out = await updateMe(req);
  revalidatePath("/account");
  revalidatePath("/overview");
  return out;
}

// D-CORE-8: terminate one of the caller's own sessions. The backend
// enforces subject == caller and 404s a foreign id; we just revalidate so
// the account page re-reads the (now shorter) list.
export async function terminateSessionAction(id: string) {
  await terminateSession(id);
  revalidatePath("/account");
}
