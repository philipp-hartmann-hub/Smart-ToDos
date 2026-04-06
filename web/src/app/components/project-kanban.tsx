"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { KANBAN_BACKLOG_ID, KANBAN_DEFAULT_LANE_ID } from "@/lib/kanban-config";

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

type Props = {
  projectId: string;
  initialTasks: Task[];
};

type KanbanColumn = { id: string; name: string; sortOrder: number };
type KanbanLane = { id: string; name: string; sortOrder: number };

function safeId(base: string) {
  const s = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || `col-${Math.random().toString(16).slice(2, 8)}`;
}

export default function ProjectKanban({ projectId, initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [lanes, setLanes] = useState<KanbanLane[]>([]);
  const [newByCell, setNewByCell] = useState<Record<string, string>>({});
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const active = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);

  function cellKey(laneId: string, colId: string) {
    return `${laneId}__${colId}`;
  }

  async function refresh() {
    const res = await fetch(`/api/projects/${projectId}/tasks`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { tasks: Task[] };
    setTasks(data.tasks);
  }

  async function refreshKanbanConfig() {
    const res = await fetch(`/api/projects/${projectId}/kanban`, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as any;
    if (!res.ok) {
      setMessage(data?.error || "Kanban-Konfiguration konnte nicht geladen werden.");
      return;
    }
    setColumns((data.columns || []).slice().sort((a: KanbanColumn, b: KanbanColumn) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    setLanes((data.swimlanes || []).slice().sort((a: KanbanLane, b: KanbanLane) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
  }

  async function patchTask(taskId: string, patch: Partial<Task>) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await refresh();
  }

  async function addCard(laneId: string, columnId: string) {
    const key = cellKey(laneId, columnId);
    const title = (newByCell[key] || "").trim();
    if (!title) return;
    // Neue Karten starten immer im Backlog (wie in der HTML-Referenz).
    await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, parentId: null, kanbanColumnId: KANBAN_BACKLOG_ID, swimlaneId: laneId }),
    });
    setNewByCell((prev) => ({ ...prev, [key]: "" }));
    await refresh();
  }

  async function addSubtask(parent: Task) {
    const t = window.prompt("Titel der Unteraufgabe:");
    if (!t?.trim()) return;
    await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: t.trim(),
        parentId: parent.id,
        kanbanColumnId: parent.kanbanColumnId || KANBAN_BACKLOG_ID,
        swimlaneId: parent.swimlaneId || KANBAN_DEFAULT_LANE_ID,
      }),
    });
    await refresh();
  }

  function openTask(taskId: string) {
    window.location.assign(`/projects/${projectId}?view=gantt&openTaskId=${encodeURIComponent(taskId)}`);
  }

  async function createColumn() {
    const name = window.prompt("Spaltenname:");
    if (!name?.trim()) return;
    const id = `kanban-${safeId(name)}`;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "column", id, name: name.trim() }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Spalte konnte nicht angelegt werden.");
      return;
    }
    await refreshKanbanConfig();
  }

  async function createLane() {
    const name = window.prompt("Swimlane-Name:");
    if (!name?.trim()) return;
    const id = `kanban-lane-${safeId(name)}`;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "lane", id, name: name.trim() }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Swimlane konnte nicht angelegt werden.");
      return;
    }
    await refreshKanbanConfig();
  }

  async function renameColumn(col: KanbanColumn) {
    if (col.id === KANBAN_BACKLOG_ID) return;
    const name = window.prompt("Neuer Spaltenname:", col.name);
    if (!name?.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "column", id: col.id, name: name.trim() }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Umbenennen fehlgeschlagen.");
      return;
    }
    await refreshKanbanConfig();
  }

  async function deleteColumn(col: KanbanColumn) {
    if (col.id === KANBAN_BACKLOG_ID) return;
    if (!confirm(`Spalte „${col.name}“ löschen? Aufgaben wandern in Backlog.`)) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/kanban?type=column&id=${encodeURIComponent(col.id)}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Löschen fehlgeschlagen.");
      return;
    }
    await refreshKanbanConfig();
    await refresh();
  }

  async function renameLane(lane: KanbanLane) {
    if (lane.id === KANBAN_DEFAULT_LANE_ID) return;
    const name = window.prompt("Neuer Swimlane-Name:", lane.name);
    if (!name?.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "lane", id: lane.id, name: name.trim() }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Umbenennen fehlgeschlagen.");
      return;
    }
    await refreshKanbanConfig();
  }

  async function deleteLane(lane: KanbanLane) {
    if (lane.id === KANBAN_DEFAULT_LANE_ID) return;
    if (!confirm(`Swimlane „${lane.name}“ löschen? Aufgaben wandern in „Standard“.`)) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/kanban?type=lane&id=${encodeURIComponent(lane.id)}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Löschen fehlgeschlagen.");
      return;
    }
    await refreshKanbanConfig();
    await refresh();
  }

  function taskPath(task: Task): string {
    const byId = new Map(active.map((t) => [t.id, t]));
    const parts: string[] = [];
    let cur: Task | undefined = task;
    while (cur) {
      parts.unshift(cur.title);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return parts.join(" › ");
  }

  useEffect(() => {
    void refreshKanbanConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return (
    <div className="card">
      <h2>Kanban</h2>
      <div className="row" style={{ marginBottom: 10 }}>
        <button type="button" onClick={createColumn} disabled={busy}>
          + Spalte
        </button>
        <button type="button" className="secondary" onClick={createLane} disabled={busy}>
          + Swimlane
        </button>
        <button type="button" className="secondary" onClick={() => { void refreshKanbanConfig(); void refresh(); }} disabled={busy}>
          Aktualisieren
        </button>
        {message ? <span style={{ opacity: 0.9 }}>{message}</span> : null}
      </div>

      {columns.length === 0 || lanes.length === 0 ? (
        <p>Kanban wird initialisiert…</p>
      ) : (
        <div className="kanban-board" style={{ "--kanban-cols": String(columns.length) } as CSSProperties}>
          <div className="kanban-board__head">
            <div className="kanban-board__corner" />
            {columns.map((c) => (
              <div key={c.id} className="kanban-board__colhead">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{c.name}</strong>
                  <div className="row">
                    {c.id !== KANBAN_BACKLOG_ID ? (
                      <>
                        <button type="button" className="secondary" onClick={() => renameColumn(c)} disabled={busy}>
                          Umbenennen
                        </button>
                        <button type="button" className="secondary" onClick={() => deleteColumn(c)} disabled={busy}>
                          Löschen
                        </button>
                      </>
                    ) : (
                      <span style={{ opacity: 0.7, fontSize: "0.8rem" }}>fix</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {lanes.map((lane) => (
            <div key={lane.id} className="kanban-board__lane">
              <div className="kanban-board__lanehead">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{lane.name}</strong>
                  <div className="row">
                    {lane.id !== KANBAN_DEFAULT_LANE_ID ? (
                      <>
                        <button type="button" className="secondary" onClick={() => renameLane(lane)} disabled={busy}>
                          Umbenennen
                        </button>
                        <button type="button" className="secondary" onClick={() => deleteLane(lane)} disabled={busy}>
                          Löschen
                        </button>
                      </>
                    ) : (
                      <span style={{ opacity: 0.7, fontSize: "0.8rem" }}>fix</span>
                    )}
                  </div>
                </div>
              </div>

              {columns.map((col) => {
                const key = cellKey(lane.id, col.id);
                const isBacklogCol = col.id === KANBAN_BACKLOG_ID;
                const cellTasks = active.filter(
                  (t) => (t.kanbanColumnId || KANBAN_BACKLOG_ID) === col.id && (t.swimlaneId || KANBAN_DEFAULT_LANE_ID) === lane.id,
                );
                return (
                  <div
                    key={key}
                    className="kanban-cell"
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      const tid = e.dataTransfer.getData("text/taskId") || dragTaskId;
                      if (!tid) return;
                      await patchTask(tid, { kanbanColumnId: col.id, swimlaneId: lane.id });
                      setDragTaskId(null);
                    }}
                  >
                    <div className="kanban-cell__composer">
                      {isBacklogCol ? (
                        <div className="kanban-column__add">
                          <input
                            placeholder="+ Karte"
                            value={newByCell[key] || ""}
                            onChange={(e) => setNewByCell((prev) => ({ ...prev, [key]: e.target.value }))}
                          />
                          <button type="button" onClick={() => addCard(lane.id, col.id)} disabled={busy}>
                            Hinzufügen
                          </button>
                        </div>
                      ) : (
                        <p className="kanban-cell__hint">Neue Karten werden im Backlog angelegt.</p>
                      )}
                    </div>

                    <div className="kanban-cards">
                      {cellTasks.map((task) => (
                        <div
                          key={task.id}
                          className="kanban-card"
                          draggable
                          onDragStart={(e) => {
                            setDragTaskId(task.id);
                            e.dataTransfer.setData("text/taskId", task.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => setDragTaskId(null)}
                        >
                          <div className="kanban-card__title" title={taskPath(task)}>
                            {taskPath(task)}
                          </div>
                          <div className="kanban-card__meta">
                            Priorität: {task.priority} {task.dueDate ? `· Frist: ${task.dueDate}` : ""}
                          </div>
                          <div className="row">
                            <button type="button" className="secondary" onClick={() => openTask(task.id)}>
                              Karte öffnen
                            </button>
                            <button type="button" className="secondary" onClick={() => addSubtask(task)}>
                              + Unteraufgabe
                            </button>
                            <button type="button" className="secondary" onClick={() => patchTask(task.id, { archived: true, done: true })}>
                              Abschließen (Archiv)
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
