# Extension points

The console is a complete application on its own. It is *also* published as a
package, so you can build your own console **on top of it** instead of forking
it: keep every screen this repo ships, and hang your own things into named
mount points.

That is what this document is about — what the mount points are, and what your
build has to do to consume them.

---

## The shape of it

`@kumbuka-ai/console` is published to GitHub Packages on every release tag, as
**TypeScript/TSX source** rather than a compiled bundle. That is not laziness:
App Router pages carry React Server Component and `"use client"` boundaries that
cannot survive being pre-compiled into a library. Your build transpiles the
package; Next.js supports exactly this.

Your app is therefore thin. It re-exports the routes it wants to serve, binds
whatever it wants to add, and builds. Everything else lives in the package and
keeps working.

---

## The consumer contract

Five things, all of them one-liners, none of them optional.

**1. Transpile the package.**

```js
// next.config.mjs
const nextConfig = {
  transpilePackages: ["@kumbuka-ai/console"],
};
```

**2. Map the package's internal `@/*` alias at its own `src`.**

The package's source imports itself through `@/…`. Your build has to resolve
that at the *package's* `src`, not yours — in webpack **and** in TypeScript:

```js
// next.config.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const consoleSrc = path.join(here, "node_modules/@kumbuka-ai/console/src");

const nextConfig = {
  transpilePackages: ["@kumbuka-ai/console"],
  webpack: (config) => {
    config.resolve.alias["@"] = consoleSrc;
    return config;
  },
};
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./node_modules/@kumbuka-ai/console/src/*"],
      // Wildcard subpath exports need a paths mirror as well — see the note below.
      "@kumbuka-ai/console/app/*": ["./node_modules/@kumbuka-ai/console/src/app/*"],
      "@kumbuka-ai/console/i18n/*": ["./node_modules/@kumbuka-ai/console/src/i18n/*"]
    }
  }
}
```

> **Why the second half of that `paths` block.** `tsc` does not do extension
> probing on *wildcard* `exports` targets (`"./app/*" → "./src/app/*"`), so
> `@kumbuka-ai/console/app/(app)/overview/page` type-checks as "module not
> found" even though webpack resolves it happily. A `paths` mirror does probe.
> Exact-file exports (`…/slots`, `…/routes`, `…/middleware`) need no mirror.
> This bites at type-check time, not at build time — which is exactly why it is
> worth knowing before it happens to you.

**3. Point Tailwind at the package source, and take its assets.**

Tailwind v4 does not scan `node_modules`, so the package's classes are invisible
to it unless you say so:

```css
/* globals.css */
@import "tailwindcss";
@source "../../node_modules/@kumbuka-ai/console/src";
@import "@kumbuka-ai/console/styles/console-tokens.css";
```

Copy the package's `public/` into your own `public/` at build time — Next serves
static assets only from the app root.

**4. Re-export what you serve.**

```tsx
// src/app/(app)/overview/page.tsx
export { default } from "@kumbuka-ai/console/app/(app)/overview/page";
```

```ts
// src/middleware.ts
export { middleware, config } from "@kumbuka-ai/console/middleware";
```

…and the same for the next-intl request config.

**5. Check your work against a build that already does all of this.**

`e2e/package-consumption-smoke.sh` packs the package, scaffolds a minimal
consumer exactly as described above, and builds it. It runs on every CI run in
this repo, so it cannot rot. When something in your own build does not resolve,
diff against that script before you debug — it is the reference consumer, kept
honest by CI.

---

## Slots

A slot is a named mount point. Your build binds a component to a slot id; the
console renders it there.

```ts
import type { SlotRegistry } from "@kumbuka-ai/console/slots/types";
import { MySupportForm } from "./MySupportForm";

export const slots: SlotRegistry = {
  "footer.support": MySupportForm,
};
```

You bind by rebinding **one specifier**: `@kumbuka-ai/console/slots`. Alias it
at your own registry module in your webpack config, and the console picks your
registry up wherever it reaches for one. Nothing else in the package is patched,
and there is no plugin loader, no runtime registration, no lifecycle to learn.

Two properties are worth stating plainly, because they are what makes this a
seam and not a set of holes:

- **Every slot has a working default.** `<Slot>` takes a required `fallback`;
  the type will not let you write one without it. A slot with nothing bound
  renders a complete surface, not an empty box and not a placeholder. That is
  why this repo is a finished application rather than a chassis.
- **Overrides take no props.** A slot is a mount point, not a data channel. If
  your component needs data, it fetches it.

Slot ids are declared in `@kumbuka-ai/console/slots/types` and grow only when a
feature ships one. Today there is one:

| Slot id | Where | Default |
|---|---|---|
| `footer.support` | Layout footer, beside the version chips | Nothing — the footer shows the version chips alone. A downstream build may mount its own support entry here. |

---

## Nav contributions

If your build adds routes, they need to be reachable. `getNavExtensions(area)`
returns items appended to a navigation area — the same module you already
rebound for slots exports it. Two areas exist: `rail` (the primary
navigation) and `help` (the help area's sub-navigation under
`/help/[section]`). Labels carry one text per supported locale — the record
type makes a missing translation a compile error instead of a silent
fallback:

```ts
import type { NavArea, NavExtension } from "@kumbuka-ai/console/slots/types";

export function getNavExtensions(area: NavArea): NavExtension[] {
  return area === "rail"
    ? [{ id: "reports", href: "/reports", label: { de: "Berichte", en: "Reports" }, icon: "grid" }]
    : [];
}
```

A help contribution is the same shape with `area === "help"`; its `href`
points at a route your build serves itself (a static route wins over the
package's dynamic `/help/[section]` segment). The help area also renders
sections from its own data-driven manifest (`src/help/manifest.ts`);
contributed items are appended after those. The manifest sections and
their document format are described in [help-content.md](./help-content.md).

Contribute nothing and nothing is rendered — no gap, no placeholder. Icons come
from the console's own icon vocabulary; an unknown name falls back rather than
crashing.

---

## The route manifest

`@kumbuka-ai/console/routes` exports every route this app serves, as data.

It exists because of one specific, quiet failure: a route gets added here, your
build does not re-export it, **and both builds stay green** — your console has
silently lost a page, and nothing told you.

So the manifest is guarded from both ends. A test in this repo walks `src/app`
and asserts the manifest matches the filesystem exactly, in both directions — a
new or removed route that is not reflected in the manifest fails CI *here*,
where the change was made. Your build asserts the other half: that it re-exports
every entry the manifest lists. Neither side can drift alone.

```ts
import { routesManifest } from "@kumbuka-ai/console/routes";
// assert your app has a file for every entry
```

---

## Version pinning

The package is published at the release tag's version, alongside the container
image. Pin it, and treat a bump the way you would treat any other dependency
bump — the route manifest will tell you if a route appeared or vanished, which
is most of what you need to know.
