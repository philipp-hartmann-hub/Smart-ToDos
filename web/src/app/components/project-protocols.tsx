"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
};

function userLabel(u: UserLite) {
  return `${u.firstName} ${u.lastName} (${u.username})`;
}

export default function ProjectProtocols({ projectId, projectMembers }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [taskId, setTaskId] = useState("");
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

  const [assignRowId, setAssignRowId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");

  const usersForResponsible = useMemo(() => {
    // prefer provided projectMembers (members + admins in this project page)
    const map = new Map<string, UserLite>();
    for (const u of allUsers) map.set(u.id, u);
    for (const u of projectMembers) map.set(u.id, u);
    return [...map.values()].sort((a, b) => userLabel(a).localeCompare(userLabel(b)));
  }, [allUsers, projectMembers]);

  async function load() {
    setBusy(true);
    setMessage("");
    const qs = new URLSearchParams();
    if (search.trim()) qs.set("search", search.trim());
    if (groupId) qs.set("groupId", groupId);
    if (responsibleUserId) qs.set("responsibleUserId", responsibleUserId);
    if (taskId) qs.set("taskId", taskId);
    if (month) qs.set("month", month);
    if (year) qs.set("year", year);
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
  }

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
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
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

  const view = sp.get("view");
  const openTaskId = sp.get("openTaskId");
  function jumpToTask(taskId: string) {
    // switch to gantt + open modal
    const params = new URLSearchParams(sp.toString());
    params.set("view", "gantt");
    params.set("openTaskId", taskId);
    router.push(`/projects/${projectId}?${params.toString()}`);
  }

  return (
    <div className="card">
      <h2>Protokolle</h2>
      <div className="row" style={{ marginBottom: 8 }}>
        <button type="button" onClick={load} disabled={busy}>
          Aktualisieren
        </button>
        {message ? <span style={{ opacity: 0.9 }}>{message}</span> : null}
      </div>

      <div className="task-filters">
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
          <label>Monat</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Alle</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="task-filters__field">
          <label>Jahr</label>
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">Alle</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="task-filters__actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setSearch("");
              setGroupId("");
              setResponsibleUserId("");
              setTaskId("");
              setMonth("");
              setYear("");
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Bereich anlegen</h3>
        <div className="row">
          <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="z. B. Kundentermin" />
          <button type="button" onClick={createGroup} disabled={busy}>
            + Bereich
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Sitzung anlegen</h3>
        <div className="row">
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

      <div className="card">
        <h3>Bereiche</h3>
        {groups.length === 0 ? <p>Noch keine Bereiche. Lege oben einen Bereich an.</p> : null}

        {filteredGroups.map((g) => {
          const isOpen = openGroups[g.id] !== false;
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
                    const sOpen = openSessions[s.id] !== false;
                    const sRows = rowsBySession.get(s.id) || [];
                    return (
                      <div key={s.id} className="card" style={{ marginBottom: 10 }}>
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
                                      {(r.taskIds || []).map((tid) => (
                                        <div key={tid} className="protocol-taskchip">
                                          <span title={tasksById.get(tid)?.title || tid}>{tasksById.get(tid)?.title || tid}</span>
                                          <button type="button" className="secondary" onClick={() => jumpToTask(tid)}>
                                            Öffnen
                                          </button>
                                        </div>
                                      ))}
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
    </div>
  );
}

