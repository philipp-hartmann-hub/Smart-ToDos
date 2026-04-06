import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects, tasks } from "@/lib/schema";
import { readSessionFromCookie } from "@/lib/auth";
import { canAccessProject } from "@/lib/access";
import { assigneesAreProjectMembers } from "@/lib/project-assignees";

const createSchema = z.object({
  title: z.string().min(1).max(500),
  parentId: z.string().uuid().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  kanbanColumnId: z.string().min(1).optional(),
  swimlaneId: z.string().min(1).optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
});

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { id: projectId } = await context.params;
  const ok = await canAccessProject(session, projectId);
  if (!ok) return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });

  const rows = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  return NextResponse.json({ tasks: rows });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { id: projectId } = await context.params;
  const ok = await canAccessProject(session, projectId);
  if (!ok) return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });

  const projectExists = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!projectExists.length) return NextResponse.json({ error: "Projekt nicht gefunden." }, { status: 404 });

  if (parsed.data.parentId) {
    const parent = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, parsed.data.parentId), eq(tasks.projectId, projectId)))
      .limit(1);
    if (!parent.length) return NextResponse.json({ error: "Elternaufgabe nicht gefunden." }, { status: 400 });
  }

  const assigneeIds = parsed.data.assigneeIds ?? [];
  if (assigneeIds.length) {
    const okMembers = await assigneesAreProjectMembers(db, projectId, assigneeIds);
    if (!okMembers) return NextResponse.json({ error: "Zuständige müssen Projektmitglieder sein." }, { status: 400 });
  }

  const inserted = await db
    .insert(tasks)
    .values({
      projectId,
      parentId: parsed.data.parentId || null,
      title: parsed.data.title.trim(),
      priority: parsed.data.priority,
      startDate: parsed.data.startDate || null,
      dueDate: parsed.data.dueDate || null,
      description: parsed.data.description || null,
      kanbanColumnId: parsed.data.kanbanColumnId || "kanban-backlog",
      swimlaneId: parsed.data.swimlaneId || "kanban-lane-default",
      assigneeIds,
      done: false,
      archived: false,
    })
    .returning();

  return NextResponse.json({ ok: true, task: inserted[0] });
}
