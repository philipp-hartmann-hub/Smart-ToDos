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
};

type Props = {
  projectId: string;
  initialTasks: Task[];
};

export default function ProjectTasks({ projectId, initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const active = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);
  const archived = useMemo(() => tasks.filter((t) => t.archived), [tasks]);

  function childrenOf(parentId: string | null) {
    return active.filter((t) => (t.parentId || null) === parentId);
  }

  async function refresh() {
    const res = await fetch(`/api/projects/${projectId}/tasks`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { tasks: Task[] };
    setTasks(data.tasks);
  }

  async function createTask(parentId: string | null = null) {
    const t = title.trim();
    if (!t) return;
    setLoading(true);
    await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t, parentId }),
    });
    setTitle("");
    setLoading(false);
    await refresh();
  }

  async function patchTask(taskId: string, patch: Partial<Task>) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await refresh();
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    await refresh();
  }

  function TaskNode({ task, depth }: { task: Task; depth: number }) {
    const subs = childrenOf(task.id);
    const [subTitle, setSubTitle] = useState("");
    return (
      <div className="task-node" style={{ marginLeft: depth * 18 }}>
        <div className="task-row">
          <input
            type="checkbox"
            checked={task.done}
            onChange={(e) => patchTask(task.id, { done: e.target.checked, archived: e.target.checked || task.archived })}
          />
          <input value={task.title} onChange={(e) => patchTask(task.id, { title: e.target.value })} />
          <select value={task.priority} onChange={(e) => patchTask(task.id, { priority: e.target.value })}>
            <option value="high">Hoch</option>
            <option value="medium">Mittel</option>
            <option value="low">Niedrig</option>
          </select>
          <button className="secondary" onClick={() => patchTask(task.id, { archived: !task.archived })}>
            {task.archived ? "Wiederherstellen" : "Archivieren"}
          </button>
          <button className="secondary" onClick={() => deleteTask(task.id)}>
            Löschen
          </button>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <input
            type="date"
            value={task.startDate || ""}
            onChange={(e) => patchTask(task.id, { startDate: e.target.value || null })}
          />
          <input
            type="date"
            value={task.dueDate || ""}
            onChange={(e) => patchTask(task.id, { dueDate: e.target.value || null })}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <input
            placeholder="Beschreibung"
            value={task.description || ""}
            onChange={(e) => patchTask(task.id, { description: e.target.value })}
          />
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <input placeholder="Unteraufgabe..." value={subTitle} onChange={(e) => setSubTitle(e.target.value)} />
          <button
            onClick={async () => {
              if (!subTitle.trim()) return;
              await fetch(`/api/projects/${projectId}/tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: subTitle.trim(), parentId: task.id }),
              });
              setSubTitle("");
              await refresh();
            }}
          >
            + Unteraufgabe
          </button>
        </div>
        {subs.map((s) => (
          <TaskNode key={s.id} task={s} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Aufgaben</h2>
      <div className="row">
        <input placeholder="Neue Aufgabe..." value={title} onChange={(e) => setTitle(e.target.value)} />
        <button onClick={() => createTask(null)} disabled={loading}>
          Aufgabe anlegen
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        {childrenOf(null).length === 0 ? <p>Noch keine Aufgaben.</p> : null}
        {childrenOf(null).map((task) => (
          <TaskNode key={task.id} task={task} depth={0} />
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Archiv</h3>
        {archived.length === 0 ? <p>Kein Archivinhalt.</p> : null}
        {archived.map((task) => (
          <div key={task.id} className="task-row" style={{ marginBottom: 8 }}>
            <strong>{task.title}</strong>
            <button className="secondary" onClick={() => patchTask(task.id, { archived: false, done: false })}>
              Wiederherstellen
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
