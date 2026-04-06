"use client";

import { useCallback, useMemo, useState, type ReactElement } from "react";
import {
  BarGeom,
  buildGanttTree,
  buildMonthSegments,
  collectGanttRows,
  dayIndexToDate,
  FlatGanttFields,
  GanttTaskNode,
  todayYmd,
  ymdToDayIndex,
} from "@/lib/gantt-utils";

const ROW_H = 52;
const LEFT_W = 440;
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
  dependsOnTaskIds?: string[] | null;
  assigneeIds?: string[] | null;
  attachments?: Array<{ id: string; name: string; size: number; type: string; dataUrl: string }> | null;
  links?: Array<{ id: string; url: string; label: string }> | null;
  history?: Array<{ id: string; entryDate: string; participantId: string | null; text: string; createdAt: string }> | null;
};

type Props = {
  projectId: string;
  initialTasks: Task[];
  initialOpenTaskId?: string | null;
  initialProtocolLinksByTaskId: Record<
    string,
    Array<{ rowId: string; sessionId: string; sessionDate: string; groupId: string; groupName: string }>
  >;
};

type Scale = "day" | "month" | "year";

function descendantsOf(taskId: string, tasks: Task[]): Set<string> {
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

function toFlatFields(t: Task): FlatGanttFields {
  const raw = t.dependsOnTaskIds;
  const deps = Array.isArray(raw) ? raw : [];
  return {
    id: t.id,
    parentId: t.parentId,
    title: t.title,
    startDate: t.startDate,
    dueDate: t.dueDate,
    done: t.done,
    dependsOnTaskIds: deps,
    kanbanColumnId: t.kanbanColumnId,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

export default function ProjectGantt({
  projectId,
  initialTasks,
  initialOpenTaskId,
  initialProtocolLinksByTaskId,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [protocolLinksByTaskId, setProtocolLinksByTaskId] = useState<
    Record<string, Array<{ rowId: string; sessionId: string; sessionDate: string; groupId: string; groupName: string }>>
  >(initialProtocolLinksByTaskId);
  const [scale, setScale] = useState<Scale>("month");
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [newTitle, setNewTitle] = useState("");
  const [modalId, setModalId] = useState<string | null>(initialOpenTaskId || null);
  const [depSearch, setDepSearch] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [historyDate, setHistoryDate] = useState("");
  const [historyText, setHistoryText] = useState("");

  const active = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);

  function openGanttModal(id: string) {
    setDepSearch("");
    setModalError(null);
    setLinkUrl("");
    setLinkLabel("");
    setHistoryDate("");
    setHistoryText("");
    setModalId(id);
  }

  const refresh = useCallback(async () => {
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
  }, [projectId]);

  const tree = useMemo(() => {
    const flat = active.map(toFlatFields);
    return buildGanttTree(flat);
  }, [active]);

  const rows = useMemo(() => {
    const out: { node: GanttTaskNode; depth: number }[] = [];
    collectGanttRows(tree, openMap, out);
    return out;
  }, [tree, openMap]);

  const { minDay, maxDay, dayCount } = useMemo(() => {
    let min: number | null = null;
    let max: number | null = null;
    for (const r of rows) {
      const n = r.node;
      let s = ymdToDayIndex(n.startDate);
      let d = ymdToDayIndex(n.dueDate);
      if (s === null && d === null) continue;
      if (s === null) s = d;
      if (d === null) d = s;
      if (s === null || d === null) continue;
      if (min === null || s < min) min = s;
      if (max === null || d > max) max = d;
    }
    if (min === null || max === null) {
      const today = ymdToDayIndex(todayYmd())!;
      return { minDay: today - 3, maxDay: today + 14, dayCount: 18 };
    }
    return { minDay: min, maxDay: max, dayCount: Math.max(1, max - min + 1) };
  }, [rows]);

  const dayPx = scale === "day" ? 36 : scale === "month" ? 14 : 4;
  const laneMin = scale === "day" ? 1800 : scale === "month" ? 1400 : 1000;
  const laneWidth = Math.max(laneMin, dayCount * dayPx);

  const monthSegments = useMemo(
    () => buildMonthSegments(minDay, maxDay, dayCount, scale),
    [minDay, maxDay, dayCount, scale],
  );

  const barGeomById = useMemo(() => {
    const map: Record<string, BarGeom> = {};
    for (let r = 0; r < rows.length; r++) {
      const node = rows[r].node;
      let sDay = ymdToDayIndex(node.startDate);
      let dDay = ymdToDayIndex(node.dueDate);
      if (sDay === null && dDay === null) {
        const t = ymdToDayIndex(todayYmd())!;
        sDay = t;
        dDay = t;
      } else if (sDay === null) {
        sDay = dDay;
      } else if (dDay === null) {
        dDay = sDay;
      }
      const leftPx = ((sDay! - minDay) / dayCount) * laneWidth;
      const widthPx = Math.max(6, ((dDay! - sDay! + 1) / dayCount) * laneWidth);
      map[node.id] = { x1: leftPx, x2: leftPx + widthPx, y: r * ROW_H + 25, row: r };
    }
    return map;
  }, [rows, minDay, dayCount, laneWidth]);

  const modalTask = modalId ? tasks.find((t) => t.id === modalId) : null;

  const depBlockList = useMemo(() => {
    if (!modalTask) return [];
    const desc = descendantsOf(modalTask.id, active);
    const q = depSearch.trim().toLowerCase();
    return active.filter((t) => {
      if (t.id === modalTask.id) return false;
      if (desc.has(t.id)) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q);
    });
  }, [modalTask, active, depSearch]);

  async function patchTask(taskId: string, patch: Partial<Task>) {
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
    await refresh();
  }

  function toggleOpen(id: string) {
    setOpenMap((prev) => ({ ...prev, [id]: prev[id] === false ? true : false }));
  }

  function toggleDep(depId: string) {
    if (!modalTask) return;
    const cur = Array.isArray(modalTask.dependsOnTaskIds) ? modalTask.dependsOnTaskIds : [];
    const next = cur.includes(depId) ? cur.filter((x) => x !== depId) : [...cur, depId];
    void patchTask(modalTask.id, { dependsOnTaskIds: next });
  }

  async function addModalAttachment(fileList: FileList | null) {
    if (!modalTask || !fileList || fileList.length === 0) return;
    const current = modalTask.attachments || [];
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
    await patchTask(modalTask.id, { attachments: next });
  }

  async function addModalLink() {
    if (!modalTask) return;
    const url = linkUrl.trim();
    if (!url || !/^https?:\/\//i.test(url)) return;
    const links = modalTask.links || [];
    const next = [...links, { id: crypto.randomUUID(), url, label: linkLabel.trim() || url }];
    await patchTask(modalTask.id, { links: next });
    setLinkUrl("");
    setLinkLabel("");
  }

  async function addModalHistoryEntry() {
    if (!modalTask) return;
    const text = historyText.trim();
    if (!text) return;
    const entryDate = historyDate || new Date().toISOString().slice(0, 10);
    const history = modalTask.history || [];
    const next = [
      ...history,
      { id: crypto.randomUUID(), entryDate, participantId: null, text, createdAt: new Date().toISOString() },
    ];
    await patchTask(modalTask.id, { history: next });
    setHistoryDate("");
    setHistoryText("");
  }

  const headerH = 34 + (scale === "day" ? 28 : 0);

  const dayCells =
    scale === "day"
      ? (() => {
          const cells: ReactElement[] = [];
          let dayCur = minDay;
          while (dayCur <= maxDay) {
            const dayDt = dayIndexToDate(dayCur);
            cells.push(
              <div
                key={dayCur}
                className="gantt-day-cell"
                style={{ width: Math.max(26, (1 / dayCount) * laneWidth) }}
                title={new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(dayDt)}
              >
                {dayDt.getDate()}
              </div>,
            );
            dayCur++;
          }
          return cells;
        })()
      : null;

  return (
    <div className="card gantt-card">
      <h2>Projektplan (Gantt)</h2>
      <div className="gantt-toolbar">
        <div className="row">
          <button type="button" className={scale === "day" ? "" : "secondary"} onClick={() => setScale("day")}>
            Tag
          </button>
          <button type="button" className={scale === "month" ? "" : "secondary"} onClick={() => setScale("month")}>
            Monat
          </button>
          <button type="button" className={scale === "year" ? "" : "secondary"} onClick={() => setScale("year")}>
            Jahr
          </button>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <input
            placeholder="Neue Hauptaufgabe…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <button
            type="button"
            onClick={async () => {
              const t = newTitle.trim();
              if (!t) return;
              await fetch(`/api/projects/${projectId}/tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: t }),
              });
              setNewTitle("");
              await refresh();
            }}
          >
            Anlegen
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="gantt-empty">Noch keine Aufgaben für den Projektplan.</p>
      ) : (
        <div className="gantt-body">
          <div className="gantt-split">
            <div className="gantt-left-col" style={{ width: LEFT_W }}>
              <div className="gantt-left-spacer" style={{ height: headerH }} />
              {rows.map((row) => {
                const { node, depth } = row;
                const hasKids = node.children.length > 0;
                const colLabel = KANBAN_COLUMNS.find((c) => c.id === node.kanbanColumnId)?.name ?? node.kanbanColumnId;
                return (
                  <div key={node.id} className="gantt-left-row" style={{ minHeight: ROW_H }}>
                    <div className="gantt-task" style={{ paddingLeft: depth * 14 }}>
                      {hasKids ? (
                        <button
                          type="button"
                          className="gantt-toggle secondary"
                          aria-label={openMap[node.id] === false ? "Ausklappen" : "Einklappen"}
                          onClick={() => toggleOpen(node.id)}
                        >
                          {openMap[node.id] === false ? "▶" : "▼"}
                        </button>
                      ) : (
                        <span className="gantt-toggle-spacer" />
                      )}
                      <button type="button" className="gantt-title-btn" onClick={() => openGanttModal(node.id)}>
                        {node.title || "(ohne Titel)"}
                      </button>
                      <span className="gantt-kanban-pill">{colLabel}</span>
                      <button
                        type="button"
                        className="secondary gantt-mini"
                        onClick={async () => {
                          const t = window.prompt("Titel der Unteraufgabe:");
                          if (!t?.trim()) return;
                          await fetch(`/api/projects/${projectId}/tasks`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ title: t.trim(), parentId: node.id }),
                          });
                          await refresh();
                          setOpenMap((m) => ({ ...m, [node.id]: true }));
                        }}
                      >
                        + Unteraufgabe
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="gantt-right-scroll">
              <div className="gantt-right-inner" style={{ width: laneWidth, minHeight: headerH + rows.length * ROW_H }}>
                <div className="gantt-months" style={{ width: laneWidth, height: 34 }}>
                  {monthSegments.map((seg, i) => (
                    <div
                      key={i}
                      className="gantt-month-cell"
                      style={{ width: Math.max(40, seg.widthFrac * laneWidth) }}
                    >
                      {seg.label}
                    </div>
                  ))}
                </div>
                {scale === "day" ? (
                  <div className="gantt-days" style={{ width: laneWidth, height: 28 }}>
                    {dayCells}
                  </div>
                ) : null}

                {rows.map((row) => {
                  const { node } = row;
                  const geom = barGeomById[node.id];
                  return (
                    <div key={node.id} className="gantt-lane-row" style={{ height: ROW_H }}>
                      <div className="gantt-lane" style={{ width: laneWidth }}>
                        <button
                          type="button"
                          className={`gantt-bar${node.done ? " gantt-bar--done" : ""}`}
                          style={{
                            left: geom?.x1 ?? 0,
                            width: Math.max(6, (geom?.x2 ?? 6) - (geom?.x1 ?? 0)),
                          }}
                          title={`${node.startDate ?? "—"} – ${node.dueDate ?? "—"}`}
                          onClick={() => openGanttModal(node.id)}
                        />
                      </div>
                    </div>
                  );
                })}

                <svg
                  className="gantt-deps-svg"
                  width={laneWidth + 12}
                  height={rows.length * ROW_H + 6}
                  style={{ position: "absolute", left: 0, top: headerH, pointerEvents: "none" }}
                  aria-hidden
                >
                  {rows.map((row) => {
                    const target = row.node;
                    const deps = target.dependsOnTaskIds || [];
                    const tgGeom = barGeomById[target.id];
                    if (!tgGeom) return null;
                    return deps.map((depId) => {
                      const srcGeom = barGeomById[depId];
                      if (!srcGeom) return null;
                      const x1 = srcGeom.x2 + 2;
                      const y1 = srcGeom.y;
                      const x2 = tgGeom.x1 - 2;
                      const y2 = tgGeom.y;
                      const cx = x1 + Math.max(10, (x2 - x1) * 0.45);
                      const d = `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
                      return (
                        <path
                          key={`${target.id}-${depId}`}
                          d={d}
                          fill="none"
                          stroke="rgba(96,165,250,0.9)"
                          strokeWidth={1.5}
                        />
                      );
                    });
                  })}
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalTask ? (
        <div className="gantt-modal-overlay" role="dialog" aria-modal onClick={() => setModalId(null)}>
          <div className="gantt-modal" onClick={(e) => e.stopPropagation()} key={modalTask.id}>
            <div className="gantt-modal__head">
              <h3>Aufgabe bearbeiten</h3>
              <button type="button" className="secondary" onClick={() => setModalId(null)}>
                Schließen
              </button>
            </div>
            {modalError ? <p className="gantt-modal-error">{modalError}</p> : null}
            <label className="gantt-modal-label">Titel</label>
            <input
              defaultValue={modalTask.title}
              onBlur={(e) => patchTask(modalTask.id, { title: e.target.value.trim() || modalTask.title })}
            />
            <div className="row" style={{ marginTop: 8 }}>
              <div>
                <label className="gantt-modal-label">Beginn</label>
                <input
                  type="date"
                  defaultValue={modalTask.startDate || ""}
                  onBlur={(e) => patchTask(modalTask.id, { startDate: e.target.value || null })}
                />
              </div>
              <div>
                <label className="gantt-modal-label">Frist</label>
                <input
                  type="date"
                  defaultValue={modalTask.dueDate || ""}
                  onBlur={(e) => patchTask(modalTask.id, { dueDate: e.target.value || null })}
                />
              </div>
            </div>
            <label className="gantt-modal-label">Kanban-Spalte</label>
            <select
              defaultValue={modalTask.kanbanColumnId}
              onChange={(e) => {
                const v = e.target.value;
                void patchTask(modalTask.id, { kanbanColumnId: v });
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
              defaultValue={modalTask.description || ""}
              onBlur={(e) => patchTask(modalTask.id, { description: e.target.value })}
            />
            <label className="gantt-modal-label">Zuerst erledigen (Vorgänger)</label>
            <input
              placeholder="Vorgänger suchen…"
              value={depSearch}
              onChange={(e) => setDepSearch(e.target.value)}
            />
            <div className="gantt-dep-list">
              {depBlockList.map((t) => {
                const checked = (modalTask.dependsOnTaskIds || []).includes(t.id);
                return (
                  <label key={t.id} className="gantt-dep-item">
                    <input type="checkbox" checked={checked} onChange={() => toggleDep(t.id)} />
                    <span>{t.title}</span>
                  </label>
                );
              })}
            </div>
            <label className="gantt-modal-label">In Sitzungen verwendet</label>
            <div className="gantt-dep-list">
              {(protocolLinksByTaskId[modalTask.id] || []).length === 0 ? (
                <div className="gantt-dep-item">Keine Protokollzuordnung.</div>
              ) : (
                (protocolLinksByTaskId[modalTask.id] || []).map((pl) => (
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
            <div className="gantt-dep-list">
              {(modalTask.attachments || []).length === 0 ? (
                <div className="gantt-dep-item">Keine Anhänge.</div>
              ) : (
                (modalTask.attachments || []).map((a) => (
                  <div key={a.id} className="task-rich__row">
                    <a href={a.dataUrl} download={a.name}>
                      {a.name}
                    </a>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        patchTask(modalTask.id, {
                          attachments: (modalTask.attachments || []).filter((x) => x.id !== a.id),
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
            <div className="row">
              <input placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
              <input placeholder="Bezeichnung (optional)" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
              <button type="button" onClick={() => void addModalLink()}>
                + Link
              </button>
            </div>
            <div className="gantt-dep-list">
              {(modalTask.links || []).length === 0 ? (
                <div className="gantt-dep-item">Keine Links.</div>
              ) : (
                (modalTask.links || []).map((l) => (
                  <div key={l.id} className="task-rich__row">
                    <a href={l.url} target="_blank" rel="noreferrer">
                      {l.label || l.url}
                    </a>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => patchTask(modalTask.id, { links: (modalTask.links || []).filter((x) => x.id !== l.id) })}
                    >
                      Entfernen
                    </button>
                  </div>
                ))
              )}
            </div>
            <label className="gantt-modal-label">Historie</label>
            <div className="row">
              <input type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} />
              <input placeholder="Eintragtext" value={historyText} onChange={(e) => setHistoryText(e.target.value)} />
              <button type="button" onClick={() => void addModalHistoryEntry()}>
                + Eintrag
              </button>
            </div>
            <div className="gantt-dep-list">
              {(modalTask.history || []).length === 0 ? (
                <div className="gantt-dep-item">Keine Einträge.</div>
              ) : (
                [...(modalTask.history || [])]
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
                        onClick={() =>
                          patchTask(modalTask.id, { history: (modalTask.history || []).filter((x) => x.id !== h.id) })
                        }
                      >
                        Löschen
                      </button>
                    </div>
                  ))
              )}
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button type="button" className="secondary" onClick={() => patchTask(modalTask.id, { done: !modalTask.done })}>
                {modalTask.done ? "Als offen markieren" : "Als erledigt markieren"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
