# `@kumbuka-ai/ui`

The kumbuka design-system, shared by the team console and the commercial ops console.

- **Primitives** — `Icon`, `Avatar`, `Button` / `IconButton`, `Chip` / `TypeChip`, `Seg` / `SegButton`, `EmptyState` / `ErrorState`, `Toast` / `ToastHost`, `Menu` / `useMenu`.
- **Shell** — parametrisable `Rail`, `Topbar`, `ThemeToggle`. The rail accepts a `railColor` override + `textOpacity`; the topbar takes a `contextPin` slot. The team console fills these with its defaults; the ops console swaps `railColor=var(--navy)` + a pinned active-tenant indicator (per `ops-console-design-handoff.md` §1).
- **Modals** — `SidePanel`, `ConfirmModal`. `ConfirmModal` carries the typed-confirm + acks + context-restate variant for the ops-console friction ladder (handoff §5).
- **Markers** — `NoContentMarker`. The recurring trust-surface that makes the "structurally cannot read memory content" guarantee visible. Used as the team console's `PrivatePanel` and at four sites in the ops console (handoff §4).
- **Tokens** — `@kumbuka-ai/ui/tokens` exports `console-tokens.css` (paper / ink / navy / accent, the entry-type swatches, spacing, light + dark variable sets).

## Fonts

The library does **not** ship webfonts. Consumers load `Inter`, `Space Grotesk`, and `JetBrains Mono` themselves — either via Google Fonts (`<link>` in the layout) or self-hosted woff2 files, whatever fits the deployment's CSP and offline policy. The tokens reference the families by name.

## Use

```ts
import "@kumbuka-ai/ui/tokens";
import { Rail, Topbar, ThemeToggle } from "@kumbuka-ai/ui/shell";
import { Button, IconButton, Icon } from "@kumbuka-ai/ui/primitives";
import { ConfirmModal, type Ack } from "@kumbuka-ai/ui/modals";
import { NoContentMarker } from "@kumbuka-ai/ui/markers";
```

## License

Apache-2.0. **Contributions from outside the copyright holder require a signed CLA/DCO (D-LIC-3)** before merge — otherwise contributed AGPL code there would taint the ability to keep downstream consumers (e.g. the proprietary ops-console) on their own license terms.
