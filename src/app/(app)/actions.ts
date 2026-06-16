"use server";

import { revalidatePath } from "next/cache";
import { setTheme as persistTheme, type Theme } from "@/lib/theme";
import { setLocale as persistLocaleCookie } from "@/lib/locale";
import type { Locale } from "@/i18n/config";
import {
  archiveScope,
  cancelInvite,
  createEntry,
  createScope,
  deleteEntry,
  eraseUser,
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
  InviteUserRequest,
  UpdateEntryRequest,
  UpdateMeRequest,
  UpdateSettingsRequest,
  UpdateUserRequest,
} from "@/lib/api/types";

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
export async function createEntryAction(slug: string, req: CreateEntryRequest) {
  const out = await createEntry(slug, req);
  revalidatePath(`/scopes/${slug}`);
  revalidatePath("/overview");
  return out;
}
export async function updateEntryAction(slug: string, id: string, req: UpdateEntryRequest) {
  const out = await updateEntry(slug, id, req);
  revalidatePath(`/scopes/${slug}`);
  return out;
}
export async function deleteEntryAction(slug: string, id: string) {
  await deleteEntry(slug, id);
  revalidatePath(`/scopes/${slug}`);
  revalidatePath("/overview");
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
