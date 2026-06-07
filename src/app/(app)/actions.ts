"use server";

import { revalidatePath } from "next/cache";
import { setTheme as persistTheme, type Theme } from "@/lib/theme";
import {
  archiveScope,
  createEntry,
  createScope,
  deleteEntry,
  inviteUser,
  renameScope,
  rotateConnectorSecret,
  updateEntry,
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
