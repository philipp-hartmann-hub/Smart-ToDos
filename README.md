# Smartes Projektplanungstool

Ein leichtgewichtiges Planungstool als **eine einzige HTML-Datei**.  
Du kannst Projekte anlegen, Aufgaben strukturieren und je nach Bedarf zwischen Listen-, Gantt- und (späterer) Kanban-Sicht wechseln.

## Was die App kann

- **Projekte verwalten**: Name, optionale Beschreibung und optionales Projektbild.
- **Protokolle auf Startseite**: Datierte Einträge anlegen, anzeigen und löschen.
- **Aufgaben strukturieren**: Hauptaufgaben und beliebig tiefe Unteraufgaben.
- **Aufgaben planen**: Priorität, Beginn, Frist, Beschreibung, Zuständigkeiten und Abhängigkeiten.
- **Mehrere Ansichten nutzen**:
  - `Aufgabenliste` für Detailpflege
  - `Projektplan (Gantt)` mit Zeitbalken, Monatsachse, Abhängigkeitslinien und Popup-Karte
  - `Kanban` mit konfigurierbaren Spalten, Swimlanes und Drag-and-Drop
- **Daten lokal speichern**: Alles bleibt im Browser via `localStorage` erhalten.

## Schnellstart

Keine Installation nötig: **kein Node.js, kein npm, kein Build-Schritt**.

1. Datei `SmartToDo.html` im Projektordner öffnen (Doppelklick im Finder).
2. Oder direkt per Browser-URL:

