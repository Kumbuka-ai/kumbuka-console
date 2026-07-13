import type { Locale } from "@/i18n/config";
import type { EntryType } from "@/lib/api/types";

/**
 * The type catalogue — the data behind the `[type-catalog]` block on the
 * memory-types help page.
 *
 * `Record<EntryType, HelpTypeEntry>` is deliberate: a new entry type in
 * the domain without a help entry is a compile error. That is the
 * single-source guarantee — never weaken it to a partial record.
 *
 * A plain module (no `server-only`): the catalogue renderer is a client
 * component and imports this directly.
 */
export type HelpTypeEntry = {
  /** The half sentence in the collapsed row, next to the type chip. */
  meaning: Record<Locale, string>;
  /** A sentence a human says to their assistant. Never a tool call. */
  example: Record<Locale, string>;
  /** The entry that comes out of it: key plus content. */
  result: { key: string; content: Record<Locale, string> };
};

export const HELP_TYPES: Record<EntryType, HelpTypeEntry> = {
  constraint: {
    meaning: {
      de: "Eine harte Grenze. Wird nicht überschritten, auch nicht mit gutem Grund.",
      en: "A hard boundary. It is not crossed, not even for a good reason.",
    },
    example: {
      de: "Merk dir als Constraint: Geldbeträge sind bei uns immer ganzzahlige Minor Units, niemals Fließkomma.",
      en: "Remember this as a constraint: monetary amounts here are always integer minor units, never floating point.",
    },
    result: {
      key: "money.minor-units",
      content: {
        de: "Geldbeträge werden als ganzzahlige Minor Units (Cent) gespeichert und gerechnet. Fließkomma für Geld ist nirgends zulässig: nicht in der Domäne, nicht in der API, nicht in der Datenbank.",
        en: "Monetary amounts are stored and computed as integer minor units (cents). Floating point for money is not acceptable anywhere: not in the domain, not in the API, not in the database.",
      },
    },
  },
  decision: {
    meaning: {
      de: "Eine getroffene Wahl, an die das Team sich gebunden hat, mit dem Grund und der verworfenen Alternative.",
      en: "A choice the team has committed to, with its reason and the alternative that lost.",
    },
    example: {
      de: "Halt fest, dass wir Postgres als System of Record festgelegt haben; Event Sourcing haben wir verworfen, weil niemand im Team es betreiben kann.",
      en: "Record that we settled on Postgres as the system of record; we rejected event sourcing because nobody on the team can operate it.",
    },
    result: {
      key: "decision.system-of-record",
      content: {
        de: "Postgres ist das System of Record. Abgeleitete Speicher (Cache, Suchindex) dürfen nie die einzige Quelle einer Tatsache sein. Verworfen: Event Sourcing, weil das Team keine Betriebserfahrung damit hat.",
        en: "Postgres is the system of record. Derived stores (cache, search index) must never be the only source of a fact. Rejected: event sourcing, because the team has no operational experience with it.",
      },
    },
  },
  convention: {
    meaning: {
      de: "Die geteilte Voreinstellung. Abweichen darf man, aber nicht wortlos.",
      en: "The shared default. You may deviate, but not silently.",
    },
    example: {
      de: "Notier dir: Service-Namen sind bei uns kebab-case.",
      en: "Note this down: our service names are kebab-case.",
    },
    result: {
      key: "naming.services",
      content: {
        de: "Service-Namen sind kebab-case (order-service, nicht OrderService oder order_service). Gilt gleichermaßen für Repository-Namen, Container-Namen und DNS-Labels.",
        en: "Service names are kebab-case (order-service, not OrderService or order_service). The same applies to repository names, container names and DNS labels.",
      },
    },
  },
  glossary: {
    meaning: {
      de: "Ein Begriff, festgelegt, damit alle dasselbe meinen.",
      en: "A term, pinned down so that everyone means the same thing.",
    },
    example: {
      de: 'Merk dir, was wir mit „aktiver Nutzer" meinen: ein Account, der in den letzten 30 Tagen mindestens einmal geschrieben hat. Lesen zählt nicht.',
      en: 'Remember what we mean by "active user": an account that has written at least once in the last 30 days. Reading does not count.',
    },
    result: {
      key: "glossary.active-user",
      content: {
        de: 'Aktiver Nutzer: ein Account, der in den letzten 30 Tagen mindestens einen Schreibvorgang ausgelöst hat. Lesezugriffe zählen nicht. Nicht zu verwechseln mit „angemeldeter Nutzer".',
        en: 'Active user: an account that has triggered at least one write in the last 30 days. Reads do not count. Not to be confused with "signed-in user".',
      },
    },
  },
  open_question: {
    meaning: {
      de: "Ungelöst. Braucht einen Menschen, keine Vermutung. Erscheint bewusst nicht im Standard-Digest.",
      en: "Unresolved. Needs a human, not a guess. Deliberately absent from the default digest.",
    },
    example: {
      de: "Halt als offene Frage fest, dass wir noch nicht wissen, wie Backups pro Mandant getrennt wiederherstellbar werden.",
      en: "Record as an open question that we do not yet know how to make backups restorable per tenant.",
    },
    result: {
      key: "open-question.tenant-backups",
      content: {
        de: "Wie werden Backups pro Mandant getrennt wiederherstellbar? Ein Dump über alle Mandanten macht die Einzelwiederherstellung unmöglich. Kein Eigentümer, keine Frist. Blockiert nichts, bis der erste Mandant eine Wiederherstellung verlangt.",
        en: "How do we make backups restorable per tenant? A dump across all tenants makes a single-tenant restore impossible. No owner, no deadline. Blocks nothing until the first tenant asks for a restore.",
      },
    },
  },
  status: {
    meaning: {
      de: "Der Stand einer Sache in Bewegung. Veraltet schneller als alles andere und muss gepflegt werden.",
      en: "The state of something in motion. It goes stale faster than anything else, and needs tending.",
    },
    example: {
      de: "Merk dir den Stand: Die Umstellung auf die neue Suche läuft, drei von acht Diensten sind umgestellt.",
      en: "Note the current state: the migration to the new search is under way, three of eight services are switched over.",
    },
    result: {
      key: "status.search-migration",
      content: {
        de: "Umstellung auf die neue Suche: drei von acht Diensten umgestellt (Katalog, Konto, Bestellung). Der alte Index läuft parallel weiter. Kein Enddatum.",
        en: "Migration to the new search: three of eight services switched over (catalogue, account, order). The old index still runs in parallel. No end date.",
      },
    },
  },
};

/**
 * Didactic order — descending bindingness: read top to bottom and the
 * semantics land before the definitions. Deliberately different from
 * `ENTRY_TYPE_ORDER` (data order); both stay, and a test pins that they
 * carry the same set.
 */
export const TYPE_TEACHING_ORDER: EntryType[] = [
  "constraint",
  "decision",
  "convention",
  "glossary",
  "open_question",
  "status",
];
