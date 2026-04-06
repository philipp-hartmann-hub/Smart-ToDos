import { eq } from "drizzle-orm";
import { db as dbSingleton } from "@/lib/db";
import { projectMembers, tasks } from "@/lib/schema";

type DrizzleDb = NonNullable<typeof dbSingleton>;

/** Jede ID muss Eintrag in `project_members` für dieses Projekt sein. */
export async function assigneesAreProjectMembers(
  db: DrizzleDb,
  projectId: string,
  assigneeIds: string[],
): Promise<boolean> {
  if (assigneeIds.length === 0) return true;
  const rows = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, projectId));
  const allowed = new Set(rows.map((r) => r.userId));
  return assigneeIds.every((id) => allowed.has(id));
}

/** Entfernt eine Benutzer-ID aus allen `assignee_ids` von Aufgaben des Projekts (z. B. nach Entzug der Mitgliedschaft). */
export async function stripUserFromAssigneesInProject(db: DrizzleDb, projectId: string, userId: string) {
  const rows = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  for (const t of rows) {
    const ids = t.assigneeIds || [];
    if (!ids.includes(userId)) continue;
    await db
      .update(tasks)
      .set({
        assigneeIds: ids.filter((x) => x !== userId),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, t.id));
  }
}
