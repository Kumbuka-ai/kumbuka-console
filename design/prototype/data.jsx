/* ============================================================
   kumbuka.ai · seed data + taxonomy
   Exposed on window for the other babel scripts.
   ============================================================ */

const ENTRY_TYPES = {
  decision:      { label: 'Decision',      desc: 'A settled choice the team has committed to.' },
  convention:    { label: 'Convention',    desc: 'A shared way of doing things; the default.' },
  constraint:    { label: 'Constraint',    desc: 'A hard boundary that must not be crossed.' },
  open_question: { label: 'Open Question', desc: 'Unresolved; needs an owner and an answer.' },
  glossary:      { label: 'Glossary',      desc: 'A term defined so everyone means the same thing.' },
  status:        { label: 'Status',        desc: 'The current state of something in motion.' },
};
const TYPE_ORDER = ['decision','convention','constraint','open_question','glossary','status'];

// people on the team — also the author pool
const PEOPLE = {
  'u-jba':   { name: 'Johannes Bayer-Albert', email: 'johannes@kumbuka.ai', initials: 'JB' },
  'u-priya': { name: 'Priya Raman',           email: 'priya@kumbuka.ai',    initials: 'PR' },
  'u-marek': { name: 'Marek Kowalski',        email: 'marek@kumbuka.ai',    initials: 'MK' },
  'u-lena':  { name: 'Lena Vogt',             email: 'lena@kumbuka.ai',     initials: 'LV' },
  'u-tobi':  { name: 'Tobias Frank',          email: 'tobias@kumbuka.ai',   initials: 'TF' },
  'u-sara':  { name: 'Sara Nilsson',          email: 'sara@kumbuka.ai',     initials: 'SN' },
  'agent':   { name: 'Kumbuka Agent',        email: 'assistant',            initials: '::', agent: true },
};

let _id = 100;
const nid = (p) => `${p}-${++_id}`;

function E(type, key, content, author, days, h) {
  return { id: nid('e'), type, key, content, author, updated: daysAgo(days, h) };
}
function daysAgo(d, h = 0) {
  const t = new Date('2026-06-05T11:00:00');
  t.setDate(t.getDate() - d);
  t.setHours(t.getHours() - h);
  return t.toISOString();
}

