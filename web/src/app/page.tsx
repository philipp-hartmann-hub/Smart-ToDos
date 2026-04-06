import { db } from "@/lib/db";
import { projectMembers, projects } from "@/lib/schema";
import { readSessionFromCookie } from "@/lib/auth";
import { eq } from "drizzle-orm";
import Link from "next/link";

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
          .select({ id: projects.id, title: projects.title, description: projects.description })
          .from(projects)
          .innerJoin(projectMembers, eq(projectMembers.projectId, projects.id))
          .where(eq(projectMembers.userId, session.sub));

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
        </div>
      </div>

      <div className="card">
        <h2>Verfügbare Projekte</h2>
        {projectRows.length === 0 ? <p>Keine zugeordneten Projekte vorhanden.</p> : null}
        {projectRows.map((p) => (
          <div key={p.id} style={{ marginBottom: "0.7rem" }}>
            <strong>{p.title}</strong>
            {p.description ? <div>{p.description}</div> : null}
          </div>
        ))}
      </div>
    </main>
  );
}
