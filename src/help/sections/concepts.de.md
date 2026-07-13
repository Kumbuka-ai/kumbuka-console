---
updated: 2026-07-13
---

# Konzepte

kumbuka beobachtet eure Gespräche nicht. Es liest nicht mit, wertet nicht aus und rät
nicht, was wichtig gewesen sein könnte. Was hier steht, hat ein Mensch hineingeschrieben
oder bestätigt.

Das ist der ganze Unterschied, und alles Weitere folgt daraus.

## Eintrag und Speicherart {#entries}

Ein **Eintrag** ist eine Aussage: eine Regel, eine Entscheidung, eine Definition, ein
Sachstand. Kein Gesprächsprotokoll, kein Dokument, keine Kopie eurer Quelltexte. Die leben
weiter, wo sie hingehören.

Jeder Eintrag trägt eine **Speicherart**, die sagt, wie verbindlich er ist, und optional
einen **Key**, über den dein Assistent ihn direkt nachschlägt.

Die sechs Arten und wann man welche nimmt: [Speicherarten](/help/types).

## Scopes: wo Wissen liegt {#scopes}

Ein Scope ist kein Ordner. Er ist eine **Zugriffsart**:

- **global** — genau einer je Team. Die Basis, die dein Assistent zuerst liest. Was hier
  steht, gilt überall.
- **project** — geteilte Räume, die ihr selbst anlegt, etwa einer je Produkt oder
  Repository. Mitglieder lesen und schreiben, Administratoren verwalten.
- **private** — dein persönliches Arbeitsgedächtnis. Nur du.

Es gibt keine Verschachtelung, keine Vererbung, keine Baumstruktur. Drei Zugriffsarten,
flach. Das ist Absicht: eine Hierarchie, in der niemand mehr weiß, wo etwas hingehört, ist
schlimmer als gar keine.

## Wer geschrieben hat {#authorship}

Die Autorenschaft leitet der Server aus dem **Schreibkanal** ab, niemals aus einer Angabe
des Clients.

Schreibst du in der Console, steht dein Name am Eintrag. Schreibt dein Assistent, wird der
Eintrag als über den Assistenten entstanden markiert, und der Mensch hinter der Session
wird trotzdem festgehalten.

Ein Assistent kann sich nicht als jemand anderes ausgeben. Es gibt kein Feld, in das er
einen Autor schreiben könnte.

## Dein privates Gedächtnis {#private}

Deine privaten Einträge sind ausschließlich für dich erreichbar, und nur über deine eigene
angemeldete Assistenten-Session.

Kein Administrator, keine Console-Ansicht und keine team-seitige Schnittstelle kann sie
lesen. Das ist keine Einstellung, die jemand umlegen könnte: **die Codepfade der
Team-Oberflächen haben keinen Weg zu privaten Zeilen.** Sie fragen nicht danach und filtern
sie auch nicht heraus. Sie können sie nicht erreichen.

Wird dein Zugang deaktiviert, bleibt dein privates Gedächtnis unangetastet und deins.

## Was kumbuka nicht behauptet {#limits}

Zwei Versprechen geben wir bewusst nicht, weil wir sie nicht halten könnten:

**Wir behaupten nicht, dass Daten technisch für niemanden je einsehbar wären.** Wer eine
Datenbank betreibt, hat Zugriff auf eine Datenbank. Das ist bei jeder Software so, und wir
tun nicht so, als wäre es hier anders. Was wir garantieren, ist enger und dafür
überprüfbar: es gibt keinen Weg von einer Team- oder Administrations-Oberfläche zu privaten
Einträgen. kumbuka ist quelloffen. Du musst uns das nicht glauben, du kannst es nachlesen.

**Wir behaupten nicht, dass dein Assistent tut, was in einem `constraint` steht.** kumbuka
legt die Regel vor, vollständig und in jeder Session gleich. Ob ein Sprachmodell sie
befolgt, entscheidet das Modell. Was wir garantieren, ist die zuverlässige Zustellung, nicht
der Gehorsam.