const SCOPES = [
  {
    id: 'global', name: 'Organization-wide memory', kind: 'global', fixed: true,
    desc: 'Applies to every project. The shared baseline the assistant reads first.',
    entries: [
      E('constraint', 'pii.residency', 'Customer PII stays in eu-central-1. No cross-region replication, including backups and analytics exports.', 'u-jba', 4),
      E('convention', 'api.errors', 'All HTTP errors return RFC 7807 problem+json with a stable `type` URI. Never return a bare 500 body.', 'u-priya', 6),
      E('decision', 'db.system-of-record', 'Postgres is the system of record. Analytics reads from the logical replica, never the primary.', 'u-marek', 9),
      E('convention', 'naming.services', 'Service names are kebab-case nouns: `billing-platform`, not `BillingSvc`. The repo name matches the service name exactly.', 'u-lena', 11),
      E('constraint', 'auth.no-shared-creds', 'No shared service accounts between environments. Each env gets its own credentials, rotated every 90 days.', 'u-jba', 14),
      E('glossary', 'term.tenant', 'A "tenant" is a billing account, not an individual user. One tenant can have many users; usage is metered per tenant.', 'agent', 2, 4),
      E('decision', 'infra.iac', 'Terraform is the only sanctioned IaC. ClickOps changes are reverted on the next apply without warning.', 'u-marek', 18),
      E('status', 'compliance.soc2', 'SOC 2 Type II audit window opened 2026-05-01. Evidence collection runs until 2026-08-01; freeze on access-control changes.', 'u-jba', 1),
      E('open_question', 'auth.session-length', 'Should admin sessions expire at 8h or 24h? Blocked on the security review scheduled for next sprint.', 'u-priya', 3),
      E('convention', 'commits.format', 'Conventional Commits, present tense. The scope in the message matches the service name in `naming.services`.', 'u-lena', 21),
      E('glossary', 'term.canary', 'A "canary" is a 10% traffic slice on the new version, watched for one error-budget window before promotion.', 'agent', 5, 2),
      E('constraint', 'data.retention', 'Raw request logs are deleted after 30 days. Aggregates may be kept indefinitely; they must contain no PII.', 'u-jba', 7),
    ],
  },
  {
    id: 'atlas-web', name: 'Atlas Web Platform', kind: 'project',
    desc: 'Customer-facing web app and its BFF layer.',
    entries: [
      E('decision', 'render.strategy', 'Atlas is server-rendered with streaming. No client-side routing for primary navigation — it broke crawlers twice.', 'u-lena', 2),
      E('convention', 'state.no-global', 'No global client store. Server data stays on the server; the client holds only ephemeral UI state.', 'u-priya', 4),
      E('constraint', 'bundle.budget', 'First-load JS budget is 180KB gzipped. CI fails the build if a PR pushes it over.', 'u-marek', 6),
      E('status', 'release.2.4', 'v2.4 has been in canary at 10% since 2026-06-02. Full rollout is gated on the error budget holding through the weekend.', 'agent', 0, 6),
      E('open_question', 'i18n.rtl', 'Do we commit to RTL for the Q4 MENA launch? Affects the layout primitives — needs a decision before the design-system freeze.', 'u-lena', 8),
      E('glossary', 'term.bff', 'The "BFF" is the per-client backend that shapes API responses for Atlas. It owns no data; it only composes.', 'u-priya', 12),
      E('convention', 'a11y.baseline', 'Every interactive element ships keyboard-operable with a visible focus ring. No merge without it.', 'u-tobi', 15),
      E('decision', 'forms.validation', 'Validation rules live server-side and are mirrored to the client at build time. The server is always authoritative.', 'u-marek', 19),
    ],
  },
  {
    id: 'billing-platform', name: 'Billing Platform', kind: 'project', syncError: true,
    desc: 'Metering, invoicing, and the payments integration.',
    entries: [
      E('constraint', 'money.integers', 'Money is stored as integer minor units with an ISO-4217 currency code. Never floats. Ever.', 'u-jba', 3),
      E('decision', 'payments.provider', 'Stripe is the primary processor; Adyen is the failover for EU card schemes. The abstraction must not leak provider concepts.', 'u-marek', 7),
      E('convention', 'idempotency', 'Every write to the payments API carries an idempotency key derived from the invoice ID and attempt number.', 'u-priya', 9),
      E('constraint', 'invoices.immutable', 'Issued invoices are immutable. Corrections are credit notes, never edits to the original document.', 'u-jba', 12),
      E('status', 'migration.ledger', 'The double-entry ledger migration is at 60%. Legacy single-entry rows are read-only until cutover on 2026-06-20.', 'agent', 1, 3),
      E('open_question', 'tax.marketplace', 'Who is merchant of record for marketplace transactions — us or the seller? Tax counsel review pending.', 'u-priya', 5),
      E('glossary', 'term.dunning', 'Dunning is the retry schedule for failed charges: 1d, 3d, 7d, then downgrade. Defined once, applied everywhere.', 'u-marek', 16),
    ],
  },
  {
    id: 'data-pipeline', name: 'Data Pipeline', kind: 'project',
    desc: 'Ingestion, the warehouse, and downstream models.',
    entries: [
      E('decision', 'warehouse', 'BigQuery is the warehouse. Transformations are dbt models; raw tables are never queried directly by consumers.', 'u-sara', 4),
      E('convention', 'pii.tagging', 'Every column carries a sensitivity tag at creation. Untagged columns are quarantined by the linter.', 'u-sara', 7),
      E('constraint', 'freshness.sla', 'Core marts must be no more than 2 hours stale. A breach pages the on-call data engineer.', 'u-tobi', 10),
      E('status', 'backfill.events', 'The 2024 events backfill is reprocessing after the schema fix. ETA 2026-06-08; downstream marts are flagged stale until then.', 'agent', 0, 9),
      E('glossary', 'term.mart', 'A "mart" is a consumer-facing, documented dbt model with an owner and tests. Anything else is intermediate.', 'u-sara', 14),
      E('open_question', 'streaming', 'Is the move to streaming ingestion worth the operational cost this year, or do hourly batches stay good enough?', 'u-tobi', 11),
    ],
  },
  {
    id: 'mobile-app', name: 'Mobile App', kind: 'project',
    desc: 'iOS and Android clients.',
    entries: [
      E('decision', 'arch.shared-core', 'Business logic lives in a shared Kotlin Multiplatform core. UI is native per platform — no shared UI layer.', 'u-tobi', 6),
      E('constraint', 'offline.first', 'Every read path works offline against the local store. The network is an enhancement, never a requirement.', 'u-tobi', 13),
      E('convention', 'feature-flags', 'Every shippable change sits behind a flag defaulted off. Release and rollout are separate events.', 'u-marek', 17),
      E('status', 'review.ios-3.1', 'iOS 3.1 is in App Store review since 2026-06-03. Android equivalent is staged at 20% on Play.', 'agent', 1, 1),
    ],
  },
  {
    id: 'design-system', name: 'Design System', kind: 'project', empty: true,
    desc: 'Just created. No entries yet.',
    entries: [],
  },
  {
    id: 'legacy-monolith', name: 'Legacy Monolith', kind: 'project', archived: true,
    desc: 'Archived 2026-04-30. Read-only.',
    entries: [
      E('status', 'decommission', 'Decommissioned 2026-04-30. Kept read-only for audit. Do not write; do not depend on it.', 'u-jba', 36),
      E('decision', 'strangler', 'Retired via the strangler pattern. Routes were peeled off to Atlas and Billing over 14 months.', 'u-marek', 40),
    ],
  },
];

