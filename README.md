# Smart ToDo

Aufgaben im Browser: **erstellen**, **drei Prioritäten**, **Frist (Kalender)**, **beliebig tiefe Unteraufgaben**, **erledigt markieren**, **löschen** — Speicherung in **localStorage** (überlebt Browser-Neustart).

**Kein Node.js, kein npm, kein Terminal nötig** — die App ist **eine einzige HTML-Datei**.

## App öffnen (direkter Link)

Diese Datei im Ordner dieses Projekts:

**`SmartToDo.html`**

- **Finder:** Ordner öffnen → **`SmartToDo.html`** **doppelklicken**
- **Browser-Adresszeile** (gleicher Inhalt wie Doppelklick):

[`file:///Users/philipphartmann/Cursor%20Trainig/Smart%20ToDo/SmartToDo.html`](file:///Users/philipphartmann/Cursor%20Trainig/Smart%20ToDo/SmartToDo.html)

*(Wenn du das Repo woanders ablegst, den Pfad vor `SmartToDo.html` anpassen.)*

## Funktionen

| Feature | Umsetzung |
|---------|-----------|
| Aufgaben erstellen / erledigen / löschen | Formular, Checkbox, Löschen (inkl. aller Unteraufgaben) |
| 3 Prioritäten | Hoch, Mittel, Niedrig (Hauptaufgaben und Unteraufgaben) |
| Unteraufgaben | Beliebig viele Ebenen; pro Eintrag „Unteraufgabe“ → Eingabe einblenden |
| Fristen | Native Datumsauswahl (`type="date"`) für Haupt- und Unteraufgaben; Anzeige/Änderung pro Zeile; überfällige offene Aufgaben hervorgehoben |
| Daten bleiben | `localStorage`-Schlüssel `smart-todo-tasks` (ältere Einträge ohne Frist: nachträglich Datum wählbar) |

## Repository

[github.com/philipp-hartmann-hub/Smart-ToDos](https://github.com/philipp-hartmann-hub/Smart-ToDos)

```bash
git clone https://github.com/philipp-hartmann-hub/Smart-ToDos.git
cd Smart-ToDos
# Nur SmartToDo.html im Browser öffnen — fertig.
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
