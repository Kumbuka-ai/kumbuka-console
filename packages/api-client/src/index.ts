/**
 * @kumbuka-ai/api-client — the framework only.
 *
 * Shipped here:
 *   - `serverFetch` + the shared error types (`ApiAuthError`, `ApiError`).
 *   - `getSession` / `requireSession` / `getOptionalSession` helpers.
 *   - The genuinely shared base domain types (scope kinds, entry
 *     taxonomy, source channel).
 *
 * Not shipped here:
 *   - Endpoint modules. Each app writes its own (team → `/api/*`, ops →
 *     `/api/provider/*`). Generalising prematurely was rejected in the
 *     ops-console implementation answers (§4).
 *   - Endpoint-specific DTOs. Same reasoning.
 */
export * from "./base-types";
export * from "./client";
export * from "./session";
