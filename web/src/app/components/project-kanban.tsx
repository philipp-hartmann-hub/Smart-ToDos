"use client";

import { useMemo, useState } from "react";

type Task = {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  priority: string;
  done: boolean;
  archived: boolean;
  startDate: string | null;
  dueDate: string | null;
  description: string | null;
  kanbanColumnId: string;
  swimlaneId: string;
};

type Props = {
  projectId: string;
  initialTasks: Task[];
};

const KANBAN_COLUMNS = [
  { id: "kanban-backlog", name: "Backlog" },
  { id: "kanban-in-progress", name: "In Bearbeitung" },
  { id: "kanban-waiting-feedback", name: "Warten auf Rückmeldung" },
  { id: "kanban-done", name: "Abgeschlossen" },
];

export default function ProjectKanban({ projectId, initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newByCol, setNewByCol] = useState<Record<string, string>>({});

  const active = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);

  async function refresh() {
    const res = await fetch(`/api/projects/${projectId}/tasks`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { tasks: Task[] };
    setTasks(data.tasks);
  }

  async function patchTask(taskId: string, patch: Partial<Task>) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await refresh();
  }

  async function addCard(columnId: string) {
    const title = (newByCol[columnId] || "").trim();
    if (!title) return;
    await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, kanbanColumnId: columnId }),
    });
    setNewByCol((prev) => ({ ...prev, [columnId]: "" }));
    await refresh();
  }

  return (
    <div className="card">
      <h2>Kanban</h2>
      <div className="kanban-grid">
        {KANBAN_COLUMNS.map((col) => (
          <div key={col.id} className="kanban-column">
            <div className="kanban-column__head">
              <strong>{col.name}</strong>
            </div>
            <div className="kanban-column__add">
              <input
                placeholder="+ Karte"
                value={newByCol[col.id] || ""}
                onChange={(e) => setNewByCol((prev) => ({ ...prev, [col.id]: e.target.value }))}
              />
              <button onClick={() => addCard(col.id)}>Hinzufügen</button>
            </div>
            <div className="kanban-cards">
              {active
                .filter((t) => (t.kanbanColumnId || "kanban-backlog") === col.id)
                .map((task) => (
                  <div key={task.id} className="kanban-card">
                    <div className="kanban-card__title">{task.title}</div>
                    <div className="kanban-card__meta">Priorität: {task.priority}</div>
                    <div className="row">
                      <select
                        value={task.kanbanColumnId || "kanban-backlog"}
                        onChange={(e) => patchTask(task.id, { kanbanColumnId: e.target.value })}
                      >
                        {KANBAN_COLUMNS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                      <button className="secondary" onClick={() => patchTask(task.id, { archived: true, done: true })}>
                        Abschließen
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
