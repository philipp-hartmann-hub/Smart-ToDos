# Der Projektmanager

Ein Mehrbenutzer-Planungstool als **deployte Web-Anwendung** (Next.js + Neon + Vercel).  
Du kannst Projekte anlegen, Aufgaben strukturieren und je nach Bedarf zwischen Listen-, Gantt-, Kanban- und Protokoll-Ansicht wechseln.

## Was die App kann

- **Projekte verwalten**: Name, optionale Beschreibung und optionales Projektbild; bestehende Projekte können umbenannt, aktualisiert oder gelöscht werden.
- **Benutzerverwaltung**: Admin-Login, Benutzer anlegen (mit Auto-Benutzername/Passwort) und Projektzugriffe je Profil verwalten.
- **Einklappbare Formulare**: Projektanlage, Teilnehmenden-/Benutzerverwaltung und Unteraufgaben-Formulare starten kompakt und werden per Button geöffnet.
- **Aufgaben strukturieren**: Hauptaufgaben und beliebig tiefe Unteraufgaben.
- **Aufgaben planen**: Priorität, Beginn, Frist, Beschreibung, Zuständigkeiten und Abhängigkeiten.
- **Mehrere Ansichten nutzen**:
  - `Aufgabenliste` für Detailpflege
  - `Projektplan (Gantt)` mit Zeitbalken, Monatsachse, Abhängigkeitslinien und Popup-Karte
  - `Kanban` mit konfigurierbaren Spalten, Swimlanes und Drag-and-Drop
- **Protokolle** pro Projekt: Bereiche → Sitzungen → Zeilen inkl. Aufgaben-Zuordnung und Filter.
- **Protokolle** pro Projekt: Bereiche → Sitzungen → Zeilen inkl. Aufgaben-Zuordnung und Filter, mit Popup-Dialogen für Bereich/Sitzung, Zeitfilter-Modus (Datum/Monat/Jahr) und Entfernen einzelner Aufgaben-Zuordnungen.
- Protokollfilter reagieren direkt bei Eingabe/Änderung (ohne extra „Aktualisieren“); Sitzungsverweise in Aufgaben werden kompakt per aufklappbarer Liste dargestellt.
- **Daten zentral speichern**: Projekte/Aufgaben/Protokolle liegen in der Datenbank (Neon) und sind für berechtigte Nutzer gemeinsam nutzbar.

## Schnellstart

Öffne die deployte App (Vercel) und melde dich an.

- **Admin** kann Projekte anlegen, Nutzer anlegen und Projektzugriffe verwalten.
- **Normale Nutzer** sehen nur zugeordnete Projekte.

## Typischer Ablauf

1. **Projekt anlegen**
2. **Benutzer zuordnen** (damit sie Zugriff auf das Projekt haben)
3. **Hauptaufgaben erstellen**
4. **Unteraufgaben ergänzen**
5. **Abhängigkeiten setzen** (was zuerst erledigt sein muss)
6. **Im Gantt prüfen**, ob Zeitplan und Reihenfolge passen

## Protokolle (pro Projekt)

- Eigener Bereich **„Protokolle“** innerhalb der geöffneten Projektansicht (nicht global auf der Startseite)
- **Projektgebunden**: jedes Projekt hat seinen eigenen separaten Protokollbereich
- Bereiche als **Obergruppen** (z. B. `JF`, `Kundentermin`) über eigene `+ Bereich`-Schaltfläche anlegbar
- Bereiche sind ausklappbar; darunter liegen die Sitzungen mit Datum als aufklappbare Überschrift
- Bereich- und Sitzungsanlage laufen über eigene **Popup-Dialoge** statt Inline-Formularen
- In jeder Sitzung pro Zeile: Verantwortlicher, Freitext zur Erläuterung, **mehrere** Aufgabenkarten (Button `Aufgabe zuordnen` mit Suche/Filter + Kartenklick zum Öffnen/Bearbeiten), Ergebnis
- Zugeordnete Aufgaben erscheinen in Protokollen im **Kanban-Kartenstil**
- Zusätzliche Schaltflächen für Bereich/Sitzung (umbenennen, löschen, speichern, + Sitzung, + Zeile)
- Auto-Save beim Zuklappen einer Sitzung; Gruppenliste ist scrollbar (ca. 3 Bereiche gleichzeitig sichtbar)
- Protokollbereich mit Such-/Filterleiste (Suche, Bereich, Verantwortlicher, Aufgabe, Datum/Monat/Jahr) für schnelle Eingrenzung

