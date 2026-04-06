import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { canAccessProject } from "@/lib/access";
import { readSessionFromCookie } from "@/lib/auth";
import { kanbanColumns, kanbanSwimlanes, tasks } from "@/lib/schema";
import { ensureKanbanConfig, KANBAN_BACKLOG_ID, KANBAN_DEFAULT_LANE_ID } from "@/lib/kanban-config";

const createColumnSchema = z.object({
  type: z.literal("column"),
  id: z.string().min(3).max(80),
  name: z.string().min(1).max(80),
});

const createLaneSchema = z.object({
  type: z.literal("lane"),
  id: z.string().min(3).max(80),
  name: z.string().min(1).max(80),
});

const createSchema = z.discriminatedUnion("type", [createColumnSchema, createLaneSchema]);

const patchSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("column"), id: z.string().min(1), name: z.string().min(1).max(80) }),
  z.object({ type: z.literal("lane"), id: z.string().min(1), name: z.string().min(1).max(80) }),
]);

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { id: projectId } = await context.params;
  const ok = await canAccessProject(session, projectId);
  if (!ok) return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });

  const cfg = await ensureKanbanConfig(db, projectId);
  return NextResponse.json({ ok: true, columns: cfg.columns, swimlanes: cfg.swimlanes });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { id: projectId } = await context.params;
  const ok = await canAccessProject(session, projectId);
  if (!ok) return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });

  await ensureKanbanConfig(db, projectId);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  const now = new Date();

  if (parsed.data.type === "column") {
    const existing = await db
      .select()
      .from(kanbanColumns)
      .where(and(eq(kanbanColumns.projectId, projectId), eq(kanbanColumns.id, parsed.data.id)))
      .limit(1);
    if (existing.length) return NextResponse.json({ error: "Spalten-ID existiert bereits." }, { status: 409 });
    await db.insert(kanbanColumns).values({
      id: parsed.data.id,
      projectId,
      name: parsed.data.name.trim(),
      sortOrder: 50,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    const existing = await db
      .select()
      .from(kanbanSwimlanes)
      .where(and(eq(kanbanSwimlanes.projectId, projectId), eq(kanbanSwimlanes.id, parsed.data.id)))
      .limit(1);
    if (existing.length) return NextResponse.json({ error: "Swimlane-ID existiert bereits." }, { status: 409 });
    await db.insert(kanbanSwimlanes).values({
      id: parsed.data.id,
      projectId,
      name: parsed.data.name.trim(),
      sortOrder: 50,
      createdAt: now,
      updatedAt: now,
    });
  }

  const cfg = await ensureKanbanConfig(db, projectId);
  return NextResponse.json({ ok: true, columns: cfg.columns, swimlanes: cfg.swimlanes });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { id: projectId } = await context.params;
  const ok = await canAccessProject(session, projectId);
  if (!ok) return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  const now = new Date();

  if (parsed.data.type === "column") {
    if (parsed.data.id === KANBAN_BACKLOG_ID) return NextResponse.json({ error: "Backlog kann nicht umbenannt werden." }, { status: 400 });
    const current = await db
      .select()
      .from(kanbanColumns)
      .where(and(eq(kanbanColumns.projectId, projectId), eq(kanbanColumns.id, parsed.data.id)))
      .limit(1);
    if (!current.length) return NextResponse.json({ error: "Spalte nicht gefunden." }, { status: 404 });
    await db
      .update(kanbanColumns)
      .set({ name: parsed.data.name.trim(), updatedAt: now })
      .where(eq(kanbanColumns.id, parsed.data.id));
  } else {
    if (parsed.data.id === KANBAN_DEFAULT_LANE_ID) return NextResponse.json({ error: "Standard-Swimlane kann nicht umbenannt werden." }, { status: 400 });
    const current = await db
      .select()
      .from(kanbanSwimlanes)
      .where(and(eq(kanbanSwimlanes.projectId, projectId), eq(kanbanSwimlanes.id, parsed.data.id)))
      .limit(1);
    if (!current.length) return NextResponse.json({ error: "Swimlane nicht gefunden." }, { status: 404 });
    await db
      .update(kanbanSwimlanes)
      .set({ name: parsed.data.name.trim(), updatedAt: now })
      .where(eq(kanbanSwimlanes.id, parsed.data.id));
  }

  const cfg = await ensureKanbanConfig(db, projectId);
  return NextResponse.json({ ok: true, columns: cfg.columns, swimlanes: cfg.swimlanes });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { id: projectId } = await context.params;
  const ok = await canAccessProject(session, projectId);
  if (!ok) return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const id = url.searchParams.get("id");
  if (!type || !id) return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });

  if (type === "column") {
    if (id === KANBAN_BACKLOG_ID) return NextResponse.json({ error: "Backlog kann nicht gelöscht werden." }, { status: 400 });
    const current = await db
      .select()
      .from(kanbanColumns)
      .where(and(eq(kanbanColumns.projectId, projectId), eq(kanbanColumns.id, id)))
      .limit(1);
    if (!current.length) return NextResponse.json({ error: "Spalte nicht gefunden." }, { status: 404 });
    await db.update(tasks).set({ kanbanColumnId: KANBAN_BACKLOG_ID, updatedAt: new Date() }).where(and(eq(tasks.projectId, projectId), eq(tasks.kanbanColumnId, id)));
    await db.delete(kanbanColumns).where(eq(kanbanColumns.id, id));
  } else if (type === "lane") {
    if (id === KANBAN_DEFAULT_LANE_ID) return NextResponse.json({ error: "Standard-Swimlane kann nicht gelöscht werden." }, { status: 400 });
    const current = await db
      .select()
      .from(kanbanSwimlanes)
      .where(and(eq(kanbanSwimlanes.projectId, projectId), eq(kanbanSwimlanes.id, id)))
      .limit(1);
    if (!current.length) return NextResponse.json({ error: "Swimlane nicht gefunden." }, { status: 404 });
    await db.update(tasks).set({ swimlaneId: KANBAN_DEFAULT_LANE_ID, updatedAt: new Date() }).where(and(eq(tasks.projectId, projectId), eq(tasks.swimlaneId, id)));
    await db.delete(kanbanSwimlanes).where(eq(kanbanSwimlanes.id, id));
  } else {
    return NextResponse.json({ error: "Ungültiger Typ." }, { status: 400 });
  }

  const cfg = await ensureKanbanConfig(db, projectId);
  return NextResponse.json({ ok: true, columns: cfg.columns, swimlanes: cfg.swimlanes });
}

