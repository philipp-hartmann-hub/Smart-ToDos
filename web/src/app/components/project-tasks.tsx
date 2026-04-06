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
  attachments?: Array<{ id: string; name: string; size: number; type: string; dataUrl: string }> | null;
  links?: Array<{ id: string; url: string; label: string }> | null;
  history?: Array<{ id: string; entryDate: string; participantId: string | null; text: string; createdAt: string }> | null;
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
  initialProtocolLinksByTaskId: Record<
    string,
    Array<{ rowId: string; sessionId: string; sessionDate: string; groupId: string; groupName: string }>
  >;
};

function memberLabel(m: ProjectMember) {
  return `${m.firstName} ${m.lastName} (${m.username})`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

export default function ProjectTasks({
  projectId,
  initialTasks,
  projectMembers,
  initialProtocolLinksByTaskId,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [protocolLinksByTaskId, setProtocolLinksByTaskId] = useState<
    Record<string, Array<{ rowId: string; sessionId: string; sessionDate: string; groupId: string; groupName: string }>>
  >(initialProtocolLinksByTaskId);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<ListFilterState>(defaultListFilterState);
  const [mainTaskFormOpen, setMainTaskFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const active = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);
  const archived = useMemo(() => tasks.filter((t) => t.archived), [tasks]);

  const tree = useMemo(() => buildTaskTree(active), [active]);

  const filteredTree = useMemo(() => filterTaskTree(tree, filter), [tree, filter]);

  async function refresh() {
    const [resTasks, resLinks] = await Promise.all([
      fetch(`/api/projects/${projectId}/tasks`, { cache: "no-store" }),
      fetch(`/api/projects/${projectId}/task-protocol-links`, { cache: "no-store" }),
    ]);
    if (resTasks.ok) {
      const data = (await resTasks.json()) as { tasks: Task[] };
      setTasks(data.tasks);
    }
    if (resLinks.ok) {
      const d = (await resLinks.json()) as {
        linksByTaskId: Record<
          string,
          Array<{ rowId: string; sessionId: string; sessionDate: string; groupId: string; groupName: string }>
        >;
      };
      setProtocolLinksByTaskId(d.linksByTaskId || {});
    }
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
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [linkLabel, setLinkLabel] = useState("");
    const [historyDate, setHistoryDate] = useState("");
    const [historyParticipantId, setHistoryParticipantId] = useState("");
    const [historyText, setHistoryText] = useState("");
    const [subtaskFormOpen, setSubtaskFormOpen] = useState(false);
    const [childrenCollapsed, setChildrenCollapsed] = useState(false);
    const colLabel = KANBAN_COLUMNS.find((c) => c.id === task.kanbanColumnId)?.name ?? task.kanbanColumnId;
    const assignees = task.assigneeIds || [];
    const attachments = task.attachments || [];
    const links = task.links || [];
    const history = (task.history || []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const protocolLinks = protocolLinksByTaskId[task.id] || [];

    function toggleAssignee(userId: string, checked: boolean) {
      const next = checked
        ? [...new Set([...assignees, userId])]
        : assignees.filter((x) => x !== userId);
      void patchTask(task.id, { assigneeIds: next });
    }

    async function handleAddAttachment(fileList: FileList | null) {
      if (!fileList || fileList.length === 0) return;
      const next = [...attachments];
      for (const file of Array.from(fileList)) {
        if (file.size > 5 * 1024 * 1024) continue;
        const dataUrl = await readFileAsDataUrl(file);
        next.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          dataUrl,
        });
      }
      await patchTask(task.id, { attachments: next });
    }

    async function addLink() {
      const url = linkUrl.trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) return;
      const next = [
        ...links,
        {
          id: crypto.randomUUID(),
          url,
          label: linkLabel.trim() || url,
        },
      ];
      await patchTask(task.id, { links: next });
      setLinkUrl("");
      setLinkLabel("");
    }

    async function addHistoryEntry() {
      const text = historyText.trim();
      if (!text) return;
      const entryDate = historyDate || new Date().toISOString().slice(0, 10);
      const next = [
        ...(task.history || []),
        {
          id: crypto.randomUUID(),
          entryDate,
          participantId: historyParticipantId || null,
          text,
          createdAt: new Date().toISOString(),
        },
      ];
      await patchTask(task.id, { history: next });
      setHistoryDate("");
      setHistoryParticipantId("");
      setHistoryText("");
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
          <button className="secondary" onClick={() => setDetailsOpen((v) => !v)}>
            {detailsOpen ? "Details verbergen" : "Details anzeigen"}
          </button>
        </div>
        {detailsOpen ? (
          <>
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
            <div className="task-rich">
              <div className="task-rich__block">
                <strong>In Sitzungen verwendet ({protocolLinks.length})</strong>
                {protocolLinks.length === 0 ? <p className="task-rich__empty">Keine Protokollzuordnung.</p> : null}
                {protocolLinks.length > 0 ? (
                  <details className="task-rich__popover">
                    <summary>Sitzungen anzeigen</summary>
                    <div className="task-rich__popover-list">
                      {protocolLinks.map((pl) => (
                        <div key={`${pl.rowId}-${pl.sessionId}`} className="task-rich__row">
                          <span>
                            {pl.groupName} · {pl.sessionDate}
                          </span>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() =>
                              window.location.assign(
                                `/projects/${projectId}?view=protocols&focusGroupId=${encodeURIComponent(pl.groupId)}&focusSessionId=${encodeURIComponent(pl.sessionId)}`,
                              )
                            }
                          >
                            Zur Sitzung
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
              <div className="task-rich__block">
                <strong>Anhänge</strong>
                <input type="file" multiple onChange={(e) => void handleAddAttachment(e.target.files)} />
                {attachments.length === 0 ? <p className="task-rich__empty">Keine Anhänge.</p> : null}
                {attachments.map((a) => (
                  <div key={a.id} className="task-rich__row">
                    <a href={a.dataUrl} download={a.name}>
                      {a.name}
                    </a>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => patchTask(task.id, { attachments: attachments.filter((x) => x.id !== a.id) })}
                    >
                      Entfernen
                    </button>
                  </div>
                ))}
              </div>
              <div className="task-rich__block">
                <strong>Links</strong>
                <div className="row">
                  <input placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
                  <input placeholder="Bezeichnung (optional)" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
                  <button type="button" onClick={() => void addLink()}>
                    + Link
                  </button>
                </div>
                {links.length === 0 ? <p className="task-rich__empty">Keine Links.</p> : null}
                {links.map((l) => (
                  <div key={l.id} className="task-rich__row">
                    <a href={l.url} target="_blank" rel="noreferrer">
                      {l.label || l.url}
                    </a>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => patchTask(task.id, { links: links.filter((x) => x.id !== l.id) })}
                    >
                      Entfernen
                    </button>
                  </div>
                ))}
              </div>
              <div className="task-rich__block">
                <strong>Historie</strong>
                <div className="row">
                  <input type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} />
                  <select value={historyParticipantId} onChange={(e) => setHistoryParticipantId(e.target.value)}>
                    <option value="">Ohne Person</option>
                    {projectMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {memberLabel(m)}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Eintragtext"
                    value={historyText}
                    onChange={(e) => setHistoryText(e.target.value)}
                  />
                  <button type="button" onClick={() => void addHistoryEntry()}>
                    + Eintrag
                  </button>
                </div>
                {history.length === 0 ? <p className="task-rich__empty">Keine Einträge.</p> : null}
                {history.map((h) => {
                  const p = h.participantId ? projectMembers.find((x) => x.id === h.participantId) : null;
                  return (
                    <div key={h.id} className="task-rich__history">
                      <div>
                        <strong>{h.entryDate}</strong> {p ? `· ${memberLabel(p)}` : ""}
                      </div>
                      <div>{h.text}</div>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => patchTask(task.id, { history: (task.history || []).filter((x) => x.id !== h.id) })}
                      >
                        Löschen
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
        <div className="row" style={{ marginTop: 8 }}>
          <button type="button" className="secondary" onClick={() => setSubtaskFormOpen((v) => !v)}>
            {subtaskFormOpen ? "Unteraufgabe-Formular schließen" : "Unteraufgabe hinzufügen"}
          </button>
        </div>
        {subtaskFormOpen ? (
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
                setSubtaskFormOpen(false);
                await refresh();
              }}
            >
              + Unteraufgabe
            </button>
          </div>
        ) : null}
        {node.children.length > 0 ? (
          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" className="secondary" onClick={() => setChildrenCollapsed((v) => !v)}>
              {childrenCollapsed
                ? `${node.children.length} Unteraufgaben einblenden`
                : `${node.children.length} Unteraufgaben ausblenden`}
            </button>
          </div>
        ) : null}
        {!childrenCollapsed
          ? node.children.map((s) => <TaskNode key={s.id} node={s as TaskNode<Task>} depth={depth + 1} />)
          : null}
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Aufgaben</h2>
      <div className="row">
        <button type="button" className="secondary" onClick={() => setMainTaskFormOpen((v) => !v)}>
          {mainTaskFormOpen ? "Formular schließen" : "Hauptaufgabe anlegen"}
        </button>
      </div>
      {mainTaskFormOpen ? (
        <div className="row" style={{ marginTop: 8 }}>
          <input placeholder="Neue Aufgabe..." value={title} onChange={(e) => setTitle(e.target.value)} />
          <button
            onClick={async () => {
              await createTask(null);
              setMainTaskFormOpen(false);
            }}
            disabled={loading}
          >
            Aufgabe anlegen
          </button>
        </div>
      ) : null}

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
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Archiv</h3>
          <button type="button" className="secondary" onClick={() => setArchiveOpen((v) => !v)}>
            {archiveOpen ? "Archiv ausblenden" : "Archiv anzeigen"}
          </button>
        </div>
        {archiveOpen ? (
          <div style={{ marginTop: 8 }}>
            {archived.length === 0 ? <p>Kein Archivinhalt.</p> : null}
            {archived.map((task) => (
              <div key={task.id} className="task-row" style={{ marginBottom: 8 }}>
                <strong>{task.title}</strong>
                <button
                  className="secondary"
                  onClick={() =>
                    window.location.assign(`/projects/${projectId}?view=gantt&openTaskId=${encodeURIComponent(task.id)}`)
                  }
                >
                  Öffnen
                </button>
                <button className="secondary" onClick={() => patchTask(task.id, { archived: false, done: false })}>
                  Wiederherstellen
                </button>
                <button className="secondary" onClick={() => deleteTask(task.id)}>
                  Endgültig löschen
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