## Aufgabenansichten im Überblick

### 1) Aufgabenliste
- Kompakte Standardansicht: Titel, Zuständigkeit und Frist
- Hauptaufgaben-Form ist standardmäßig eingeklappt und per Button einblendbar
- Such- und Filterleiste für Titel/Beschreibung, Verantwortliche, Priorität, Fristfenster und Kanban-Spalte
- Unteraufgaben pro Karte mit Zähler ein-/ausblendbar
- Weitere Felder per „Details anzeigen“ aufklappbar
- Kompakter Bereich „In Sitzungen verwendet“ in der Aufgabenkarte (Popup-Liste), mit Direktsprung zur verknüpften Protokoll-Sitzung
- Abschließen archiviert Aufgaben; aktive Liste zeigt nur nicht archivierte Karten
- Archivbereich ein-/ausblendbar, mit Öffnen, Wiederherstellen und Endgültig löschen
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

- Die Cloud-App nutzt eine **Neon Postgres** Datenbank (Drizzle ORM).
- Authentifizierung läuft über **JWT** in einem HttpOnly-Cookie (`smarttodo_session`).
- Zugriffe werden serverseitig geprüft (Admin: alle Projekte, User: nur Mitgliedschaften in `project_members`).

## Repository

[github.com/philipp-hartmann-hub/Der-Projektmanager](https://github.com/philipp-hartmann-hub/Der-Projektmanager)

```bash
git clone https://github.com/philipp-hartmann-hub/Der-Projektmanager.git
cd Der-Projektmanager
```

## Cloud-Start (Neon + Vercel)

Erster technischer Start liegt jetzt in `web/`:

- Next.js App Router (TypeScript)
- Neon-Anbindung über `@neondatabase/serverless`
- Drizzle-Schema für `users`, `projects`, `project_members`, `tasks` (inkl. `depends_on_task_ids`, `assignee_ids` für Vorgänger/Zuständige)
- API-Basis für Login und Admin-User-Anlage
- Admin-Oberfläche in der Cloud-App: Projekte anlegen, Benutzer anlegen und Projektzuordnungen pro Benutzer bearbeiten
- Admin-Oberfläche erweitert: bestehende Projekte umbenennen, Beschreibung/Bild nachträglich ändern oder Projekt inkl. Aufgaben/Zuordnungen löschen
- Projektübersicht in der Cloud-App ist klickbar; Detailroute `/projects/[id]` mit Zugriffsprüfung (Admin oder Projektzuordnung) ergänzt
- Aufgabenkern in Cloud-Detailseite ergänzt: Aufgaben/Unteraufgaben anlegen, bearbeiten, abschließen, archivieren und wiederherstellen (serverseitig per API)
- Kanban-Basis in Cloud ergänzt: Umschaltung Liste/Kanban, Karten pro Standardspalte, Verschieben via Spaltenauswahl und Kartenerstellung in Spalten
- Gantt-Basis in Cloud ergänzt: Umschaltung Liste/Projektplan/Kanban, Zeitskala Tag/Monat/Jahr, Balken aus Beginn/Frist, hierarchische Zeilen mit Auf-/Zuklappen, Abhängigkeitslinien und Bearbeiten-Modal inkl. Vorgänger-Auswahl (serverseitig validiert)
- Aufgabenliste in Cloud ergänzt: Filter (Suche, Zuständiger, Priorität, Fristfenster, Kanban-Spalte), Zuständige pro Aufgabe als Mehrfachauswahl nur unter Projektmitgliedern; bei Admin-Entzug einer Projektzuordnung werden betroffene Zuweisungen bereinigt
- Protokolle in Cloud ergänzt: Bereiche → Sitzungen (Datum) → Zeilen (Verantwortlicher, Erläuterung, Aufgaben, Ergebnis) inkl. Suche/Filter (Bereich, Verantwortlicher, Aufgabe, Monat/Jahr) und Aufgabensprung in den Gantt
- Kanban in Cloud erweitert: konfigurierbare Spalten + Swimlanes pro Projekt, Drag-and-Drop zwischen Zellen, Löschen von Spalten/Lanes ordnet Aufgaben automatisch Backlog/Standard zu
- Aufgaben-Metadaten in Cloud erweitert: Anhänge (Datei-Upload als Data-URL), Links und Historie pro Aufgabe inkl. Anlegen/Entfernen in der Aufgaben-Detailansicht

Lokaler Start:

```bash
cd web
cp .env.example .env.local
# DATABASE_URL und AUTH_JWT_SECRET setzen
npm install
npm run db:push
npm run db:seed-admin
npm run dev
```

Danach auf Vercel deployen und dieselben Env-Variablen im Vercel-Projekt hinterlegen.

---

## Legacy / Referenz (SmartToDo.html)

Die Datei `SmartToDo.html` ist die ursprüngliche **Single-HTML-Referenz** (lokale `localStorage`-App).  
Der aktuelle Fokus ist die **deployte Cloud-App** im Ordner `web/`.

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
| 2026-04-06 | Aufgabenliste durchsuch- und filterbar gemacht: Suche plus Filter nach Verantwortlichen, Priorität, Fristfenster und Status mit Reset. |
| 2026-04-06 | Protokollstruktur geschärft: Sitzungen werden je Bereich angelegt (ohne Pflichttext), Sitzungszeilen nutzen feste 4-Feld-Struktur inkl. Aufgabenkarten-Zuordnung mit Popup. |
| 2026-04-06 | Filter-Beschriftung in der Aufgabenliste präzisiert: eindeutige Feldtitel und spezifische „Alle …“-Optionen für bessere Zuordenbarkeit. |
| 2026-04-06 | Protokoll-UI überarbeitet: lila Design, eigener `+ Bereich`-Flow, ausklappbare Bereiche/Sitzungen, Kanban-Kartenstil für zugeordnete Aufgaben, mehr Aktionsbuttons und scrollbare Bereichsliste. |
| 2026-04-06 | Aufgabenliste begrenzt: pro Ebene (Hauptaufgaben und Unteraufgaben) sind nur ca. 5 Einträge sichtbar, danach vertikaler Scroll innerhalb der Liste. |
| 2026-04-06 | Protokoll-Bereichsüberschriften visuell angeglichen: Toggle-Schaltflächen nutzen jetzt das lila Button-Design mit weißer Schrift. |
| 2026-04-06 | Ockerfarbe in Aufgaben-Badges entfernt: mittlere Priorität nutzt nun ebenfalls lilafarbenes Styling statt gelb/ocker. |
| 2026-04-06 | Protokoll-Sitzungskopf und Protokoll-Tabellenüberschriften auf lila Hintergrund mit weißer Schrift umgestellt (konsistentes Farbkonzept). |
| 2026-04-06 | Protokoll-Aufgabenspalte erweitert: mehrere Karten pro Zeile möglich; Karten öffnen direkt per Klick (ohne extra Öffnen-Button) und wirken wie gewohnt auf Liste/Gantt/Kanban. |
| 2026-04-06 | Helle „Eierschalen“-Flächen entfernt: Protokollbereich, Sitzungskörper und Filterleisten auf dunkles Kontrast-Design umgestellt. |
| 2026-04-06 | Protokoll-Aufgabenwahl auf echtes Mehrfach-Select umgestellt, damit mehrere Karten pro Zeile gleichzeitig ausgewählt und gespeichert werden können. |
| 2026-04-06 | Kartenklick in Protokollen stabilisiert: Aufgabenkarten öffnen nun zuverlässig per Klick/Enter/Space im Gantt-Popup (inkl. vorherigem Render-Schritt). |
| 2026-04-06 | Protokoll-Aufgabenzuordnung auf Button-Flow umgestellt: `Aufgabe zuordnen` öffnet Suche/Filter-Auswahl und erlaubt wiederholtes Hinzufügen mehrerer Karten pro Zeile. |
| 2026-04-06 | Protokoll-Anlage auf zwei Buttons mit Popups umgestellt: `Bereich anlegen` und `Sitzung anlegen` öffnen eigene Dialoge statt Inline-Templates. |
| 2026-04-06 | Protokoll-Mehrfachzuordnung robuster gemacht: neue Aufgaben werden additiv zur bestehenden Kartenliste gespeichert statt eine vorhandene Auswahl zu ersetzen. |
| 2026-04-06 | Protokoll-Kartenöffnung korrigiert: Karten verwenden jetzt denselben Popup-Öffnungsweg wie Kanban/Gantt und sind dadurch direkt bearbeitbar. |
| 2026-04-06 | Aufgaben-Popup erweitert: Historie ist jetzt auch im Gantt/Kanban/Protokoll-Modal sichtbar und direkt dort pflegbar. |
| 2026-04-06 | Protokoll-Button `Aufgabe zuordnen` repariert: Auswahl-Dropdown öffnet wieder zuverlässig und erlaubt freie Kartenzuordnung ohne Abhängigkeitsfilter. |
| 2026-04-06 | Aufgabenlisten-Filter umgestellt: statt Status (offen/erledigt) filtert die Liste jetzt nach der gewählten Kanban-Spalte des Projekts. |
| 2026-04-06 | Kanban-Spaltenlöschung abgesichert: alle Aufgaben aus der gelöschten Spalte werden automatisch dem Backlog zugeordnet (inkl. Unteraufgaben). |
| 2026-04-06 | Aufgabenkarte erweitert: kompakter Sitzungs-Hinweis mit Popup-Liste aller Protokollzuordnungen und Direktsprung zur jeweiligen Sitzung. |
| 2026-04-06 | Protokoll-Zuordnung repariert: Karten-Auswahl wirkt wieder auf die richtige Zeile; Picker zeigt dort die vollständige Aufgabenliste statt kurzer Scroll-Liste. |
| 2026-04-06 | Protokolle durchsuch- und filterbar gemacht: Suche sowie Filter nach Bereich, Verantwortlichem und Aufgabe mit Reset-Funktion ergänzt. |
| 2026-04-06 | Protokoll-Zeitfilter erweitert: Monat und Jahr als Dropdown-Auswahl ergänzt (zusätzlich zu exaktem Datum). |
| 2026-04-06 | Benutzerverwaltung ergänzt: Login mit Admin/Benutzerrollen, automatische Zugangsdaten für neue Nutzer und projektbezogene Zugriffssteuerung pro Profil. |
| 2026-04-06 | Admin-Login stabilisiert: Standard-Admin wird strikt auf `admin` mit gültiger Rolle geführt; sichtbarer Admin-Hinweis aus der Login-Startseite entfernt. |
| 2026-04-06 | Cloud-Migration begonnen: neues `web/`-Projekt mit Next.js + Neon + Drizzle + Login/API-Basis erstellt (Vercel-ready Grundgerüst). |
| 2026-04-06 | Rebranding auf „Der Projektmanager“: App-Titel, Cloud-UI, Projektregeln und README/Repo-Links auf den neuen Namen umgestellt. |
| 2026-04-06 | Neon-Anbindung aktiviert: Schema erfolgreich in Neon gepusht und initialer Admin-Seed (`admin`) in der Cloud-Datenbank ausgeführt. |
| 2026-04-06 | Cloud-Admin erweitert: fehlende Admin-Aktionen ergänzt (Projekt anlegen, Benutzer anlegen, Projektzuordnung speichern) inkl. API-Routen. |
| 2026-04-06 | Cloud-Navigation ergänzt: Projekte in der Übersicht sind jetzt öffnbar; neue Detailseite mit serverseitiger Zugriffskontrolle hinzugefügt. |
| 2026-04-06 | Welle 1 gestartet: Aufgaben-CRUD in Cloud-Projekten ergänzt (inkl. Unteraufgaben, Archiv/Wiederherstellen und Aufgaben-APIs). |
| 2026-04-06 | Welle 2 gestartet: Kanban-Grundfunktion in Cloud-Projekten ergänzt (Ansichtsumschalter, Spaltenboard, Kartenverschiebung, Kartenerstellung). |
| 2026-04-06 | Welle 3 gestartet: Gantt-Grundfunktion in Cloud-Projekten ergänzt (Spalte `depends_on_task_ids`, Projektplan-Ansicht, Skalen, Balken, Abhängigkeiten, Modal). |
| 2026-04-06 | Welle 4 gestartet: Cloud-Aufgabenliste mit Filtern, `assignee_ids` (nur Projektmitglieder), API-Validierung und Bereinigung bei Entzug der Mitgliedschaft. |
| 2026-04-06 | Admin-Zugriff geschärft: Admin gilt in der Cloud global für alle Projekte und ist automatisch als zuständige Person auswählbar (ohne Projektmitgliedschaft). |
| 2026-04-06 | Admin-Useranlage verbessert: generierte Benutzername/Passwort-Kombination bleibt sichtbar (lokal gespeicherte Zugangsdatenliste), kein sofortiger Reload mehr nach Anlage. |
| 2026-04-06 | Welle 5 gestartet: Protokolle in der Cloud ergänzt (DB-Tabellen + API + Protokoll-Ansicht im Projekt inkl. Aufgaben-Zuordnung und Filter). |
| 2026-04-06 | Protokoll-Sprung vervollständigt: „Aufgabe öffnen“ aus Protokollen wechselt jetzt direkt in den Gantt der Zielkarte; Protokollansicht lädt Daten beim Öffnen automatisch. |
| 2026-04-06 | Kanban-Parität ausgebaut: Spalten/Swimlanes persistent pro Projekt, Drag-and-Drop, automatische Rückzuordnung beim Löschen. |
| 2026-04-06 | Parität vertieft: Aufgaben zeigen Protokoll-Rückverweise („In Sitzungen verwendet“) mit Direktsprung; Gantt-Modal um Anhänge, Links und Historie erweitert. |
| 2026-04-06 | Weitere Parität: Projektbilder in Cloud-Admin/Projektlisten ergänzt (Upload + Anzeige); Archiv in der Aufgabenliste um „Endgültig löschen“ erweitert. |
| 2026-04-06 | Aufgaben-Details erweitert: Anhänge, Links und Historie in der Cloud-Aufgabenliste ergänzt (Schema, API und UI). |
| 2026-04-06 | Nächste Parität: Admin kann bestehende Projekte bearbeiten/löschen; Archiv-„Öffnen“ springt in den Gantt-Karten-Dialog (auch für archivierte Karten). |
| 2026-04-06 | Form-Parität verbessert: Projektanlage, Teilnehmendenverwaltung und Unteraufgaben sind standardmäßig eingeklappt und per Button einblendbar. |
| 2026-04-06 | Protokoll-UX weiter angeglichen: Bereich/Sitzung per Modal anlegen, Zeitfilter-Modus (Datum/Monat/Jahr) mit Wertfeld, Aufgabenchips in Protokollzeilen einzeln entfernbar, Bereichsliste scrollbar. |
| 2026-04-06 | Aufgabenlisten-UX weiter angenähert: Hauptaufgabenformular standardmäßig eingeklappt; Archiv mit „Archiv anzeigen/ausblenden“-Toggle wie in der HTML-Referenz. |
| 2026-04-06 | Feinschliff: Protokollfilter laden automatisch bei Änderungen; Aufgabenkarte zeigt Protokoll-Sitzungen kompakt als aufklappbare Popover-Liste. |
| 2026-04-06 | 1:1-Feinschliff Aufgabenliste: Unteraufgaben lassen sich pro Karte mit Zähler ein-/ausblenden (analog zur HTML-Referenz). |
