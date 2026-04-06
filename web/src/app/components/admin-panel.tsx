"use client";

import { useEffect, useMemo, useState } from "react";

type Project = {
  id: string;
  title: string;
  description: string | null;
  imageUrl?: string | null;
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
  const [projectImageUrl, setProjectImageUrl] = useState<string>("");
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
  const [projectCreateOpen, setProjectCreateOpen] = useState(false);
  const [userCreateOpen, setUserCreateOpen] = useState(false);
  const [userManageOpen, setUserManageOpen] = useState(false);

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
      body: JSON.stringify({ title: projectTitle, description: projectDescription, imageUrl: projectImageUrl || null }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Projekt konnte nicht angelegt werden.");
      return;
    }
    setMessage("Projekt angelegt.");
    window.location.reload();
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(file);
    });
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

  async function updateProject(projectId: string, patch: { title?: string; description?: string | null; imageUrl?: string | null }) {
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/admin/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Projekt konnte nicht aktualisiert werden.");
      return;
    }
    setMessage("Projekt aktualisiert.");
    window.location.reload();
  }

  async function deleteProject(projectId: string) {
    if (!confirm("Projekt wirklich löschen? Alle Aufgaben und Zuordnungen werden entfernt.")) return;
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/admin/projects/${projectId}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Projekt konnte nicht gelöscht werden.");
      return;
    }
    setMessage("Projekt gelöscht.");
    window.location.reload();
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
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Projekt anlegen</h3>
          <button type="button" className="secondary" onClick={() => setProjectCreateOpen((v) => !v)}>
            {projectCreateOpen ? "Formular schließen" : "Projekt anlegen"}
          </button>
        </div>
        {projectCreateOpen ? (
          <div className="row" style={{ flexDirection: "column", marginTop: 10 }}>
            <input placeholder="Projektname" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
            <input
              placeholder="Beschreibung (optional)"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
            />
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  setProjectImageUrl("");
                  return;
                }
                if (file.size > 5 * 1024 * 1024) {
                  setMessage("Projektbild zu groß (max. 5MB).");
                  return;
                }
                const dataUrl = await readFileAsDataUrl(file);
                setProjectImageUrl(dataUrl);
              }}
            />
            {projectImageUrl ? (
              <img src={projectImageUrl} alt="Projektvorschau" style={{ maxWidth: 260, borderRadius: 8 }} />
            ) : null}
            <button onClick={createProject} disabled={busy}>
              Projekt speichern
            </button>
          </div>
        ) : null}
      </div>

      <div className="card">
        <h3>Projekte verwalten</h3>
        {projects.length === 0 ? <p>Noch keine Projekte vorhanden.</p> : null}
        {projects.map((p) => (
          <div key={p.id} className="card" style={{ marginBottom: 12 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <strong>{p.title}</strong>
              <div className="row">
                <button
                  type="button"
                  className="secondary"
                  onClick={async () => {
                    const title = prompt("Neuer Projektname:", p.title);
                    if (!title?.trim()) return;
                    await updateProject(p.id, { title: title.trim() });
                  }}
                  disabled={busy}
                >
                  Umbenennen
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={async () => {
                    const desc = prompt("Neue Beschreibung (leer = entfernen):", p.description || "");
                    if (desc === null) return;
                    await updateProject(p.id, { description: desc.trim() || null });
                  }}
                  disabled={busy}
                >
                  Beschreibung
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => updateProject(p.id, { imageUrl: null })}
                  disabled={busy}
                >
                  Bild entfernen
                </button>
                <button type="button" className="secondary" onClick={() => deleteProject(p.id)} disabled={busy}>
                  Löschen
                </button>
              </div>
            </div>
            {p.imageUrl ? (
              <div style={{ marginTop: 8 }}>
                <img src={p.imageUrl} alt={`Projektbild ${p.title}`} style={{ maxWidth: 220, borderRadius: 8 }} />
              </div>
            ) : null}
            <div style={{ marginTop: 8 }}>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    setMessage("Projektbild zu groß (max. 5MB).");
                    return;
                  }
                  const dataUrl = await readFileAsDataUrl(file);
                  await updateProject(p.id, { imageUrl: dataUrl });
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Benutzer anlegen</h3>
          <button type="button" className="secondary" onClick={() => setUserCreateOpen((v) => !v)}>
            {userCreateOpen ? "Formular schließen" : "Benutzer anlegen"}
          </button>
        </div>
        {userCreateOpen ? (
          <div className="row" style={{ flexDirection: "column", marginTop: 10 }}>
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
        ) : null}
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
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Teilnehmende verwalten</h3>
          <button type="button" className="secondary" onClick={() => setUserManageOpen((v) => !v)}>
            {userManageOpen ? "Formular schließen" : "Teilnehmende verwalten"}
          </button>
        </div>
        {userManageOpen ? (
          <>
            {nonAdminUsers.length === 0 ? <p style={{ marginTop: 10 }}>Noch keine Benutzer vorhanden.</p> : null}
            {nonAdminUsers.map((u) => (
              <div key={u.id} className="card" style={{ marginBottom: 12, marginTop: 10 }}>
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
          </>
        ) : null}
      </div>
    </div>
  );
}
