/**
 * Shared, stable base domain types used by both the team console and
 * the commercial ops console. Endpoint-specific DTOs do NOT belong
 * here — each app writes its own (team → `/api/*`,
 * ops  → `/api/provider/*`). Per `ops-console-implementation-answers.md` §4.
 */

/**
 * Scope kinds visible above the data layer. `private` is structurally
 * excluded from every shared-or-ops-facing API per ADR-0003 / ADR-0014;
 * the type intentionally cannot represent it, so an unsafe scope cannot
 * type-check.
 */
export type ScopeKind = "global" | "project";

/** Memory-entry taxonomy. Fixed at the data layer; never user-extensible. */
export const ENTRY_TYPE_ORDER = [
  "decision",
  "convention",
  "constraint",
  "open_question",
  "glossary",
  "status",
] as const;

export type EntryType = (typeof ENTRY_TYPE_ORDER)[number];

export const ENTRY_TYPES: Record<EntryType, { label: string; description: string }> = {
  decision: {
    label: "Decision",
    description: "A choice made and the reasoning that fixed it.",
  },
  convention: {
    label: "Convention",
    description: "How the team does a thing — a recurring pattern.",
  },
  constraint: {
    label: "Constraint",
    description: "A hard rule from outside the team (legal, perf, contract).",
  },
  open_question: {
    label: "Open question",
    description: "A known unknown, waiting on data or a stakeholder.",
  },
  glossary: {
    label: "Glossary",
    description: "A term whose meaning the team needs to share.",
  },
  status: {
    label: "Status",
    description: "Current state of a thing — short-lived.",
  },
};

/**
 * `source` channel the entry was written through (server-derived per
 * ADR-0008). UI uses this to render an "agent" badge for `mcp`.
 */
export type EntrySource = "console" | "mcp";
