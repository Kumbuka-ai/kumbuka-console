/**
 * Mock seed — content lifted from design/prototype/data.jsx so the console
 * has something realistic to render while the backend is wiring up. Author
 * subjects map to fake user ids; `agent` is rendered as source="mcp" per
 * ADR-0008.
 */
import type {
  ConnectorView,
  EntryView,
  ScopeView,
  SettingsView,
  UserView,
} from "../api/types";

const NOW = new Date("2026-06-05T11:00:00Z").getTime();
const ago = (days: number, hours = 0) =>
  new Date(NOW - (days * 24 + hours) * 3_600_000).toISOString();

let _id = 100;
const eid = () => `e-${++_id}`;

type Seed = ScopeView & { entries: EntryView[] };

export const USERS: UserView[] = [
  { id: "u-jba", subject: "kc-jba", email: "johannes@kumbuka.ai", displayName: "Johannes Bayer-Albert", role: "admin", status: "active", lastSeenAt: ago(0, 0.05), self: true },
  { id: "u-priya", subject: "kc-priya", email: "priya@kumbuka.ai", displayName: "Priya Raman", role: "admin", status: "active", lastSeenAt: ago(0, 1) },
  { id: "u-marek", subject: "kc-marek", email: "marek@kumbuka.ai", displayName: "Marek Kowalski", role: "member", status: "active", lastSeenAt: ago(0, 3) },
  { id: "u-lena", subject: "kc-lena", email: "lena@kumbuka.ai", displayName: "Lena Vogt", role: "member", status: "active", lastSeenAt: ago(1) },
  { id: "u-tobi", subject: "kc-tobi", email: "tobias@kumbuka.ai", displayName: "Tobias Frank", role: "member", status: "active", lastSeenAt: ago(2) },
  { id: "u-sara", subject: "kc-sara", email: "sara@kumbuka.ai", displayName: "Sara Nilsson", role: "member", status: "invited", lastSeenAt: null },
  { id: "u-old", subject: "kc-david", email: "david@kumbuka.ai", displayName: "David Mertens", role: "member", status: "disabled", lastSeenAt: ago(21) },
];

const e = (
  type: EntryView["type"],
  key: string | null,
  content: string,
  author: string,
  days: number,
  hours = 0,
): EntryView => ({
  id: eid(),
  type,
  key,
  content,
  reference: null,
  authorSubject: author === "agent" ? "kc-agent" : `kc-${author.replace(/^u-/, "")}`,
  source: author === "agent" ? "mcp" : "console",
  createdAt: ago(days + 30, hours),
  updatedAt: ago(days, hours),
});

