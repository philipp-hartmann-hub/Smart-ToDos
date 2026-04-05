# Smart ToDo

Aufgabenverwaltung im Browser: **erstellen**, **Priorität wählen**, **als erledigt markieren**, **löschen** — mit **localStorage** (überlebt Seiten-Reload). Gebaut mit **React 19**, **TypeScript** und **Vite**.

## Akzeptanzkriterien

| Kriterium | Umsetzung |
|-----------|-----------|
| Tasks erstellen, erledigen, löschen | Formular + Checkbox + Löschen-Button; Zustand über `useTasks` |
| 3 Prioritäten beim Erstellen | Niedrig, Mittel, Hoch (Radio-Buttons) |
| Nach Browser-Reload erhalten | `localStorage`-Schlüssel `smart-todo-tasks` |
| `npm run build` ohne TypeScript-Fehler | `tsc -b && vite build` |
| GitHub + README | Diese Datei; Repo lokal mit Git initialisieren und remote pushen (siehe unten) |

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

## Auf GitHub bringen

Lokal ist noch kein Remote vorgegeben. Nach `git init` und erstem Commit:

1. Auf GitHub ein **neues Repository** anlegen (ohne README, wenn du hier schon eine hast).
2. Im Projektordner:

```bash
git init
git add .
git commit -m "Initial commit: Smart ToDo App"
git branch -M main
git remote add origin https://github.com/<DEIN_USER>/<REPO_NAME>.git
git push -u origin main
```

SSH-URL geht analog (`git@github.com:...`).

---

## Changelog / Aktualisierungsprotokoll

| Datum | Kurzbeschreibung |
|-------|------------------|
| 2026-04-05 | Initiale README und Cursor-Regel zur README-Pflege angelegt; Repository noch ohne App-Code. |
| 2026-04-05 | Vite + React + TS: ToDo mit Prioritäten, localStorage, Build/Lint grün; README und Git-Anleitung. |
