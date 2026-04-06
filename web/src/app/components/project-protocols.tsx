"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TaskDetailModal, { type TaskDetailTask } from "./task-detail-modal";

type Group = { id: string; name: string };
type Session = { id: string; groupId: string; date: string };
type Row = {
  id: string;
  sessionId: string;
  responsibleUserId: string | null;
  text: string;
  result: string;
  taskIds: string[];
};
type UserLite = { id: string; firstName: string; lastName: string; username: string };
type TaskLite = { id: string; title: string };

type Props = {
  projectId: string;
  projectMembers: UserLite[];
  initialTasks: TaskDetailTask[];
  initialProtocolLinksByTaskId: Record<
    string,
    Array<{ rowId: string; sessionId: string; sessionDate: string; groupId: string; groupName: string }>
  >;
};

function userLabel(u: UserLite) {
  return `${u.firstName} ${u.lastName} (${u.username})`;
}

function taskPath(task: TaskDetailTask, all: TaskDetailTask[]): string {
  const byId = new Map(all.map((t) => [t.id, t]));
  const parts: string[] = [];
  let cur: TaskDetailTask | undefined = task;
  while (cur) {
    parts.unshift(cur.title);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return parts.join(" › ");
}

export default function ProjectProtocols({
  projectId,
  projectMembers,
  initialTasks,
  initialProtocolLinksByTaskId,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const openTaskIdFromUrl = sp.get("openTaskId");

  const [localTasks, setLocalTasks] = useState<TaskDetailTask[]>(initialTasks);
  const [localProtocolLinks, setLocalProtocolLinks] = useState(initialProtocolLinksByTaskId);
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [dateMode, setDateMode] = useState<"" | "date" | "month" | "year">("");
  const [dateValue, setDateValue] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [groups, setGroups] = useState<Group[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [allUsers, setAllUsers] = useState<UserLite[]>([]);
  const [tasks, setTasks] = useState<TaskLite[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openSessions, setOpenSessions] = useState<Record<string, boolean>>({});

  const [newGroupName, setNewGroupName] = useState("");
  const [newSessionDate, setNewSessionDate] = useState("");
  const [newSessionGroupId, setNewSessionGroupId] = useState("");
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);

  const [assignRowId, setAssignRowId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const focusSessionId = sp.get("focusSessionId");
  const focusGroupId = sp.get("focusGroupId");

  useEffect(() => {
    setLocalTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    setLocalProtocolLinks(initialProtocolLinksByTaskId);
  }, [initialProtocolLinksByTaskId]);

  const refreshTasksAndLinks = useCallback(async () => {
    const [resTasks, resLinks] = await Promise.all([
      fetch(`/api/projects/${projectId}/tasks`, { cache: "no-store" }),
      fetch(`/api/projects/${projectId}/task-protocol-links`, { cache: "no-store" }),
    ]);
    if (resTasks.ok) {
      const data = (await resTasks.json()) as { tasks: TaskDetailTask[] };
      setLocalTasks(data.tasks);
    }
    if (resLinks.ok) {
      const d = (await resLinks.json()) as {
        linksByTaskId: Record<
          string,
          Array<{ rowId: string; sessionId: string; sessionDate: string; groupId: string; groupName: string }>
        >;
      };
      setLocalProtocolLinks(d.linksByTaskId || {});
    }
  }, [projectId]);

  const usersForResponsible = useMemo(() => {
    // prefer provided projectMembers (members + admins in this project page)
    const map = new Map<string, UserLite>();
    for (const u of allUsers) map.set(u.id, u);
    for (const u of projectMembers) map.set(u.id, u);
    return [...map.values()].sort((a, b) => userLabel(a).localeCompare(userLabel(b)));
  }, [allUsers, projectMembers]);

  const load = useCallback(async () => {
    setBusy(true);
    setMessage("");
    const qs = new URLSearchParams();
    if (search.trim()) qs.set("search", search.trim());
    if (groupId) qs.set("groupId", groupId);
    if (responsibleUserId) qs.set("responsibleUserId", responsibleUserId);
    if (taskId) qs.set("taskId", taskId);
    if (dateMode === "date" && dateValue) qs.set("date", dateValue);
    if (dateMode === "month" && month) qs.set("month", month);
    if (dateMode === "year" && year) qs.set("year", year);
    const res = await fetch(`/api/projects/${projectId}/protocols?${qs.toString()}`, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as any;
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Protokolle konnten nicht geladen werden.");
      return;
    }
    setGroups(data.groups || []);
    setSessions(data.sessions || []);
    setRows(data.rows || []);
    setAllUsers(data.users || []);
    setTasks(data.tasks || []);
  }, [projectId, search, groupId, responsibleUserId, taskId, dateMode, dateValue, month, year]);

  async function createGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/protocols`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "group", name }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Bereich konnte nicht angelegt werden.");
      return;
    }
    setNewGroupName("");
    setGroupModalOpen(false);
    await load();
  }

  async function createSession() {
    if (!newSessionGroupId || !newSessionDate) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/protocols`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "session", groupId: newSessionGroupId, date: newSessionDate }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Sitzung konnte nicht angelegt werden.");
      return;
    }
    setNewSessionDate("");
    setSessionModalOpen(false);
    await load();
  }

  async function addRow(sessionId: string) {
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/protocols`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "row", sessionId, responsibleUserId: null, text: "", result: "", taskIds: [] }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Zeile konnte nicht angelegt werden.");
      return;
    }
    await load();
  }

  async function patchRow(rowId: string, patch: Partial<Row> & { taskIds?: string[] }) {
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/protocols`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "row", id: rowId, ...patch }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Zeile konnte nicht gespeichert werden.");
      return;
    }
    await load();
  }

  async function deleteEntity(type: "group" | "session" | "row", id: string) {
    if (!confirm("Wirklich löschen?")) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/protocols?type=${type}&id=${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Löschen fehlgeschlagen.");
      return;
    }
    await load();
  }

  async function renameGroup(id: string) {
    const g = groups.find((x) => x.id === id);
    if (!g) return;
    const name = prompt("Neuer Name:", g.name);
    if (!name?.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/protocols`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "group", id, name: name.trim() }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Umbenennen fehlgeschlagen.");
      return;
    }
    await load();
  }

  async function changeSessionDate(id: string, date: string) {
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/protocols`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "session", id, date }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Datum konnte nicht gespeichert werden.");
      return;
    }
    await load();
  }

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const sessionsByGroup = useMemo(() => {
    const m = new Map<string, Session[]>();
    for (const s of sessions) {
      if (!m.has(s.groupId)) m.set(s.groupId, []);
      m.get(s.groupId)!.push(s);
    }
    for (const [k, v] of m) v.sort((a, b) => b.date.localeCompare(a.date));
    return m;
  }, [sessions]);
  const rowsBySession = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows) {
      if (!m.has(r.sessionId)) m.set(r.sessionId, []);
      m.get(r.sessionId)!.push(r);
    }
    return m;
  }, [rows]);

  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) set.add(s.date.slice(0, 4));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [sessions]);
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) set.add(s.date.slice(0, 7));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [sessions]);

  const filteredGroups = useMemo(() => {
    // show all groups; actual filtering happens server-side for sessions/rows
    return [...groups].sort((a, b) => a.name.localeCompare(b.name));
  }, [groups]);

  const assignRow = assignRowId ? rows.find((r) => r.id === assignRowId) : null;
  const assignCandidates = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    return tasks
      .filter((t) => (q ? t.title.toLowerCase().includes(q) : true))
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [tasks, assignSearch]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 220);
    return () => window.clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (!focusSessionId) return;
    const el = document.getElementById(`protocol-session-${focusSessionId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [sessions, focusSessionId]);

  const modalTask = useMemo(
    () => (openTaskIdFromUrl ? localTasks.find((t) => t.id === openTaskIdFromUrl) : null),
    [openTaskIdFromUrl, localTasks],
  );

  useEffect(() => {
    if (openTaskIdFromUrl && !localTasks.some((t) => t.id === openTaskIdFromUrl)) {
      void refreshTasksAndLinks();
    }
  }, [openTaskIdFromUrl, localTasks, refreshTasksAndLinks]);

  function closeProtocolTaskModal() {
    const p = new URLSearchParams(sp.toString());
    p.delete("openTaskId");
    const qs = p.toString();
    router.replace(qs ? `/projects/${projectId}?${qs}` : `/projects/${projectId}`);
  }

  function openProtocolTask(taskId: string) {
    const p = new URLSearchParams(sp.toString());
    p.set("view", "protocols");
    p.set("openTaskId", taskId);
    router.push(`/projects/${projectId}?${p.toString()}`);
  }

  return (
    <div className="card protocol-panel">
      <h2>Protokolle</h2>
      <div className="row" style={{ marginBottom: 8 }}>
        <button type="button" onClick={load} disabled={busy}>
          Aktualisieren
        </button>
        {message ? <span style={{ opacity: 0.9 }}>{message}</span> : null}
      </div>

      <div className="task-filters protocol-panel__filters">
        <div className="task-filters__field">
          <label>Suche</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Text, Ergebnis, Aufgabe, Datum…" />
        </div>
        <div className="task-filters__field">
          <label>Bereich</label>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">Alle Bereiche</option>
            {filteredGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="task-filters__field">
          <label>Verantwortlicher</label>
          <select value={responsibleUserId} onChange={(e) => setResponsibleUserId(e.target.value)}>
            <option value="">Alle</option>
            {usersForResponsible.map((u) => (
              <option key={u.id} value={u.id}>
                {userLabel(u)}
              </option>
            ))}
          </select>
        </div>
        <div className="task-filters__field">
          <label>Aufgabe</label>
          <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">Alle Aufgaben</option>
            {tasks
              .slice()
              .sort((a, b) => a.title.localeCompare(b.title))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
          </select>
        </div>
        <div className="task-filters__field">
          <label>Zeitfilter</label>
          <select
            value={dateMode}
            onChange={(e) => {
              const next = (e.target.value || "") as "" | "date" | "month" | "year";
              setDateMode(next);
              setDateValue("");
              setMonth("");
              setYear("");
            }}
          >
            <option value="">Alle</option>
            <option value="date">Datum</option>
            <option value="month">Monat</option>
            <option value="year">Jahr</option>
          </select>
        </div>
        {dateMode === "date" ? (
          <div className="task-filters__field">
            <label>Wert</label>
            <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} />
          </div>
        ) : null}
        {dateMode === "month" ? (
          <div className="task-filters__field">
            <label>Wert</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="">Alle</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {dateMode === "year" ? (
          <div className="task-filters__field">
            <label>Wert</label>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">Alle</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="task-filters__actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setSearch("");
              setGroupId("");
              setResponsibleUserId("");
              setTaskId("");
              setDateMode("");
              setDateValue("");
              setMonth("");
              setYear("");
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" onClick={() => setGroupModalOpen(true)}>
          + Bereich anlegen
        </button>
        <button type="button" onClick={() => setSessionModalOpen(true)}>
          + Sitzung anlegen
        </button>
      </div>

      <div className="card protocols-groups-scroll">
        <h3>Bereiche</h3>
        {groups.length === 0 ? <p>Noch keine Bereiche. Lege oben einen Bereich an.</p> : null}

        {filteredGroups.map((g) => {
          const isOpen = focusGroupId === g.id ? true : openGroups[g.id] !== false;
          const sess = sessionsByGroup.get(g.id) || [];
          return (
            <div key={g.id} className="card" style={{ marginBottom: 10 }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div className="row" style={{ alignItems: "center" }}>
                  <button type="button" className="secondary" onClick={() => setOpenGroups((m) => ({ ...m, [g.id]: m[g.id] === false ? true : false }))}>
                    {isOpen ? "▼" : "▶"}
                  </button>
                  <strong>{g.name}</strong>
                </div>
                <div className="row">
                  <button type="button" className="secondary" onClick={() => renameGroup(g.id)}>
                    Umbenennen
                  </button>
                  <button type="button" className="secondary" onClick={() => deleteEntity("group", g.id)}>
                    Löschen
                  </button>
                </div>
              </div>

              {isOpen ? (
                <div style={{ marginTop: 10 }}>
                  {sess.length === 0 ? <p>Keine Sitzungen in diesem Bereich.</p> : null}
                  {sess.map((s) => {
                    const sOpen = focusSessionId === s.id ? true : openSessions[s.id] !== false;
                    const sRows = rowsBySession.get(s.id) || [];
                    return (
                      <div id={`protocol-session-${s.id}`} key={s.id} className="card" style={{ marginBottom: 10 }}>
                        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                          <div className="row" style={{ alignItems: "center" }}>
                            <button type="button" className="secondary" onClick={() => setOpenSessions((m) => ({ ...m, [s.id]: m[s.id] === false ? true : false }))}>
                              {sOpen ? "▼" : "▶"}
                            </button>
                            <strong>{s.date}</strong>
                          </div>
                          <div className="row">
                            <input
                              type="date"
                              defaultValue={s.date}
                              onBlur={(e) => {
                                const v = e.target.value;
                                if (v && v !== s.date) void changeSessionDate(s.id, v);
                              }}
                            />
                            <button type="button" className="secondary" onClick={() => addRow(s.id)} disabled={busy}>
                              + Zeile
                            </button>
                            <button type="button" className="secondary" onClick={() => deleteEntity("session", s.id)}>
                              Sitzung löschen
                            </button>
                          </div>
                        </div>

                        {sOpen ? (
                          <div style={{ marginTop: 10 }}>
                            <div className="protocol-table-scroll">
                            <div className="protocol-grid-head">
                              <div>Verantwortlicher</div>
                              <div>Erläuterung</div>
                              <div>Aufgaben</div>
                              <div>Ergebnis</div>
                              <div />
                            </div>
                            {sRows.length === 0 ? <p>Noch keine Zeilen.</p> : null}
                            {sRows.map((r) => {
                              const rUser = r.responsibleUserId ? usersForResponsible.find((u) => u.id === r.responsibleUserId) : null;
                              return (
                                <div key={r.id} className="protocol-grid-row">
                                  <div>
                                    <select
                                      value={r.responsibleUserId || ""}
                                      onChange={(e) => patchRow(r.id, { responsibleUserId: e.target.value || null })}
                                      disabled={busy}
                                    >
                                      <option value="">—</option>
                                      {usersForResponsible.map((u) => (
                                        <option key={u.id} value={u.id}>
                                          {userLabel(u)}
                                        </option>
                                      ))}
                                    </select>
                                    {rUser ? <div className="protocol-sub">{rUser.username}</div> : null}
                                  </div>
                                  <div>
                                    <textarea
                                      rows={2}
                                      defaultValue={r.text}
                                      onBlur={(e) => patchRow(r.id, { text: e.target.value })}
                                      placeholder="Freitext zur Erläuterung"
                                    />
                                  </div>
                                  <div>
                                    <div className="protocol-taskchips">
                                      {(r.taskIds || []).map((tid) => {
                                        const full = localTasks.find((t) => t.id === tid);
                                        const titleFallback = tasksById.get(tid)?.title || tid;
                                        if (!full) {
                                          return (
                                            <div key={tid} className="kanban-card protocol-kanban-preview">
                                              <div className="kanban-card__title">{titleFallback}</div>
                                              <div className="kanban-card__meta">Karte wird geladen…</div>
                                              <div className="row">
                                                <button type="button" className="secondary" onClick={() => openProtocolTask(tid)}>
                                                  Karte öffnen
                                                </button>
                                                <button
                                                  type="button"
                                                  className="secondary"
                                                  onClick={() => patchRow(r.id, { taskIds: (r.taskIds || []).filter((x) => x !== tid) })}
                                                >
                                                  Entfernen
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        }
                                        return (
                                          <div key={tid} className="kanban-card protocol-kanban-preview">
                                            <div className="kanban-card__title" title={taskPath(full, localTasks)}>
                                              {taskPath(full, localTasks)}
                                            </div>
                                            <div className="kanban-card__meta">
                                              Priorität: {full.priority}
                                              {full.dueDate ? ` · Frist: ${full.dueDate}` : ""}
                                            </div>
                                            <div className="row">
                                              <button type="button" className="secondary" onClick={() => openProtocolTask(tid)}>
                                                Karte öffnen
                                              </button>
                                              <button
                                                type="button"
                                                className="secondary"
                                                onClick={() => patchRow(r.id, { taskIds: (r.taskIds || []).filter((x) => x !== tid) })}
                                              >
                                                Entfernen
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <button
                                      type="button"
                                      className="secondary"
                                      onClick={() => {
                                        setAssignRowId(r.id);
                                        setAssignSearch("");
                                      }}
                                      disabled={busy}
                                    >
                                      Aufgabe zuordnen
                                    </button>
                                  </div>
                                  <div>
                                    <textarea
                                      rows={2}
                                      defaultValue={r.result}
                                      onBlur={(e) => patchRow(r.id, { result: e.target.value })}
                                      placeholder="Ergebnis"
                                    />
                                  </div>
                                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                    <button type="button" className="secondary" onClick={() => deleteEntity("row", r.id)}>
                                      Löschen
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {assignRow ? (
        <div className="gantt-modal-overlay" role="dialog" aria-modal onClick={() => setAssignRowId(null)}>
          <div className="gantt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gantt-modal__head">
              <h3>Aufgaben zuordnen</h3>
              <button type="button" className="secondary" onClick={() => setAssignRowId(null)}>
                Schließen
              </button>
            </div>
            <input placeholder="Suchen…" value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} />
            <div className="gantt-dep-list">
              {assignCandidates.map((t) => {
                const checked = (assignRow.taskIds || []).includes(t.id);
                return (
                  <label key={t.id} className="gantt-dep-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const cur = assignRow.taskIds || [];
                        const next = e.target.checked ? [...new Set([...cur, t.id])] : cur.filter((x) => x !== t.id);
                        void patchRow(assignRow.id, { taskIds: next });
                      }}
                    />
                    <span>{t.title}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {groupModalOpen ? (
        <div className="gantt-modal-overlay" role="dialog" aria-modal onClick={() => setGroupModalOpen(false)}>
          <div className="gantt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gantt-modal__head">
              <h3>Bereich anlegen</h3>
              <button type="button" className="secondary" onClick={() => setGroupModalOpen(false)}>
                Schließen
              </button>
            </div>
            <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="z. B. Kundentermin" />
            <button type="button" onClick={createGroup} disabled={busy}>
              + Bereich
            </button>
          </div>
        </div>
      ) : null}

      {sessionModalOpen ? (
        <div className="gantt-modal-overlay" role="dialog" aria-modal onClick={() => setSessionModalOpen(false)}>
          <div className="gantt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gantt-modal__head">
              <h3>Sitzung anlegen</h3>
              <button type="button" className="secondary" onClick={() => setSessionModalOpen(false)}>
                Schließen
              </button>
            </div>
            <select value={newSessionGroupId} onChange={(e) => setNewSessionGroupId(e.target.value)}>
              <option value="">Bereich wählen…</option>
              {filteredGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <input type="date" value={newSessionDate} onChange={(e) => setNewSessionDate(e.target.value)} />
            <button type="button" onClick={createSession} disabled={busy}>
              + Sitzung
            </button>
          </div>
        </div>
      ) : null}

      {modalTask ? (
        <TaskDetailModal
          key={modalTask.id}
          projectId={projectId}
          task={modalTask}
          activeTasks={localTasks.filter((t) => !t.archived)}
          protocolLinksByTaskId={localProtocolLinks}
          onClose={closeProtocolTaskModal}
          onPatched={refreshTasksAndLinks}
        />
      ) : null}
    </div>
  );
}

