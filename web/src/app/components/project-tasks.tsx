"use client";

import { useMemo, useState } from "react";
import {
  defaultListFilterState,
  filterTaskTree,
  hasActiveListFilter,
  type ListFilterState,
} from "@/lib/task-list-filters";
import { buildTaskTree, type TaskNode } from "@/lib/task-tree";

const KANBAN_COLUMNS = [
  { id: "kanban-backlog", name: "Backlog" },
  { id: "kanban-in-progress", name: "In Bearbeitung" },
  { id: "kanban-waiting-feedback", name: "Warten auf Rückmeldung" },
  { id: "kanban-done", name: "Abgeschlossen" },
];

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
  assigneeIds?: string[] | null;
};

export type ProjectMember = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
};

type Props = {
  projectId: string;
  initialTasks: Task[];
  projectMembers: ProjectMember[];
};

function memberLabel(m: ProjectMember) {
  return `${m.firstName} ${m.lastName} (${m.username})`;
}

export default function ProjectTasks({ projectId, initialTasks, projectMembers }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<ListFilterState>(defaultListFilterState);

  const active = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);
  const archived = useMemo(() => tasks.filter((t) => t.archived), [tasks]);

  const tree = useMemo(() => buildTaskTree(active), [active]);

  const filteredTree = useMemo(() => filterTaskTree(tree, filter), [tree, filter]);

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

  function setFilterField<K extends keyof ListFilterState>(key: K, value: ListFilterState[K]) {
    setFilter((prev) => ({ ...prev, [key]: value }));
  }

  function resetFilters() {
    setFilter(defaultListFilterState());
  }

  function TaskNode({ node, depth }: { node: TaskNode<Task>; depth: number }) {
    const task = node;
    const [subTitle, setSubTitle] = useState("");
    const colLabel = KANBAN_COLUMNS.find((c) => c.id === task.kanbanColumnId)?.name ?? task.kanbanColumnId;
    const assignees = task.assigneeIds || [];

    function toggleAssignee(userId: string, checked: boolean) {
      const next = checked
        ? [...new Set([...assignees, userId])]
        : assignees.filter((x) => x !== userId);
      void patchTask(task.id, { assigneeIds: next });
    }

    return (
      <div className="task-node" style={{ marginLeft: depth * 18 }}>
        <div className="task-row">
          <input
            type="checkbox"
            checked={task.done}
            onChange={(e) =>
              patchTask(task.id, { done: e.target.checked, archived: e.target.checked || task.archived })
            }
          />
          <input value={task.title} onChange={(e) => patchTask(task.id, { title: e.target.value })} />
          <select value={task.priority} onChange={(e) => patchTask(task.id, { priority: e.target.value })}>
            <option value="high">Hoch</option>
            <option value="medium">Mittel</option>
            <option value="low">Niedrig</option>
          </select>
          <span className="task-kanban-pill" title="Kanban-Spalte">
            {colLabel}
          </span>
          <button className="secondary" onClick={() => patchTask(task.id, { archived: !task.archived })}>
            {task.archived ? "Wiederherstellen" : "Archivieren"}
          </button>
          <button className="secondary" onClick={() => deleteTask(task.id)}>
            Löschen
          </button>
        </div>
        <div className="task-assignees">
          <span className="task-assignees__label">Zuständige:</span>
          {projectMembers.length === 0 ? (
            <span className="task-assignees__empty">Keine Projektmitglieder (Admin: Benutzer zuordnen)</span>
          ) : (
            <div className="task-assignees__boxes">
              {projectMembers.map((m) => (
                <label key={m.id} className="task-assignees__item">
                  <input
                    type="checkbox"
                    checked={assignees.includes(m.id)}
                    onChange={(e) => toggleAssignee(m.id, e.target.checked)}
                  />
                  {memberLabel(m)}
                </label>
              ))}
            </div>
          )}
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
        {node.children.map((s) => (
          <TaskNode key={s.id} node={s as TaskNode<Task>} depth={depth + 1} />
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

      <div className="task-filters">
        <div className="task-filters__field">
          <label htmlFor="tf-search">Suche</label>
          <input
            id="tf-search"
            placeholder="Titel oder Beschreibung…"
            value={filter.search}
            onChange={(e) => setFilterField("search", e.target.value)}
          />
        </div>
        <div className="task-filters__field">
          <label htmlFor="tf-assignee">Zuständig</label>
          <select
            id="tf-assignee"
            value={filter.assigneeId}
            onChange={(e) => setFilterField("assigneeId", e.target.value)}
          >
            <option value="">Alle Zuständigen</option>
            {projectMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {memberLabel(m)}
              </option>
            ))}
          </select>
        </div>
        <div className="task-filters__field">
          <label htmlFor="tf-priority">Priorität</label>
          <select
            id="tf-priority"
            value={filter.priority}
            onChange={(e) => setFilterField("priority", e.target.value)}
          >
            <option value="">Alle Prioritäten</option>
            <option value="high">Hoch</option>
            <option value="medium">Mittel</option>
            <option value="low">Niedrig</option>
          </select>
        </div>
        <div className="task-filters__field">
          <label htmlFor="tf-due">Frist</label>
          <select id="tf-due" value={filter.dueMode} onChange={(e) => setFilterField("dueMode", e.target.value)}>
            <option value="">Alle Fristen</option>
            <option value="none">Ohne Frist</option>
            <option value="today">Heute</option>
            <option value="next7">Nächste 7 Tage</option>
            <option value="overdue">Überfällig (offen)</option>
          </select>
        </div>
        <div className="task-filters__field">
          <label htmlFor="tf-kanban">Kanban-Spalte</label>
          <select
            id="tf-kanban"
            value={filter.kanbanColumnId}
            onChange={(e) => setFilterField("kanbanColumnId", e.target.value)}
          >
            <option value="">Alle Spalten</option>
            {KANBAN_COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="task-filters__actions">
          <button type="button" className="secondary" disabled={!hasActiveListFilter(filter)} onClick={resetFilters}>
            Filter zurücksetzen
          </button>
        </div>
      </div>

      <div className="task-list-scroll">
        {filteredTree.length === 0 ? (
          <p style={{ marginTop: 12 }}>
            {hasActiveListFilter(filter) ? "Keine Aufgaben passen zu den Filtern." : "Noch keine Aufgaben."}
          </p>
        ) : (
          filteredTree.map((node) => <TaskNode key={node.id} node={node} depth={0} />)
        )}
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
