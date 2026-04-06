import { and, eq } from "drizzle-orm";
import { db as dbSingleton } from "@/lib/db";
import { kanbanColumns, kanbanSwimlanes } from "@/lib/schema";

type Db = NonNullable<typeof dbSingleton>;

export const KANBAN_BACKLOG_ID = "kanban-backlog";
export const KANBAN_DEFAULT_LANE_ID = "kanban-lane-default";

export const DEFAULT_COLUMNS = [
  { id: KANBAN_BACKLOG_ID, name: "Backlog", sortOrder: 0 },
  { id: "kanban-in-progress", name: "In Bearbeitung", sortOrder: 10 },
  { id: "kanban-waiting-feedback", name: "Warten auf Rückmeldung", sortOrder: 20 },
  { id: "kanban-done", name: "Abgeschlossen", sortOrder: 30 },
];

export const DEFAULT_LANES = [{ id: KANBAN_DEFAULT_LANE_ID, name: "Standard", sortOrder: 0 }];

export async function ensureKanbanConfig(db: Db, projectId: string) {
  const cols = await db.select().from(kanbanColumns).where(eq(kanbanColumns.projectId, projectId));
  const lanes = await db.select().from(kanbanSwimlanes).where(eq(kanbanSwimlanes.projectId, projectId));

  const now = new Date();

  if (!cols.length) {
    for (const c of DEFAULT_COLUMNS) {
      await db
        .insert(kanbanColumns)
        .values({ ...c, projectId, createdAt: now, updatedAt: now })
        .onConflictDoNothing();
    }
  } else {
    // ensure backlog exists
    const hasBacklog = cols.some((c) => c.id === KANBAN_BACKLOG_ID);
    if (!hasBacklog) {
      await db
        .insert(kanbanColumns)
        .values({ id: KANBAN_BACKLOG_ID, projectId, name: "Backlog", sortOrder: 0, createdAt: now, updatedAt: now })
        .onConflictDoNothing();
    }
  }

  if (!lanes.length) {
    for (const l of DEFAULT_LANES) {
      await db
        .insert(kanbanSwimlanes)
        .values({ ...l, projectId, createdAt: now, updatedAt: now })
        .onConflictDoNothing();
    }
  } else {
    const hasDefault = lanes.some((l) => l.id === KANBAN_DEFAULT_LANE_ID);
    if (!hasDefault) {
      await db
        .insert(kanbanSwimlanes)
        .values({
          id: KANBAN_DEFAULT_LANE_ID,
          projectId,
          name: "Standard",
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }
  }

  const cols2 = await db.select().from(kanbanColumns).where(eq(kanbanColumns.projectId, projectId));
  const lanes2 = await db.select().from(kanbanSwimlanes).where(eq(kanbanSwimlanes.projectId, projectId));

  return {
    columns: cols2.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    swimlanes: lanes2.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
  };
}

export async function columnBelongsToProject(db: Db, projectId: string, columnId: string) {
  const rows = await db
    .select()
    .from(kanbanColumns)
    .where(and(eq(kanbanColumns.projectId, projectId), eq(kanbanColumns.id, columnId)))
    .limit(1);
  return !!rows.length;
}

export async function laneBelongsToProject(db: Db, projectId: string, laneId: string) {
  const rows = await db
    .select()
    .from(kanbanSwimlanes)
    .where(and(eq(kanbanSwimlanes.projectId, projectId), eq(kanbanSwimlanes.id, laneId)))
    .limit(1);
  return !!rows.length;
}

