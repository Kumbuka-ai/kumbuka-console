import type { Locale } from "@/i18n/config";

/**
 * Agent notices — the third agent state besides "has verified cells" and
 * "invisible". A notice is a VERIFIED refusal: we measured that the
 * combination does not work today and we know why. It is structurally
 * separate from a cell: a notice agent carries no cells, no apparatus
 * tabs and can never show a guide; a cell agent can never turn into a
 * notice (the manifest tests hold both directions).
 *
 * The wording is deliberate, per line: precise about us (our endpoint
 * answers correctly — a checkable statement), generous towards the
 * vendor (a factual state, not a verdict), no "we are working on it"
 * (the defect is not in our code; we promise only what we can hold:
 * watching and switching it on), no vagueness.
 */
export type AgentNotice = Record<
  Locale,
  {
    intro: string;
    paras: { lead: string; body: string }[];
    footer: string;
  }
>;

export const MISTRAL_NOTICE: AgentNotice = {
  de: {
    intro:
      "Mistral ist derzeit nicht als Client unterstützt. Wir wollen es — und wir liefern es nach, sobald es geht.",
    paras: [
      {
        lead: "Woran es liegt.",
        body: "kumbukas MCP-Endpunkt antwortet Mistrals Client korrekt: die Authentifizierung läuft durch, der Server liefert seine Werkzeugliste aus, und die Werkzeuge erscheinen kurzzeitig sogar in Mistrals Oberfläche. Der Konnektor wird auf Mistral-Seite trotzdem nicht endgültig aktiviert — der letzte Schritt schließt nicht ab.",
      },
      {
        lead: "Warum wir das niemandem ankreiden.",
        body: "Die Konnektor-Aktivierung über MCP und OAuth ist ein junges, in Bewegung befindliches Feld: die Spezifikation entwickelt sich, und alle Beteiligten — Client-Hersteller wie Server-Betreiber — bewegen sich auf einem Untergrund, der noch nicht ausgehärtet ist. Es ist kein Fehler im klassischen Sinn, sondern eine Stelle, an der zwei korrekt gebaute Systeme noch nicht zusammenfinden.",
      },
      {
        lead: "Wie es weitergeht.",
        body: "Wir beobachten Mistrals Client und prüfen ihn regelmäßig nach. Sobald der Verbindungsvorgang vollständig durchläuft, schalten wir die Unterstützung frei — ohne dass du etwas ändern musst. Unsere Erwartung: im Lauf der Beta.",
      },
    ],
    footer: "Bis dahin: Claude, ChatGPT und Grok sind vollständig unterstützt.",
  },
  en: {
    intro:
      "Mistral is not supported as a client yet. We want it — and we will add it as soon as we can.",
    paras: [
      {
        lead: "What the issue is.",
        body: "kumbuka’s MCP endpoint answers Mistral’s client correctly: authentication passes, the server hands over its tool list, and the tools even appear briefly in Mistral’s interface. On Mistral’s side the connector still isn’t activated for good — the final step doesn’t complete.",
      },
      {
        lead: "Why we don’t hold it against anyone.",
        body: "Connector activation over MCP and OAuth is a young, still-moving field: the specification keeps evolving, and everyone involved — client makers and server operators alike — is working on ground that hasn’t set yet. It isn’t a bug in the classic sense, but a point where two correctly built systems don’t meet yet.",
      },
      {
        lead: "How it goes from here.",
        body: "We keep an eye on Mistral’s client and re-test it regularly. The moment the connection flow runs all the way through, we switch support on — without you having to change a thing. Our expectation: over the course of the beta.",
      },
    ],
    footer: "Until then: Claude, ChatGPT and Grok are fully supported.",
  },
};