const USERS = [
  { id: 'u-jba',   name: 'Johannes Bayer-Albert', email: 'johannes@kumbuka.ai', initials: 'JB', role: 'admin',  status: 'active',   last: '2 min ago',  self: true },
  { id: 'u-priya', name: 'Priya Raman',           email: 'priya@kumbuka.ai',    initials: 'PR', role: 'admin',  status: 'active',   last: '1 h ago' },
  { id: 'u-marek', name: 'Marek Kowalski',        email: 'marek@kumbuka.ai',    initials: 'MK', role: 'member', status: 'active',   last: '3 h ago' },
  { id: 'u-lena',  name: 'Lena Vogt',             email: 'lena@kumbuka.ai',     initials: 'LV', role: 'member', status: 'active',   last: 'yesterday' },
  { id: 'u-tobi',  name: 'Tobias Frank',          email: 'tobias@kumbuka.ai',   initials: 'TF', role: 'member', status: 'active',   last: '2 days ago' },
  { id: 'u-sara',  name: 'Sara Nilsson',          email: 'sara@kumbuka.ai',     initials: 'SN', role: 'member', status: 'invited',  last: 'never' },
  { id: 'u-old',   name: 'David Mertens',         email: 'david@kumbuka.ai',    initials: 'DM', role: 'member', status: 'disabled', last: '3 weeks ago' },
];

const IDP_NAME = 'Keycloak';
const CONNECTOR_URL = 'https://memory.kumbuka.ai/mcp';
const CLIENT_ID = 'kai_team_8f3c21a0';
const CLIENT_SECRET = 'sk_live_9d2f••••••••••••••••a71b';

Object.assign(window, { ENTRY_TYPES, TYPE_ORDER, PEOPLE, SCOPES, USERS, IDP_NAME, CONNECTOR_URL, CLIENT_ID, CLIENT_SECRET });
