import { db } from "@/lib/db";
import { projectMembers, projects, users } from "@/lib/schema";
import { readSessionFromCookie } from "@/lib/auth";
import { eq } from "drizzle-orm";
import Link from "next/link";
import LogoutButton from "./components/logout-button";
import AdminPanel from "./components/admin-panel";

export default async function HomePage() {
  const session = await readSessionFromCookie();
  if (!db) {
    return (
      <main className="container">
        <div className="card">
          <h1>Der Projektmanager Cloud</h1>
          <p>DATABASE_URL fehlt. Bitte .env setzen und Deploy-Umgebung konfigurieren.</p>
        </div>
      </main>
    );
  }
  if (!session) {
    return (
      <main className="container">
        <div className="card">
          <h1>Der Projektmanager Cloud</h1>
          <p>Mehrbenutzer-Basis ist aktiv. Bitte anmelden.</p>
          <Link href="/login">
            <button>Anmelden</button>
          </Link>
        </div>
      </main>
    );
  }

  const projectRows =
    session.role === "admin"
      ? await db.select().from(projects)
      : await db
          .select({ id: projects.id, title: projects.title, description: projects.description, imageUrl: projects.imageUrl })
          .from(projects)
          .innerJoin(projectMembers, eq(projectMembers.projectId, projects.id))
          .where(eq(projectMembers.userId, session.sub));

  const userRows =
    session.role === "admin"
      ? await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username,
            role: users.role,
          })
          .from(users)
      : [];
  const membershipRows =
    session.role === "admin"
      ? await db.select({ userId: projectMembers.userId, projectId: projectMembers.projectId }).from(projectMembers)
      : [];
  const usersWithProjects =
    session.role === "admin"
      ? userRows.map((u) => ({
          ...u,
          projectIds: membershipRows.filter((m) => m.userId === u.id).map((m) => m.projectId),
        }))
      : [];

  return (
    <main className="container">
      <div className="card">
        <h1>Der Projektmanager Cloud</h1>
        <p>
          Angemeldet als <strong>{session.username}</strong> ({session.role})
        </p>
        <div className="row">
          <Link href="/login">
            <button className="secondary">Anderer Login</button>
          </Link>
          <LogoutButton />
        </div>
      </div>

      {session.role === "admin" ? <AdminPanel projects={projectRows} users={usersWithProjects} /> : null}

      <div className="card">
        <h2>Verfügbare Projekte</h2>
        {projectRows.length === 0 ? <p>Keine zugeordneten Projekte vorhanden.</p> : null}
        {projectRows.map((p) => (
          <div key={p.id} style={{ marginBottom: "0.9rem", borderBottom: "1px solid #334155", paddingBottom: "0.7rem" }}>
            {p.imageUrl ? (
              <div style={{ marginBottom: "0.4rem" }}>
                <img
                  src={p.imageUrl}
                  alt={`Projektbild ${p.title}`}
                  style={{ maxWidth: "220px", maxHeight: "120px", objectFit: "cover", borderRadius: "8px" }}
                />
              </div>
            ) : null}
            <strong>{p.title}</strong>
            {p.description ? <div>{p.description}</div> : null}
            <div style={{ marginTop: "0.45rem" }}>
              <Link href={`/projects/${p.id}`}>
                <button>Projekt öffnen</button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
