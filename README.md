# `@kumbuka-ai/console`

![License](https://img.shields.io/badge/license-AGPL_v3-FF5B1F?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-2D4059?style=flat-square&logo=nextdotjs&logoColor=F4F1EA)
![React](https://img.shields.io/badge/React-2D4059?style=flat-square&logo=react&logoColor=F4F1EA)
![TypeScript](https://img.shields.io/badge/TypeScript-2D4059?style=flat-square&logo=typescript&logoColor=F4F1EA)
![Tailwind](https://img.shields.io/badge/Tailwind-2D4059?style=flat-square&logo=tailwindcss&logoColor=F4F1EA)
![Docker](https://img.shields.io/badge/Docker-2D4059?style=flat-square&logo=docker&logoColor=F4F1EA)
![CI](https://img.shields.io/github/actions/workflow/status/kumbuka-ai/kumbuka-console/ci.yml?style=flat-square&label=CI&color=FF5B1F)

Admin console for **kumbuka.ai** — Next.js 15 (App Router) + React Server
Components + Tailwind, served behind Caddy as the only browser-facing
service the team uses to manage shared memory.

The console is a pure **BFF client**: it never speaks OAuth, never holds
tokens, never touches Keycloak. The Quarkus backend
([`kumbuka-server`](https://github.com/kumbuka-ai/kumbuka-server))
handles authentication, issues an HttpOnly session cookie, and exposes
`/api/*` for everything the UI reads or writes. To run end-to-end
locally, clone the server repo and add this directory as a service in
its compose override — there is a commented-out `kumbuka-console` block
in `kumbuka-server/docker-compose.yml` ready to be uncommented.

---

## What's here

- **Five screens**, 1:1 with the design prototype in `design/prototype/`:
  - `/overview` — stat strip, the connect area (agent setup guides behind a verified-cells manifest, the canonical assistant-instruction block, usage examples), recent shared activity, scopes-at-a-glance, member summary, private guarantee band.
  - `/scopes/[slug]` — the scope browser: left pane (global · projects · the persistent private-guarantee panel · archived), right pane (entries table / cards, type filters, search, sortable columns, side-panel editor, confirm modal).
  - `/team` — IdP banner, member table, role badges, status badges, invite dialog, role / enable / disable actions.
  - `/settings` — write-scope policy (`ask | project | global`), who-may-create-scopes (`admins | members`), private-memory locked block. (The connector is set up by its endpoint URL alone — the client registers itself at first authorization; the URL lives in the connect area on `/overview`, and there is no client id and no secret.)
  - `/account` — D2 hybrid: display-name edit + link-outs to the Keycloak account console for password / MFA / passkey / sessions, plus the private-guarantee panel and sign-out.
- **The private invariant is preserved in all five surfaces** from the prototype: scope browser panel, dashboard band, settings locked block, account panel, team/invite copy. There is no code path that fetches `private` rows; the TypeScript `ScopeKind` excludes `"private"` entirely.
- **No `localStorage`.** Theme lives in a cookie and is rendered SSR. UI state (search, type filters, layout, density, role filter) lives in URL search params so server-render + tab refresh stay consistent.

---

## Architecture

```
src/
  app/
    layout.tsx               <html data-theme>, font preloads, <ToastHost>
    page.tsx                 redirect → /overview
    signin/page.tsx          public; triggers /api/auth/login on click
    (app)/
      layout.tsx             requireSession() (redirects to /signin on 401)
      actions.ts             server actions (mutate via backend + revalidatePath)
      overview/page.tsx
      scopes/page.tsx        redirect → /scopes/global
      scopes/[slug]/page.tsx scope browser
      team/page.tsx
      settings/page.tsx
      account/page.tsx
    api/health/route.ts      docker healthcheck
  components/
    shell/                   Rail, Topbar, ThemeToggle
    scopes/                  ScopesPane, PrivatePanel, EntriesView (table+cards)
    overview/                CopyValue, GuaranteeBand
    team/                    TeamTable, RoleBadge, UserStatus, InviteDialog
    settings/                SettingsForm
    account/                 AccountForm
    editors/                 SidePanel, EntryEditor, ScopeEditor, ConfirmModal
    ui/                      Icon, Avatar, Button, Chip (TypeChip), Seg, State, Toast, Menu
  lib/
    api/
      client.ts              serverFetch (cookie-forwarding, 401 = ApiAuthError)
      session.ts             requireSession, getOptionalSession
      types.ts               1:1 mirror of ai.kumbuka.admin.dto.AdminDtos
      impl-live.ts           thin wrappers over serverFetch
      index.ts               picks live vs mock based on KUMBUKA_API_MOCK
    mock/
      seed.ts                seed data ported from design/prototype/data.jsx
      impl-mock.ts           in-process mutable mock backend
    theme.ts                 cookie-backed light/dark
    time.ts                  relTime / absTime
  styles/
    console-tokens.css       copy of design/prototype/console.css (visual source of truth)
```

---

## Auth flow (see [ADR-0009](../docs/adr/0009-bff-auth-flow.md))

1. Browser hits a Server Component (e.g. `/overview`).
2. The component calls `requireSession()`, which fetches `GET /api/auth/me` on the server, forwarding the browser's cookies.
3. On 401, the backend returns JSON `{ loginUrl: "/api/auth/login?…" }` (because the request carries `X-Requested-With: kumbuka-console` and `Accept: application/json`). The console redirects to `/signin?return_to=<original path>`.
4. `/signin` renders a `Sign in with Keycloak` anchor whose `href` is the `loginUrl`. The user clicks → top-level navigation → Quarkus initiates the OIDC authorization-code flow → callback at `/api/auth/callback` → HttpOnly session cookie set → redirect to `return_to`.

The console never reads or writes tokens; the only credential it sees is the session cookie, which is forwarded to the backend on every server-side fetch.

---

## Running

### Local dev (against a live backend)

```bash
cp .env.example .env.local
# point KUMBUKA_BACKEND_URL at your local backend (default: http://localhost:8080)
pnpm install
pnpm dev
# → http://localhost:3000
```

If the backend isn't reachable, the console will get redirected to `/signin` on the first SSR fetch — that's expected.

### Local dev (mock backend, no Quarkus needed)

```bash
cp .env.example .env.local
echo "KUMBUKA_API_MOCK=1" >> .env.local
pnpm dev
```

The in-process mock seeds the same content as the design prototype and lets you exercise the UI end-to-end without standing the backend up.

### Docker compose (the real topology)

```bash
docker compose --profile app up --build
# → https://${KUMBUKA_DOMAIN} (Caddy routes / to the console, /api to the backend)
```

The compose service is `kumbuka-console`. It binds only to the internal Docker network — Caddy is the sole public entry point.

---

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `KUMBUKA_BACKEND_URL` | `http://kumbuka-backend:8080` | Server-side base URL for the backend BFF. |
| `KUMBUKA_API_MOCK` | `0` | Set to `1` to use the in-process mock instead of HTTP. |
| `KUMBUKA_BUILD_VERSION` | *(unset)* | Version of the deployable actually running. Unset in a standalone install — the footer shows this package's own version alone. A downstream composition build sets it to its own release version; the footer then names that build, with this package's version shown as its core. |
| `NEXT_PUBLIC_APP_NAME` | `kumbuka.ai` | Page title prefix. |
| `NODE_ENV` | `production` (in Docker) | Standard Next.js mode flag. |

---

## Consuming the console as a package

This app is also published as **`@kumbuka-ai/console`** to GitHub Packages on
every release tag — as **TypeScript/TSX source**, not a compiled library (App
Router pages with RSC / `"use client"` boundaries cannot be pre-compiled; the
consumer transpiles).

That means you can build your own console **on top of this one** instead of
forking it: keep every screen this repo ships, re-export the routes you serve,
and hang your own things into named mount points — **slots** for components,
`getNavExtensions` for navigation, and a **route manifest** that keeps the two
builds from drifting apart in silence.

Every slot carries a required fallback, so a slot with nothing bound renders a
complete surface rather than an empty box. This repo is a finished application,
not a chassis with holes in it.

The consumer contract is five one-liners (`transpilePackages`, the `@/*` alias in
webpack *and* tsconfig, Tailwind's `@source`, the `public/` copy, the
re-exports) — all of them, plus the reference consumer that CI builds on every
run, are in **[`docs/extension-points.md`](docs/extension-points.md)**.

---

## Discipline

- Component classes come from `src/styles/console-tokens.css`, a 1:1 copy of `design/prototype/console.css`. **Don't restyle existing components in Tailwind** — extend tokens.css if a real new surface is needed.
- Mutations always go through Server Actions in `src/app/(app)/actions.ts`. The actions call `lib/api`, then `revalidatePath` the affected routes so the next render sees the new state.
- The backend is the only source of truth for the private invariant. Reflect it in the UI in all five places; never add a code path that can show private rows.
- AGPL-3.0. The reusable packages `@kumbuka-ai/ui` and `@kumbuka-ai/api-client` stay Apache-2.0 (see each package's `LICENSE`). Contributions are accepted under the project's CLA/DCO.
