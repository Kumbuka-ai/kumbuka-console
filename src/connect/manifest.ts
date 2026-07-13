/**
 * Connect manifest — the data source of the connect area (the guide that
 * shows where exactly to enter which value, per AI system and surface).
 *
 * It carries three things:
 *  - the agent list (AI systems, with display name and mark),
 *  - the apparatus list (the surface an agent runs on),
 *  - the cells that exist, as a LIST of (agent, apparatus) tuples — never
 *    the cartesian product. The matrix is a view on this list: the
 *    apparatus switcher shows only surfaces that have a visible cell for
 *    the picked agent.
 *
 * The status machine is structural, not cosmetic:
 *
 *  - `verified`       — the flow was clicked through end to end; visible.
 *  - `untested`       — presumed to exist, never measured; INVISIBLE.
 *  - `not-applicable` — the combination does not exist at the vendor;
 *                       INVISIBLE.
 *
 * Only `verified` renders. The guide is a promise: it must be impossible
 * for it to show instructions nobody has walked through. There is no
 * preview flag and no override — a cell becomes visible by someone
 * verifying it (and writing its guide + screenshots in the same pass).
 * `untested` and `not-applicable` look identical to the user; the
 * difference lives here: one is a task, the other a refusal.
 *
 * Raising a cell to `verified` = write the two guide documents
 * (src/connect/cells/<doc>.de.md + .en.md, clear the `authoring:` marker),
 * drop the screenshots (public/connect/<doc>/step-<n>.png), and flip the
 * one status line below. The manifest tests hold the coupling: a cell
 * cannot be `verified` while its guide still carries the authoring marker.
 */

export const CONNECT_AGENTS = [
  { slug: "claude", name: "Claude", vendor: "Anthropic" },
  { slug: "chatgpt", name: "ChatGPT", vendor: "OpenAI" },
  { slug: "grok", name: "Grok", vendor: "xAI" },
] as const;

export type ConnectAgent = (typeof CONNECT_AGENTS)[number];
export type ConnectAgentSlug = ConnectAgent["slug"];

/** The surface an agent runs on. Icon names come from `@/components/ui/Icon`. */
export const CONNECT_APPARATUS = {
  web: { icon: "globe" },
  desktop: { icon: "monitor" },
  code: { icon: "fileText" },
} as const;

export type ConnectApparatus = keyof typeof CONNECT_APPARATUS;

export const CONNECT_APPARATUS_ORDER: readonly ConnectApparatus[] = ["web", "desktop", "code"];

export type CellStatus = "verified" | "untested" | "not-applicable";

export type ConnectCell = {
  agent: ConnectAgentSlug;
  apparatus: ConnectApparatus;
  status: CellStatus;
  /**
   * Guide document basename: src/connect/cells/<doc>.de.md + <doc>.en.md.
   * Only meaningful (and only required to parse cleanly) once the cell is
   * `verified`; a `not-applicable` cell carries no documents.
   */
  doc?: string;
  /** Screenshot folder under public/: /connect/<shots>/step-<n>.png */
  shots?: string;
};

export const CONNECT_CELLS: readonly ConnectCell[] = [
  { agent: "claude", apparatus: "web", status: "verified", doc: "claude-web", shots: "claude-web" },
  { agent: "claude", apparatus: "desktop", status: "untested" },
  { agent: "claude", apparatus: "code", status: "untested" },
  { agent: "chatgpt", apparatus: "web", status: "verified", doc: "chatgpt-web", shots: "chatgpt-web" },
  { agent: "chatgpt", apparatus: "desktop", status: "untested" },
  { agent: "chatgpt", apparatus: "code", status: "untested" },
  { agent: "grok", apparatus: "web", status: "verified", doc: "grok-web", shots: "grok-web" },
  { agent: "grok", apparatus: "desktop", status: "not-applicable" },
  { agent: "grok", apparatus: "code", status: "not-applicable" },
];

/** The one visibility rule: only `verified` renders. */
export function visibleCells(cells: readonly ConnectCell[] = CONNECT_CELLS): ConnectCell[] {
  return cells.filter((c) => c.status === "verified");
}

/** Apparatus tabs for one agent — only surfaces with a visible cell, in order. */
export function apparatusFor(
  agent: ConnectAgentSlug,
  cells: readonly ConnectCell[] = CONNECT_CELLS,
): ConnectApparatus[] {
  const visible = visibleCells(cells);
  return CONNECT_APPARATUS_ORDER.filter((ap) =>
    visible.some((c) => c.agent === agent && c.apparatus === ap),
  );
}

/** Agents that have at least one visible cell — the picker's tile list. */
export function agentsWithVisibleCells(
  cells: readonly ConnectCell[] = CONNECT_CELLS,
): ConnectAgent[] {
  return CONNECT_AGENTS.filter((a) => apparatusFor(a.slug, cells).length > 0);
}
