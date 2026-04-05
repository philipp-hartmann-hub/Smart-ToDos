# Smart ToDo

Aufgabenverwaltung im Browser: **erstellen**, **Priorität wählen**, **als erledigt markieren**, **löschen** — mit **localStorage** (überlebt Seiten-Reload). Gebaut mit **React 19**, **TypeScript** und **Vite**.

## Akzeptanzkriterien

| Kriterium | Umsetzung |
|-----------|-----------|
| Tasks erstellen, erledigen, löschen | Formular + Checkbox + Löschen-Button; Zustand über `useTasks` |
| 3 Prioritäten beim Erstellen | Niedrig, Mittel, Hoch (Radio-Buttons) |
| Nach Browser-Reload erhalten | `localStorage`-Schlüssel `smart-todo-tasks` |
| `npm run build` ohne TypeScript-Fehler | `tsc -b && vite build` |
| GitHub + README | [philipp-hartmann-hub/Smart-ToDos](https://github.com/philipp-hartmann-hub/Smart-ToDos) |

## Voraussetzungen

- [Node.js](https://nodejs.org/) (LTS empfohlen, z. B. v20+)
- npm (mit Node mitgeliefert)

## Installation

```bash
npm install
```

## Entwicklung

```bash
npm run dev
```

Öffne die angezeigte lokale URL (typisch `http://localhost:5173`).

## Produktions-Build

```bash
npm run build
```

Statische Ausgabe liegt in `dist/`. Vorschau:

```bash
npm run preview
```

## Lint

```bash
npm run lint
```

## Projektstruktur (Auszug)

```
src/
  App.tsx          # UI
  App.css
  hooks/useTasks.ts # State + localStorage
  types/task.ts    # Task, Priorität, Labels
index.html
vite.config.ts
```

## Repository

Quellcode und Issues: **[github.com/philipp-hartmann-hub/Smart-ToDos](https://github.com/philipp-hartmann-hub/Smart-ToDos)**

```bash
git clone https://github.com/philipp-hartmann-hub/Smart-ToDos.git
cd Smart-ToDos
npm install
```

Änderungen pushen:

```bash
git push -u origin main
```

---

## Changelog / Aktualisierungsprotokoll

| Datum | Kurzbeschreibung |
|-------|------------------|
| 2026-04-05 | Initiale README und Cursor-Regel zur README-Pflege angelegt; Repository noch ohne App-Code. |
| 2026-04-05 | Vite + React + TS: ToDo mit Prioritäten, localStorage, Build/Lint grün; README und Git-Anleitung. |
| 2026-04-05 | README: offizielles GitHub-Repo [Smart-ToDos](https://github.com/philipp-hartmann-hub/Smart-ToDos) verlinkt; Merge mit GitHub-`main`. |