[`file:///Users/philipphartmann/Cursor%20Trainig/Smart%20ToDo/SmartToDo.html`](file:///Users/philipphartmann/Cursor%20Trainig/Smart%20ToDo/SmartToDo.html)

Wenn du das Repo an einem anderen Ort speicherst, passe den Pfad entsprechend an.

## Typischer Ablauf

1. **Projekt anlegen**
2. **Teilnehmende hinzufügen** (für spätere Zuständigkeiten)
3. **Hauptaufgaben erstellen**
4. **Unteraufgaben ergänzen**
5. **Abhängigkeiten setzen** (was zuerst erledigt sein muss)
6. **Im Gantt prüfen**, ob Zeitplan und Reihenfolge passen

## Protokolle (pro Projekt)

- Eigener Bereich **„Protokolle“** innerhalb der geöffneten Projektansicht (nicht global auf der Startseite)
- **Projektgebunden**: jedes Projekt hat seinen eigenen separaten Protokollbereich
- Bereiche als **Obergruppen** (z. B. `JF`, `Kundentermin`) auswählbar oder direkt neu anlegbar
- Pro Bereich können **Sitzungen** mit Datum angelegt werden (aufklappbar)
- In jeder Sitzung pro Zeile: Verantwortlicher, Bereich, Erläuterung, Aufgabe (inkl. Popup-Öffnen), Ergebnis
- Zusätzliche Sitzungszeilen per `+ Zeile`; Änderungen werden direkt in `localStorage` gespeichert

## Aufgabenansichten im Überblick

### 1) Aufgabenliste
- Kompakte Standardansicht: Titel, Zuständigkeit und Frist
- Weitere Felder per „Details anzeigen“ aufklappbar
- Abschließen archiviert Aufgaben; aktive Liste zeigt nur nicht archivierte Karten
- Archivbereich mit Öffnen, Wiederherstellen und Endgültig löschen
- Kanban-Spaltenstatus in der Standardansicht als Label sichtbar; Umstellung im aufgeklappten Detailbereich
- Gut für schnellen Überblick und fokussierte Bearbeitung

### 2) Projektplan (Gantt)
- Zeitbalken aus Beginn/Frist
- Auf-/zuklappbare Hierarchie
- Abhängigkeiten als Verbindungslinien
- Durchgehende Monatsleiste zur Orientierung
- Umschaltbare Zeitskala: **Tag / Monat / Jahr**
- Tagesansicht mit zwei Ebenen: oben durchgehende Monatsleiste, darunter Tagesnummern
- Fixierte Aufgaben-Spalte links (sticky), damit Aufgaben beim horizontalen Scrollen sichtbar bleiben
- Popup-„Aufgabenkarte“ direkt im Gantt bearbeitbar (ohne Ansichtswechsel)
- Kanban-Spaltenstatus in der Gantt-Zeile als Label sichtbar
- Kanban-Spaltenstatus im Gantt-Popup direkt als Auswahlfeld änderbar

### 3) Kanban
- Standard-Spalten: **Backlog**, **In Bearbeitung**, **Warten auf Rückmeldung**, **Abgeschlossen**
- Spalten frei umbenennbar; neue Spalten können hinzugefügt werden
- Backlog ist fix und nicht löschbar
- Swimlanes beliebig anlegbar, umbenennbar und (bei mehr als einer) löschbar
- Karten per Drag-and-Drop zwischen Spalten/Swimlanes verschiebbar
- Neue Aufgaben aus Liste/Gantt landen automatisch im Backlog
- Neue Karten direkt in jeder Spalte/Swimlane anlegbar (`+ Karte`)
- Unteraufgaben direkt an jeder Kanban-Karte anlegbar (`+ Unteraufgabe`)
- Karten direkt aus Kanban abschließbar (wandern ins Archiv)
- Aufgabenkarte als Popup direkt aus Kanban öffnbar (`Karte öffnen`) wie im Gantt
- Pro Kanban-Zelle sind ca. 5 Karten sichtbar; danach scrollt die Zelle vertikal

## Technische Hinweise

- Speicherort: `localStorage`, Schlüssel `smart-todo-tasks`
- Datenmodell: Version `v:2` mit `projects[]`
- Ältere reine Aufgabenlisten werden in ein Projekt „Mein Projekt“ migriert
- Alle Ansichten arbeiten auf derselben Datenquelle (Änderungen sind sofort konsistent sichtbar)

## Repository

[github.com/philipp-hartmann-hub/Smart-ToDos](https://github.com/philipp-hartmann-hub/Smart-ToDos)

```bash
git clone https://github.com/philipp-hartmann-hub/Smart-ToDos.git
cd Smart-ToDos
# Dann SmartToDo.html im Browser öffnen.
```

---

## Changelog / Aktualisierungsprotokoll

| Datum | Kurzbeschreibung |
|-------|------------------|
| 2026-04-05 | Initiale README und Cursor-Regel zur README-Pflege angelegt; Repository noch ohne App-Code. |
| 2026-04-05 | Vite + React + TS: ToDo mit Prioritäten, localStorage, Build/Lint grün; README und Git-Anleitung. |
| 2026-04-05 | README: offizielles GitHub-Repo [Smart-ToDos](https://github.com/philipp-hartmann-hub/Smart-ToDos) verlinkt; Merge mit GitHub-`main`. |
| 2026-04-05 | Vite `base: './'`; README: Hinweis `dist/index.html` / file:// für lokales Öffnen. |
| 2026-04-05 | Root-`index.html`: Hinweistext bei direktem Öffnen; README: Root-`index.html` nicht per file:// nutzen. |
| 2026-04-05 | **Umstellung:** eine Datei `SmartToDo.html` (Vanilla JS), kein Build/Node; Vite/React-Stack entfernt. |
| 2026-04-05 | Rekursive Unteraufgaben (beliebige Tiefe) in `SmartToDo.html`; Migration alter Listen. |
| 2026-04-05 | Unteraufgaben: Priorität wählbar (wie Hauptaufgaben). |
| 2026-04-05 | Fristen: Kalenderfeld für alle Ebenen; Sortierung nach Priorität → Frist → Erstellung. |
| 2026-04-05 | Beschreibungstext pro Aufgabe/Unteraufgabe, fortlaufend editierbar. |
| 2026-04-05 | Produktname: **Smartes Projektplanungstool** (UI, Titel, README); Einstiegsdatei weiter `SmartToDo.html`. |
| 2026-04-05 | Übergeordnete **Projekte** (Beschreibung, Bild), Aufgaben pro Projekt; Migration alter Listen. |
| 2026-04-05 | **Teilnehmende** pro Projekt (Name, Funktion); **Zuständige** pro Aufgabe/Unteraufgabe (mehrfach). |
| 2026-04-06 | Aufgabenansichten erweitert: Umschalter für Aufgabenliste, Projektplan (Gantt mit Hierarchie + Abhängigkeitslinien) und Kanban-Dummy; Anlegen von Aufgaben auch in der Projektplan-Ansicht. |
| 2026-04-06 | Ansichts-Synchronität geschärft: View-Wechsel triggert zentrales Re-Rendern, damit Listen-, Gantt- und Kanban-Panel denselben Aufgabenstand zeigen. |
| 2026-04-06 | Gantt verbessert: größere, übersichtlichere Darstellung; pro Gantt-Zeile „Karte öffnen“ mit Sprung und Highlight zur Aufgabenkarte in der Listenansicht. |
| 2026-04-06 | Gantt erweitert: noch breitere Timeline, durchgehende Monatsachse und bearbeitbare Aufgabenkarte als Popup direkt in der Gantt-Ansicht (ohne Wechsel zur Liste). |
| 2026-04-06 | README redaktionell überarbeitet: klarerer Einstieg, strukturierte Funktionsbeschreibung, praxisnaher Ablauf und verständlichere technische Hinweise. |
| 2026-04-06 | Layout angepasst: Aufgabenbereich (`view-tasks`) deutlich verbreitert, damit Gantt auf großen Displays merklich mehr nutzbare Breite erhält. |
| 2026-04-06 | Projektplan verbessert: linke Aufgabenliste im Gantt als sticky Spalte fixiert, damit die Aufgaben beim Scrollen entlang der Zeitachse sichtbar bleiben. |
| 2026-04-06 | Gantt-Fix: auf separate linke Aufgaben-Spalte + rechte Scroll-Timeline umgestellt, damit Aufgabenliste beim horizontalen Scrollen dauerhaft sichtbar bleibt und Balken/Linien nicht mehr unter der Liste durchlaufen. |
| 2026-04-06 | Aufgabenliste auf kompakte Erstansicht umgestellt (Titel, Zuständig, Frist); zusätzliche Felder und Aktionen sind pro Aufgabe per Details-Toggle aufklappbar. |
| 2026-04-06 | Projektplan erweitert: Zeitskala im Gantt auf Tag-, Monats- oder Jahresbasis umschaltbar. |
| 2026-04-06 | Kanban vollständig umgesetzt: konfigurierbare Spalten (Backlog fix), frei benennbare Swimlanes, Drag-and-Drop, Aufgaben aus anderen Ansichten starten im Backlog. |
| 2026-04-06 | Gantt-Tagesansicht verbessert: zweizeilige Kopfzeile mit durchgehender Monatsleiste plus separaten Tagesnummern für bessere Lesbarkeit. |
| 2026-04-06 | Kanban-Erstellung ergänzt: neue Karten pro Spalte/Swimlane sowie Unteraufgaben direkt aus jeder Kanban-Karte anlegbar; Änderungen bleiben mit Liste und Gantt synchron. |
| 2026-04-06 | Abschließen/Archiv ergänzt: abgeschlossene Karten werden archiviert (aus aktiver Liste entfernt), im Archiv verwaltbar; Kanban-Spaltenlabel zusätzlich in Liste und Gantt sichtbar. |
| 2026-04-06 | Kanban-Popup ergänzt: Aufgabenkarten lassen sich wie im Gantt als editierbares Modal direkt aus Kanban öffnen. |
| 2026-04-06 | Abschluss-UI deutlicher gemacht: sichtbarer „Abschließen“-Button direkt in der kompakten Aufgabenlisten-Kopfzeile; Kanban-Button klarer als „Abschließen (Archiv)“ benannt. |
| 2026-04-06 | Kanban-Status aus Liste/Gantt steuerbar: Spaltenlabel als Dropdown umgestellt; Auswahl verschiebt die Karte sofort in die gewählte Kanban-Spalte. |
| 2026-04-06 | Archiv erweitert: archivierte Aufgaben können nun direkt geöffnet (Popup), zusätzlich zu Wiederherstellen und Endgültig löschen. |
| 2026-04-06 | Kanban-Layout verbessert: Zellen auf ca. 5 sichtbare Karten begrenzt, weitere Karten per vertikalem Scrollen innerhalb der Zelle erreichbar. |
| 2026-04-06 | Kanban-Auswahl in den Detailbereich verlagert: in Aufgabenliste nur noch bei aufgeklappten Details, im Gantt nur im Popup (nicht in der Standardzeile). |
| 2026-04-06 | Standardansichten bereinigt: Kanban-Status vollständig aus Standardzeilen entfernt; Umstellung ausschließlich in Detailbereich bzw. Gantt-Popup. |
| 2026-04-06 | Startseite erweitert: neuer Bereich „Protokolle“ mit datierten Einträgen (anlegen, anzeigen, löschen), persistent in localStorage gespeichert. |
| 2026-04-06 | Protokolle erweitert: Bereiche als Obergruppen eingeführt (auswählen/neu anlegen), Einträge werden gruppiert nach Bereich dargestellt. |
| 2026-04-06 | Protokolle pro Projekt umgestellt: Bereiche enthalten Sitzungen mit aufklappbarer Tabelle (Verantwortlicher, Bereich, Erläuterung, Aufgabe mit Popup, Ergebnis). |
| 2026-04-06 | Protokoll-UI in Projektansicht verlagert: kein übergreifender Startseiten-Bereich mehr, Anzeige/Bearbeitung nur im jeweils geöffneten Projekt. |
