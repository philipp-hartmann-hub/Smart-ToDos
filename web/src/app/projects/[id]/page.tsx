import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectMembers, projects, tasks, users } from "@/lib/schema";
import { readSessionFromCookie } from "@/lib/auth";
import ProjectWorkspace from "@/app/components/project-workspace";

type Params = { params: Promise<{ id: string }> };

export default async function ProjectPage({ params }: Params) {
  const { id } = await params;
  const session = await readSessionFromCookie();
  if (!session) {
    return (
      <main className="container">
        <div className="card">
          <h1>Nicht angemeldet</h1>
          <Link href="/login">
            <button>Anmelden</button>
          </Link>
        </div>
      </main>
    );
  }
  if (!db) {
    return (
      <main className="container">
        <div className="card">
          <h1>Datenbank fehlt</h1>
          <p>DATABASE_URL ist nicht gesetzt.</p>
        </div>
      </main>
    );
  }

  const projectRows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  const project = projectRows[0];
  if (!project) {
    return (
      <main className="container">
        <div className="card">
          <h1>Projekt nicht gefunden</h1>
          <Link href="/">
            <button>Zurück</button>
          </Link>
        </div>
      </main>
    );
  }

  if (session.role !== "admin") {
    const membership = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.userId, session.sub), eq(projectMembers.projectId, id)))
      .limit(1);
    if (!membership.length) {
      return (
        <main className="container">
          <div className="card">
            <h1>Kein Zugriff</h1>
            <p>Dieses Projekt ist deinem Profil nicht zugeordnet.</p>
            <Link href="/">
              <button>Zurück</button>
            </Link>
          </div>
        </main>
      );
    }
  }
  const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, project.id));

  const projectMemberRows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, project.id));

  const adminRows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
    })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.active, true)));

  const memberMap = new Map<string, (typeof projectMemberRows)[number]>();
  for (const m of projectMemberRows) memberMap.set(m.id, m);
  for (const a of adminRows) memberMap.set(a.id, a);
  const selectableAssignees = [...memberMap.values()];

  return (
    <main className="container">
      <div className="card">
        <h1>{project.title}</h1>
        {project.description ? <p>{project.description}</p> : <p>Keine Beschreibung hinterlegt.</p>}
        <Link href="/">
          <button className="secondary">Zurück zur Übersicht</button>
        </Link>
      </div>
      <ProjectWorkspace
        projectId={project.id}
        initialTasks={projectTasks}
        projectMembers={selectableAssignees}
      />
    </main>
  );
}
