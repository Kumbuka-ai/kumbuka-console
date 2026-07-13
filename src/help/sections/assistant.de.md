---
updated: 2026-07-13
---

# Arbeiten mit dem Assistenten

Die Verbindung herzustellen ist der kleinere Teil. Der größere ist, deinem Assistenten
beizubringen, dass er sie auch benutzen soll.

## Dein Assistent muss wissen, dass es kumbuka gibt {#instructions}

Ein Assistent, dem kumbuka als Werkzeug angeboten wird, benutzt es **nicht von allein**. Er
sieht ein Werkzeug in einer Liste. Er muss angewiesen werden, zu Sessionbeginn
nachzuschlagen und nach Entscheidungen etwas vorzuschlagen.

Dafür gibt es den fertigen Anweisungsblock im Bereich [Verbinden](/overview). Einmal in die
Projektanweisungen deines Assistenten kopiert, und der Rest läuft von selbst.

> Das ist die mit Abstand häufigste Ursache dafür, dass kumbuka scheinbar nicht
> funktioniert: Die Verbindung steht, die Werkzeuge sind da, und der Assistent sieht nie
> nach. Er weiß nicht, dass er soll.

## Vorschlagen und bestätigen {#ask}

In der Voreinstellung schreibt dein Assistent nicht einfach los. Er **schlägt vor**, du
**bestätigst**.

Das ist keine Bremse, das ist der Kern. Ein Gedächtnis, in das ungefragt geschrieben wird,
ist nach zwei Wochen eine Halde, der niemand mehr traut. Der Moment der Bestätigung ist der
Moment, in dem aus einer Beobachtung geteiltes Wissen wird.

Wohin geschrieben wird, wenn niemand einen Scope nennt, legt ihr in den
[Einstellungen](/settings) fest: nachfragen, ein fester Projekt-Scope oder global. Dein
privates Gedächtnis steht dir davon unabhängig immer offen.

## Keys: die Adresse eines Eintrags {#keys}

Ein **Key** ist die Adresse, unter der dein Assistent einen Eintrag direkt nachschlägt,
statt zu suchen.

Format: Kleinbuchstaben, Ziffern, getrennt durch Punkt oder Bindestrich. Keine
Unterstriche, keine Großbuchstaben, keine Schrägstriche.

Brauchbare Keys: `db.system-of-record`, `naming.services`, `status.search-migration`.

Der Key ist freiwillig. Aber ein Eintrag ohne Key ist einer, den man nur findet, wenn man
ihn sucht. Und wer sucht, muss schon wissen, dass es ihn gibt.

Wird mit demselben Key erneut geschrieben, **ersetzt** das den Eintrag. Es entsteht kein
Duplikat.

## Was ein guter Eintrag ist {#good-entries}

Ein guter Eintrag steht allein. Man versteht ihn ohne das Gespräch, aus dem er stammt, und
ohne die Person, die ihn geschrieben hat.

- Brauchbar: „Service-Namen sind kebab-case. Gilt für Repositories, Container und
  DNS-Labels gleichermaßen."
- Unbrauchbar: „Wie besprochen machen wir es so." — Wer? Was? Wann?

Was nicht hineingehört:

- **Gesprächsverläufe und Zusammenfassungen.** kumbuka ist kein Protokoll.
- **Vermutungen.** Dafür gibt es `open_question`.
- **Zugangsdaten, Tokens, personenbezogene Daten Dritter.** Nie.
- **Alles, was ohnehin im Code steht.** Der Code ist die Wahrheit über den Code. Ein
  Eintrag, der ihn abschreibt, wird still falsch.

## Ändern und Entfernen {#revising}

In der Console: Eintrag öffnen, bearbeiten, speichern. Fertig.

Über den Assistenten: Ein erneutes Schreiben mit demselben Key ersetzt den bisherigen
Inhalt. Zum Entfernen sagst du es ihm ausdrücklich, dann räumt er den Eintrag ab.

## Grenzen {#limits}

Zwei, die du kennen solltest, bevor du gegen sie läufst:

- **Ein Eintrag fasst höchstens 1.500 Zeichen.** Das ist Absicht, keine Sparmaßnahme: Was
  länger ist, ist ein Dokument und keine Regel, und ein Assistent, der Dokumente in seinen
  Kontext lädt, hat kein Gedächtnis, sondern ein Platzproblem.
- **Die Freitextsuche deines Assistenten sucht heute im Wortlaut.** Sie findet, was
  dasteht, nicht, was gemeint war. Wer sich auf Keys und die Speicherarten stützt, findet
  verlässlicher als wer nach Stichworten fischt.
