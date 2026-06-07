# `@kumbuka-ai/api-client`

The thin BFF framework consumed by the team console and the commercial ops console — plus the genuinely shared base domain types.

## Surface

- `serverFetch<T>(path, init?)` — forwards cookies from the incoming request, treats 401 as `ApiAuthError`, surfaces other non-2xx as `ApiError`.
- `requireSession(fetchSession, signinPath?)` / `getOptionalSession(fetchSession)` — generic Server-Component gates; the consumer provides its own `fetchSession()` because the session DTO is app-specific.
- Base types: `ScopeKind`, `EntryType` / `ENTRY_TYPES` / `ENTRY_TYPE_ORDER`, `EntrySource`.

## Out of scope

- **Endpoint modules.** Each app writes its own — team consumes `/api/*`, ops consumes `/api/provider/*`. Generalising prematurely was rejected (`ops-console-implementation-answers.md` §4).
- **Endpoint-specific DTOs.** Same reasoning.

## Use

```ts
import "server-only";
import { serverFetch, ApiAuthError, ApiError } from "@kumbuka-ai/api-client";
import { requireSession, getOptionalSession } from "@kumbuka-ai/api-client/session";
import { ENTRY_TYPES, type EntryType } from "@kumbuka-ai/api-client/base-types";

const me = await requireSession(() =>
  serverFetch<MyAppSession>("/api/auth/me"),
);
```

## License

Apache-2.0. Same CLA/DCO posture as `@kumbuka-ai/ui`.
