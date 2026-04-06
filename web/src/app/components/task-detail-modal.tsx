"use client";

import { useMemo, useState } from "react";

const KANBAN_COLUMNS = [
  { id: "kanban-backlog", name: "Backlog" },
  { id: "kanban-in-progress", name: "In Bearbeitung" },
  { id: "kanban-waiting-feedback", name: "Warten auf Rückmeldung" },
  { id: "kanban-done", name: "Abgeschlossen" },
];

export type TaskDetailTask = {
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
  dependsOnTaskIds?: string[] | null;
  assigneeIds?: string[] | null;
  attachments?: Array<{ id: string; name: string; size: number; type: string; dataUrl: string }> | null;
  links?: Array<{ id: string; url: string; label: string }> | null;
  history?: Array<{ id: string; entryDate: string; participantId: string | null; text: string; createdAt: string }> | null;
};

type ProtocolLink = {
  rowId: string;
  sessionId: string;
  sessionDate: string;
  groupId: string;
  groupName: string;
};

function descendantsOf(taskId: string, tasks: TaskDetailTask[]): Set<string> {
  const byParent = new Map<string | null, string[]>();
  for (const t of tasks) {
    const p = t.parentId ?? null;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(t.id);
  }
  const out = new Set<string>();
  const q = [...(byParent.get(taskId) || [])];
  while (q.length) {
    const id = q.shift()!;
    out.add(id);
    const kids = byParent.get(id) || [];
    for (const k of kids) q.push(k);
  }
  return out;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

type Props = {
  projectId: string;
  task: TaskDetailTask;
  activeTasks: TaskDetailTask[];
  protocolLinksByTaskId: Record<string, ProtocolLink[]>;
  onClose: () => void;
  onPatched: () => void | Promise<void>;
};

export default function TaskDetailModal({ projectId, task, activeTasks, protocolLinksByTaskId, onClose, onPatched }: Props) {
  const [depSearch, setDepSearch] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [historyDate, setHistoryDate] = useState("");
  const [historyText, setHistoryText] = useState("");

  const depBlockList = useMemo(() => {
    const desc = descendantsOf(task.id, activeTasks);
    const q = depSearch.trim().toLowerCase();
    return activeTasks.filter((t) => {
      if (t.id === task.id) return false;
      if (desc.has(t.id)) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q);
    });
  }, [task.id, activeTasks, depSearch]);

  async function patchTask(taskId: string, patch: Partial<TaskDetailTask>) {
    setModalError(null);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setModalError(typeof j.error === "string" ? j.error : "Speichern fehlgeschlagen.");
      return;
    }
    await onPatched();
  }

  function toggleDep(depId: string) {
    const cur = Array.isArray(task.dependsOnTaskIds) ? task.dependsOnTaskIds : [];
    const next = cur.includes(depId) ? cur.filter((x) => x !== depId) : [...cur, depId];
    void patchTask(task.id, { dependsOnTaskIds: next });
  }

  async function addModalAttachment(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const current = task.attachments || [];
    const next = [...current];
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

  async function addModalLink() {
    const url = linkUrl.trim();
    if (!url || !/^https?:\/\//i.test(url)) return;
    const links = task.links || [];
    const next = [...links, { id: crypto.randomUUID(), url, label: linkLabel.trim() || url }];
    await patchTask(task.id, { links: next });
    setLinkUrl("");
    setLinkLabel("");
  }

  async function addModalHistoryEntry() {
    const text = historyText.trim();
    if (!text) return;
    const entryDate = historyDate || new Date().toISOString().slice(0, 10);
    const history = task.history || [];
    const next = [
      ...history,
      { id: crypto.randomUUID(), entryDate, participantId: null, text, createdAt: new Date().toISOString() },
    ];
    await patchTask(task.id, { history: next });
    setHistoryDate("");
    setHistoryText("");
  }

  return (
    <div className="gantt-modal-overlay" role="dialog" aria-modal onClick={onClose}>
      <div className="gantt-modal task-detail-modal" onClick={(e) => e.stopPropagation()} key={task.id}>
        <div className="gantt-modal__head">
          <h3>Aufgabe bearbeiten</h3>
          <button type="button" className="secondary" onClick={onClose}>
            Schließen
          </button>
        </div>
        {modalError ? <p className="gantt-modal-error">{modalError}</p> : null}
        <label className="gantt-modal-label">Titel</label>
        <input
          defaultValue={task.title}
          onBlur={(e) => patchTask(task.id, { title: e.target.value.trim() || task.title })}
        />
        <div className="row task-detail-modal__dates" style={{ marginTop: 8 }}>
          <div>
            <label className="gantt-modal-label">Beginn</label>
            <input
              type="date"
              defaultValue={task.startDate || ""}
              onBlur={(e) => patchTask(task.id, { startDate: e.target.value || null })}
            />
          </div>
          <div>
            <label className="gantt-modal-label">Frist</label>
            <input
              type="date"
              defaultValue={task.dueDate || ""}
              onBlur={(e) => patchTask(task.id, { dueDate: e.target.value || null })}
            />
          </div>
        </div>
        <label className="gantt-modal-label">Kanban-Spalte</label>
        <select
          defaultValue={task.kanbanColumnId}
          onChange={(e) => {
            const v = e.target.value;
            void patchTask(task.id, { kanbanColumnId: v });
          }}
        >
          {KANBAN_COLUMNS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="gantt-modal-label">Beschreibung</label>
        <textarea
          rows={3}
          defaultValue={task.description || ""}
          onBlur={(e) => patchTask(task.id, { description: e.target.value })}
        />
        <label className="gantt-modal-label">Zuerst erledigen (Vorgänger)</label>
        <input placeholder="Vorgänger suchen…" value={depSearch} onChange={(e) => setDepSearch(e.target.value)} />
        <div className="gantt-dep-list task-detail-modal__list">
          {depBlockList.map((t) => {
            const checked = (task.dependsOnTaskIds || []).includes(t.id);
            return (
              <label key={t.id} className="gantt-dep-item">
                <input type="checkbox" checked={checked} onChange={() => toggleDep(t.id)} />
                <span>{t.title}</span>
              </label>
            );
          })}
        </div>
        <label className="gantt-modal-label">In Sitzungen verwendet</label>
        <div className="gantt-dep-list task-detail-modal__list">
          {(protocolLinksByTaskId[task.id] || []).length === 0 ? (
            <div className="gantt-dep-item">Keine Protokollzuordnung.</div>
          ) : (
            (protocolLinksByTaskId[task.id] || []).map((pl) => (
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
            ))
          )}
        </div>
        <label className="gantt-modal-label">Anhänge</label>
        <input type="file" multiple onChange={(e) => void addModalAttachment(e.target.files)} />
        <div className="gantt-dep-list task-detail-modal__list">
          {(task.attachments || []).length === 0 ? (
            <div className="gantt-dep-item">Keine Anhänge.</div>
          ) : (
            (task.attachments || []).map((a) => (
              <div key={a.id} className="task-rich__row">
                <a href={a.dataUrl} download={a.name}>
                  {a.name}
                </a>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    patchTask(task.id, {
                      attachments: (task.attachments || []).filter((x) => x.id !== a.id),
                    })
                  }
                >
                  Entfernen
                </button>
              </div>
            ))
          )}
        </div>
        <label className="gantt-modal-label">Links</label>
        <div className="row task-detail-modal__triple-row">
          <input placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          <input placeholder="Bezeichnung (optional)" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
          <button type="button" onClick={() => void addModalLink()}>
            + Link
          </button>
        </div>
        <div className="gantt-dep-list task-detail-modal__list">
          {(task.links || []).length === 0 ? (
            <div className="gantt-dep-item">Keine Links.</div>
          ) : (
            (task.links || []).map((l) => (
              <div key={l.id} className="task-rich__row">
                <a href={l.url} target="_blank" rel="noreferrer">
                  {l.label || l.url}
                </a>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => patchTask(task.id, { links: (task.links || []).filter((x) => x.id !== l.id) })}
                >
                  Entfernen
                </button>
              </div>
            ))
          )}
        </div>
        <label className="gantt-modal-label">Historie</label>
        <div className="row task-detail-modal__triple-row">
          <input type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} />
          <input placeholder="Eintragtext" value={historyText} onChange={(e) => setHistoryText(e.target.value)} />
          <button type="button" onClick={() => void addModalHistoryEntry()}>
            + Eintrag
          </button>
        </div>
        <div className="gantt-dep-list task-detail-modal__list task-detail-modal__history-list">
          {(task.history || []).length === 0 ? (
            <div className="gantt-dep-item">Keine Einträge.</div>
          ) : (
            [...(task.history || [])]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((h) => (
                <div key={h.id} className="task-rich__history">
                  <div>
                    <strong>{h.entryDate}</strong>
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
              ))
          )}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="secondary" onClick={() => patchTask(task.id, { done: !task.done })}>
            {task.done ? "Als offen markieren" : "Als erledigt markieren"}
          </button>
        </div>
      </div>
    </div>
  );
}
