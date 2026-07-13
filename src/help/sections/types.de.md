---
updated: 2026-07-13
---

# Speicherarten

Jeder Eintrag in kumbuka trägt genau eine Speicherart. Sie ist keine Schublade zum
Sortieren, sondern eine Aussage darüber, **wie verbindlich** der Eintrag ist. Dein
Assistent liest sie genau so.

Es gibt sechs Arten, und es werden keine mehr. Eine Taxonomie, die wächst, hört auf, eine
zu sein.

## Die sechs Arten {#catalog}

Die Reihenfolge unten ist nicht alphabetisch, sondern nach abnehmender Verbindlichkeit.
Wer sie von oben nach unten liest, hat die Semantik verstanden, bevor er die Definitionen
gelesen hat: ganz oben steht die harte Wand, ganz unten das, was sich nächste Woche
geändert hat.

[type-catalog]

## Welche Art nehme ich? {#choosing}

Drei Fragen, in dieser Reihenfolge:

- **Darf man das übertreten?** Nein, nie: `constraint`. Ja, aber nur mit gutem Grund:
  `convention`.
- **Wurde das entschieden, oder ist es einfach so gewachsen?** Entschieden: `decision`.
  Gewachsen: `convention`.
- **Ist die Sache offen oder in Bewegung?** Offen und ungelöst: `open_question`. In
  Bewegung, aber auf Kurs: `status`.

Im Zweifel ist `convention` die ehrlichste Wahl. Sie behauptet nichts, was du nicht
belegen kannst.

## Was die Art bewirkt {#effect}

Die Speicherart ist kein Etikett für Menschen. Sie steuert, was dein Assistent mit dem
Eintrag anfängt:

- Der Digest, den dein Assistent zu Sessionbeginn lädt, ist **nach Art gruppiert**. Ein
  `constraint` steht dort neben anderen Constraints, nicht verstreut zwischen Notizen.
- **Offene Fragen erscheinen bewusst nicht im Standard-Digest.** Sonst würde der Kontext
  deines Assistenten von Unerledigtem dominiert. Willst du sie sehen, frag ausdrücklich
  danach.
- Ein `status` wird gelesen wie eine Momentaufnahme, ein `constraint` wie eine Regel. Wenn
  du einen wandelbaren Sachstand als `constraint` ablegst, wird dein Assistent ihn
  verteidigen, lange nachdem er falsch geworden ist.

## Zwei ehrliche Hinweise {#honesty}

**Eine Entscheidung, die nicht mitschreibt, was sie umstößt und warum, ist ein Etikett,
kein Wissen.** „Wir nehmen Postgres" ist eine Notiz. „Postgres ist das System of Record;
die Event-Sourcing-Variante ist verworfen, weil niemand im Team sie betreiben kann" ist
eine Entscheidung. Nur die zweite Fassung hält jemanden davon ab, dieselbe Frage in sechs
Monaten erneut aufzumachen.

**Ein veralteter `status` ist die einzige Speicherart, die aktiv schadet.** Die anderen
fünf altern schlecht und werden dann irrelevant. Ein falscher Sachstand wird von deinem
Assistenten geglaubt und weitergereicht. Wer `status` benutzt, übernimmt eine
Pflegepflicht.

> Kuratiertes Gedächtnis hat eine Schwäche, und wir benennen sie: es veraltet. Der
> Unterschied zu automatisch mitgeschriebenem Kontext ist, dass du es **siehst** und
> reparieren kannst. Ein Eintrag, der falsch geworden ist, steht sichtbar in deiner
> Console. Ein automatisch abgeleiteter Kontext, der falsch geworden ist, steht nirgends.
