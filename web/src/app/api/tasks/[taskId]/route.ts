import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { readSessionFromCookie } from "@/lib/auth";
import { canAccessProject } from "@/lib/access";
import { validateDependsOnUpdate } from "@/lib/task-deps";
import { assigneesAreProjectMembers } from "@/lib/project-assignees";
import {
  columnBelongsToProject,
  ensureKanbanConfig,
  KANBAN_BACKLOG_ID,
  KANBAN_DEFAULT_LANE_ID,
  laneBelongsToProject,
} from "@/lib/kanban-config";

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  done: z.boolean().optional(),
  archived: z.boolean().optional(),
  kanbanColumnId: z.string().min(1).optional(),
  swimlaneId: z.string().min(1).optional(),
  dependsOnTaskIds: z.array(z.string().uuid()).optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
});

export async function PATCH(req: Request, context: { params: Promise<{ taskId: string }> }) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { taskId } = await context.params;

  const current = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!current.length) return NextResponse.json({ error: "Aufgabe nicht gefunden." }, { status: 404 });
  const task = current[0];
  const ok = await canAccessProject(session, task.projectId);
  if (!ok) return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  const data = parsed.data;

  if (data.dependsOnTaskIds !== undefined) {
    const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, task.projectId));
    const check = validateDependsOnUpdate(task.id, data.dependsOnTaskIds, projectTasks);
    if (!check.ok) return NextResponse.json({ error: check.message }, { status: 400 });
    const ids = new Set(projectTasks.map((t) => t.id));
    for (const dep of data.dependsOnTaskIds) {
      if (!ids.has(dep)) return NextResponse.json({ error: "Unbekannte Vorgänger-Aufgabe." }, { status: 400 });
    }
  }

  if (data.assigneeIds !== undefined) {
    const okMembers = await assigneesAreProjectMembers(db, task.projectId, data.assigneeIds);
    if (!okMembers) return NextResponse.json({ error: "Zuständige müssen Projektmitglieder sein." }, { status: 400 });
  }

  await ensureKanbanConfig(db, task.projectId);
  let nextCol = data.kanbanColumnId ?? task.kanbanColumnId;
  let nextLane = data.swimlaneId ?? task.swimlaneId;
  if (data.kanbanColumnId !== undefined) {
    const okCol = await columnBelongsToProject(db, task.projectId, data.kanbanColumnId);
    nextCol = okCol ? data.kanbanColumnId : KANBAN_BACKLOG_ID;
  }
  if (data.swimlaneId !== undefined) {
    const okLane = await laneBelongsToProject(db, task.projectId, data.swimlaneId);
    nextLane = okLane ? data.swimlaneId : KANBAN_DEFAULT_LANE_ID;
  }

  const updated = await db
    .update(tasks)
    .set({
      title: data.title !== undefined ? data.title.trim() : task.title,
      priority: data.priority ?? task.priority,
      startDate: data.startDate !== undefined ? data.startDate : task.startDate,
      dueDate: data.dueDate !== undefined ? data.dueDate : task.dueDate,
      description: data.description !== undefined ? data.description : task.description,
      done: data.done ?? task.done,
      archived: data.archived ?? task.archived,
      kanbanColumnId: nextCol,
      swimlaneId: nextLane,
      dependsOnTaskIds:
        data.dependsOnTaskIds !== undefined ? data.dependsOnTaskIds : task.dependsOnTaskIds,
      assigneeIds: data.assigneeIds !== undefined ? data.assigneeIds : task.assigneeIds,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId))
    .returning();

  return NextResponse.json({ ok: true, task: updated[0] });
}

export async function DELETE(_: Request, context: { params: Promise<{ taskId: string }> }) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { taskId } = await context.params;

  const current = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!current.length) return NextResponse.json({ error: "Aufgabe nicht gefunden." }, { status: 404 });
  const task = current[0];
  const ok = await canAccessProject(session, task.projectId);
  if (!ok) return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });

  const siblings = await db.select().from(tasks).where(eq(tasks.projectId, task.projectId));
  for (const t of siblings) {
    const deps = t.dependsOnTaskIds || [];
    if (!deps.includes(taskId)) continue;
    await db
      .update(tasks)
      .set({
        dependsOnTaskIds: deps.filter((x) => x !== taskId),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, t.id));
  }

  await db.delete(tasks).where(eq(tasks.id, taskId));
  await db.delete(tasks).where(eq(tasks.parentId, taskId));
  return NextResponse.json({ ok: true });
}
