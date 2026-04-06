"use client";

import { useEffect, useMemo, useState } from "react";

type Project = {
  id: string;
  title: string;
  description: string | null;
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  role: string;
  projectIds: string[];
};

type Props = {
  projects: Project[];
  users: User[];
};

type CreatedCredential = {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  createdAt: string;
};

function usernameFromNames(firstName: string, lastName: string) {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
  const base = slug(firstName) || "user";
  const last = slug(lastName);
  return last ? `${base}.${last}` : base;
}

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AdminPanel({ projects, users }: Props) {
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [newUserFirst, setNewUserFirst] = useState("");
  const [newUserLast, setNewUserLast] = useState("");
  const [usersState, setUsersState] = useState<User[]>(users);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [userProjectMap, setUserProjectMap] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(users.map((u) => [u.id, u.projectIds])),
  );
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredential[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("dpm-created-credentials");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CreatedCredential[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem("dpm-created-credentials", JSON.stringify(createdCredentials.slice(0, 30)));
  }, [createdCredentials]);

  const nonAdminUsers = useMemo(() => usersState.filter((u) => u.role !== "admin"), [usersState]);

  function toggleSelectedProject(id: string) {
    setSelectedProjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function createProject() {
    if (!projectTitle.trim()) return;
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/admin/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: projectTitle, description: projectDescription }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Projekt konnte nicht angelegt werden.");
      return;
    }
    setMessage("Projekt angelegt.");
    window.location.reload();
  }

  async function createUser() {
    if (!newUserFirst.trim() || !newUserLast.trim()) return;
    setBusy(true);
    setMessage("");
    const username = usernameFromNames(newUserFirst, newUserLast);
    const password = randomPassword();
    const projectIds = [...selectedProjectIds];
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: newUserFirst,
        lastName: newUserLast,
        username,
        password,
        projectIds,
      }),
    });
    const data = (await res.json().catch(() => null)) as
      | { error?: string; user?: { id: string; username: string } }
      | null;
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Benutzer konnte nicht angelegt werden.");
      return;
    }
    const createdId = data?.user?.id || crypto.randomUUID();
    setUsersState((prev) => [
      ...prev,
      {
        id: createdId,
        firstName: newUserFirst.trim(),
        lastName: newUserLast.trim(),
        username: data?.user?.username || username,
        role: "user",
        projectIds,
      },
    ]);
    setUserProjectMap((prev) => ({ ...prev, [createdId]: projectIds }));
    setCreatedCredentials((prev) => [
      {
        userId: createdId,
        firstName: newUserFirst.trim(),
        lastName: newUserLast.trim(),
        username: data?.user?.username || username,
        password,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setMessage("Benutzer angelegt. Zugangsdaten unten gespeichert.");
    setNewUserFirst("");
    setNewUserLast("");
    setSelectedProjectIds([]);
  }

  function toggleUserProject(userId: string, projectId: string) {
    setUserProjectMap((prev) => {
      const current = prev[userId] || [];
      const next = current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId];
      return { ...prev, [userId]: next };
    });
  }

  async function saveUserProjects(userId: string) {
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/admin/users/${userId}/projects`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectIds: userProjectMap[userId] || [] }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Projektzuordnung konnte nicht gespeichert werden.");
      return;
    }
    setMessage("Projektzuordnung gespeichert.");
  }

  return (
    <div className="card">
      <h2>Admin-Bereich</h2>
      {message ? <p>{message}</p> : null}

      <div className="card">
        <h3>Projekt anlegen</h3>
        <div className="row" style={{ flexDirection: "column" }}>
          <input placeholder="Projektname" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
          <input
            placeholder="Beschreibung (optional)"
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
          />
          <button onClick={createProject} disabled={busy}>
            Projekt speichern
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Benutzer anlegen</h3>
        <div className="row" style={{ flexDirection: "column" }}>
          <input placeholder="Vorname" value={newUserFirst} onChange={(e) => setNewUserFirst(e.target.value)} />
          <input placeholder="Nachname" value={newUserLast} onChange={(e) => setNewUserLast(e.target.value)} />
          <div>
            <strong>Projekte zuweisen</strong>
            <div className="row" style={{ marginTop: 8 }}>
              {projects.map((p) => (
                <label key={p.id} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedProjectIds.includes(p.id)}
                    onChange={() => toggleSelectedProject(p.id)}
                  />
                  <span>{p.title}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={createUser} disabled={busy}>
            Benutzer anlegen
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Letzte Zugangsdaten</h3>
        {createdCredentials.length === 0 ? <p>Noch keine lokal gespeicherten Zugangsdaten.</p> : null}
        {createdCredentials.map((c) => (
          <div key={`${c.userId}-${c.createdAt}`} className="card" style={{ marginBottom: 10 }}>
            <div>
              <strong>
                {c.firstName} {c.lastName}
              </strong>
            </div>
            <div>Benutzername: {c.username}</div>
            <div>Passwort: {c.password}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Benutzer verwalten</h3>
        {nonAdminUsers.length === 0 ? <p>Noch keine Benutzer vorhanden.</p> : null}
        {nonAdminUsers.map((u) => (
          <div key={u.id} className="card" style={{ marginBottom: 12 }}>
            <div>
              <strong>
                {u.firstName} {u.lastName}
              </strong>{" "}
              ({u.username})
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              {projects.map((p) => (
                <label key={`${u.id}-${p.id}`} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={(userProjectMap[u.id] || []).includes(p.id)}
                    onChange={() => toggleUserProject(u.id, p.id)}
                  />
                  <span>{p.title}</span>
                </label>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <button onClick={() => saveUserProjects(u.id)} disabled={busy}>
                Zuordnung speichern
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
