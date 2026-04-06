import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { readSessionFromCookie } from "@/lib/auth";
import { canAccessProject } from "@/lib/access";

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  done: z.boolean().optional(),
  archived: z.boolean().optional(),
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

  await db.delete(tasks).where(eq(tasks.id, taskId));
  await db.delete(tasks).where(eq(tasks.parentId, taskId));
  return NextResponse.json({ ok: true });
}
