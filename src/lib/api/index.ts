/**
 * Single entry point — picks the live BFF client or the in-process mock
 * based on KUMBUKA_API_MOCK. Server-only.
 */
import "server-only";

const MOCK = process.env.KUMBUKA_API_MOCK === "1";

import * as live from "./impl-live";
import * as mock from "../mock/impl-mock";

const impl = MOCK ? mock : live;

// In MOCK mode the data layer is bypassed entirely, but we still want the
// real OIDC sign-in flow to run end-to-end against Keycloak — otherwise
// /signin becomes cosmetic. So session calls always go live, even in mock
// mode. (Toggle KUMBUKA_API_MOCK_SESSION=1 to also mock the session.)
const MOCK_SESSION = MOCK && process.env.KUMBUKA_API_MOCK_SESSION === "1";

export const getSession = MOCK_SESSION ? mock.getSession : live.getSession;
export const updateMe = MOCK_SESSION ? mock.updateMe : live.updateMe;

export const {
  listScopes,
  getScope,
  createScope,
  renameScope,
  archiveScope,
  listEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  listUsers,
  inviteUser,
  updateUser,
  getSettings,
  updateSettings,
  getConnector,
  rotateConnectorSecret,
  getOverview,
} = impl;

export { ApiAuthError, ApiError } from "./client";