export const SCOPES: Seed[] = [
  {
    slug: "global",
    name: "Organization-wide memory",
    kind: "global",
    fixed: true,
    archived: false,
    description: "Applies to every project. The shared baseline the assistant reads first.",
    entryCount: 0,
    createdAt: ago(180),
    entries: [
      e("constraint", "pii.residency", "Customer PII stays in eu-central-1. No cross-region replication, including backups and analytics exports.", "u-jba", 4),
      e("convention", "api.errors", "All HTTP errors return RFC 7807 problem+json with a stable `type` URI. Never return a bare 500 body.", "u-priya", 6),
      e("decision", "db.system-of-record", "Postgres is the system of record. Analytics reads from the logical replica, never the primary.", "u-marek", 9),
      e("convention", "naming.services", "Service names are kebab-case nouns: `billing-platform`, not `BillingSvc`. The repo name matches the service name exactly.", "u-lena", 11),
      e("constraint", "auth.no-shared-creds", "No shared service accounts between environments. Each env gets its own credentials, rotated every 90 days.", "u-jba", 14),
      e("glossary", "term.tenant", "A \"tenant\" is a billing account, not an individual user. One tenant can have many users; usage is metered per tenant.", "agent", 2, 4),
      e("decision", "infra.iac", "Terraform is the only sanctioned IaC. ClickOps changes are reverted on the next apply without warning.", "u-marek", 18),
      e("status", "compliance.soc2", "SOC 2 Type II audit window opened 2026-05-01. Evidence collection runs until 2026-08-01; freeze on access-control changes.", "u-jba", 1),
      e("open_question", "auth.session-length", "Should admin sessions expire at 8h or 24h? Blocked on the security review scheduled for next sprint.", "u-priya", 3),
      e("convention", "commits.format", "Conventional Commits, present tense. The scope in the message matches the service name in `naming.services`.", "u-lena", 21),
      e("glossary", "term.canary", "A \"canary\" is a 10% traffic slice on the new version, watched for one error-budget window before promotion.", "agent", 5, 2),
      e("constraint", "data.retention", "Raw request logs are deleted after 30 days. Aggregates may be kept indefinitely; they must contain no PII.", "u-jba", 7),
    ],
  },
  {
    slug: "atlas-web",
    name: "Atlas Web Platform",
    kind: "project",
    fixed: false,
    archived: false,
    description: "Customer-facing web app and its BFF layer.",
    entryCount: 0,
    createdAt: ago(120),
    entries: [
      e("decision", "render.strategy", "Atlas is server-rendered with streaming. No client-side routing for primary navigation — it broke crawlers twice.", "u-lena", 2),
      e("convention", "state.no-global", "No global client store. Server data stays on the server; the client holds only ephemeral UI state.", "u-priya", 4),
      e("constraint", "bundle.budget", "First-load JS budget is 180KB gzipped. CI fails the build if a PR pushes it over.", "u-marek", 6),
      e("status", "release.2.4", "v2.4 has been in canary at 10% since 2026-06-02. Full rollout is gated on the error budget holding through the weekend.", "agent", 0, 6),
      e("open_question", "i18n.rtl", "Do we commit to RTL for the Q4 MENA launch? Affects the layout primitives — needs a decision before the design-system freeze.", "u-lena", 8),
      e("glossary", "term.bff", "The \"BFF\" is the per-client backend that shapes API responses for Atlas. It owns no data; it only composes.", "u-priya", 12),
      e("convention", "a11y.baseline", "Every interactive element ships keyboard-operable with a visible focus ring. No merge without it.", "u-tobi", 15),
      e("decision", "forms.validation", "Validation rules live server-side and are mirrored to the client at build time. The server is always authoritative.", "u-marek", 19),
    ],
  },
  {
    slug: "billing-platform",
    name: "Billing Platform",
    kind: "project",
    fixed: false,
    archived: false,
    description: "Metering, invoicing, and the payments integration.",
    entryCount: 0,
    createdAt: ago(95),
    syncError: true,
    entries: [
      e("constraint", "money.integers", "Money is stored as integer minor units with an ISO-4217 currency code. Never floats. Ever.", "u-jba", 3),
      e("decision", "payments.provider", "Stripe is the primary processor; Adyen is the failover for EU card schemes. The abstraction must not leak provider concepts.", "u-marek", 7),
      e("convention", "idempotency", "Every write to the payments API carries an idempotency key derived from the invoice ID and attempt number.", "u-priya", 9),
      e("constraint", "invoices.immutable", "Issued invoices are immutable. Corrections are credit notes, never edits to the original document.", "u-jba", 12),
      e("status", "migration.ledger", "The double-entry ledger migration is at 60%. Legacy single-entry rows are read-only until cutover on 2026-06-20.", "agent", 1, 3),
      e("open_question", "tax.marketplace", "Who is merchant of record for marketplace transactions — us or the seller? Tax counsel review pending.", "u-priya", 5),
      e("glossary", "term.dunning", "Dunning is the retry schedule for failed charges: 1d, 3d, 7d, then downgrade. Defined once, applied everywhere.", "u-marek", 16),
    ],
  },
  {
    slug: "data-pipeline",
    name: "Data Pipeline",
    kind: "project",
    fixed: false,
    archived: false,
    description: "Ingestion, the warehouse, and downstream models.",
    entryCount: 0,
    createdAt: ago(85),
    entries: [
      e("decision", "warehouse", "BigQuery is the warehouse. Transformations are dbt models; raw tables are never queried directly by consumers.", "u-sara", 4),
      e("convention", "pii.tagging", "Every column carries a sensitivity tag at creation. Untagged columns are quarantined by the linter.", "u-sara", 7),
      e("constraint", "freshness.sla", "Core marts must be no more than 2 hours stale. A breach pages the on-call data engineer.", "u-tobi", 10),
      e("status", "backfill.events", "The 2024 events backfill is reprocessing after the schema fix. ETA 2026-06-08; downstream marts are flagged stale until then.", "agent", 0, 9),
      e("glossary", "term.mart", "A \"mart\" is a consumer-facing, documented dbt model with an owner and tests. Anything else is intermediate.", "u-sara", 14),
      e("open_question", "streaming", "Is the move to streaming ingestion worth the operational cost this year, or do hourly batches stay good enough?", "u-tobi", 11),
    ],
  },
  {
    slug: "mobile-app",
    name: "Mobile App",
    kind: "project",
    fixed: false,
    archived: false,
    description: "iOS and Android clients.",
    entryCount: 0,
    createdAt: ago(60),
    entries: [
      e("decision", "arch.shared-core", "Business logic lives in a shared Kotlin Multiplatform core. UI is native per platform — no shared UI layer.", "u-tobi", 6),
      e("constraint", "offline.first", "Every read path works offline against the local store. The network is an enhancement, never a requirement.", "u-tobi", 13),
      e("convention", "feature-flags", "Every shippable change sits behind a flag defaulted off. Release and rollout are separate events.", "u-marek", 17),
      e("status", "review.ios-3.1", "iOS 3.1 is in App Store review since 2026-06-03. Android equivalent is staged at 20% on Play.", "agent", 1, 1),
    ],
  },
  {
    slug: "design-system",
    name: "Design System",
    kind: "project",
    fixed: false,
    archived: false,
    description: "Just created. No entries yet.",
    entryCount: 0,
    createdAt: ago(2),
    empty: true,
    entries: [],
  },
  {
    slug: "legacy-monolith",
    name: "Legacy Monolith",
    kind: "project",
    fixed: false,
    archived: true,
    description: "Archived 2026-04-30. Read-only.",
    entryCount: 0,
    createdAt: ago(420),
    entries: [
      e("status", "decommission", "Decommissioned 2026-04-30. Kept read-only for audit. Do not write; do not depend on it.", "u-jba", 36),
      e("decision", "strangler", "Retired via the strangler pattern. Routes were peeled off to Atlas and Billing over 14 months.", "u-marek", 40),
    ],
  },
];

// Backfill entryCount from the entries arrays for free.
for (const s of SCOPES) s.entryCount = s.entries.length;

export const SETTINGS: SettingsView = {
  writePolicy: "ask",
  effectiveWritePolicy: "ask",
  defaultScopeSlug: null,
  defaultScopeStatus: "ok",
  createScopes: "admins",
};

export const CONNECTOR: ConnectorView = {
  endpoint: "https://memory.kumbuka.ai/mcp",
  mcpUrl: "https://memory.kumbuka.ai/mcp",
  clientId: "kai_team_8f3c21a0",
  clientSecretMasked: "sk_live_9d2f••••••••••••••••a71b",
  idpName: "Keycloak",
};
