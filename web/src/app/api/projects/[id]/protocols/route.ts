import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { canAccessProject } from "@/lib/access";
import { readSessionFromCookie } from "@/lib/auth";
import { protocolGroups, protocolSessions, protocolRows, protocolRowTasks, tasks, users } from "@/lib/schema";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const querySchema = z.object({
  search: z.string().optional(),
  groupId: z.string().uuid().optional(),
  responsibleUserId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
});

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { id: projectId } = await context.params;
  const ok = await canAccessProject(session, projectId);
  if (!ok) return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });

  const url = new URL(req.url);
  const parsedQ = querySchema.safeParse({
    search: url.searchParams.get("search") || undefined,
    groupId: url.searchParams.get("groupId") || undefined,
    responsibleUserId: url.searchParams.get("responsibleUserId") || undefined,
    taskId: url.searchParams.get("taskId") || undefined,
    month: url.searchParams.get("month") || undefined,
    year: url.searchParams.get("year") || undefined,
  });
  if (!parsedQ.success) return NextResponse.json({ error: "Ungültige Filter." }, { status: 400 });
  const q = parsedQ.data;

  const groupRows = await db.select().from(protocolGroups).where(eq(protocolGroups.projectId, projectId));
  const groupIds = new Set(groupRows.map((g) => g.id));

  const sessionRows = await db
    .select()
    .from(protocolSessions)
    .innerJoin(protocolGroups, eq(protocolSessions.groupId, protocolGroups.id))
    .where(eq(protocolGroups.projectId, projectId));

  let filteredSessions = sessionRows.map((x) => x.protocol_sessions);
  if (q.groupId) filteredSessions = filteredSessions.filter((s) => s.groupId === q.groupId);
  if (q.month) filteredSessions = filteredSessions.filter((s) => s.date.startsWith(q.month!));
  if (q.year) filteredSessions = filteredSessions.filter((s) => s.date.startsWith(q.year!));

  const sessionIds = filteredSessions.map((s) => s.id);
  if (sessionIds.length === 0) {
    const taskRows = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
    const userRows = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username })
      .from(users);
    return NextResponse.json({
      ok: true,
      groups: groupRows,
      sessions: [],
      rows: [],
      users: userRows,
      tasks: taskRows.map((t) => ({ id: t.id, title: t.title })),
    });
  }

  let rows = await db.select().from(protocolRows).where(inArray(protocolRows.sessionId, sessionIds));
  if (q.responsibleUserId) rows = rows.filter((r) => r.responsibleUserId === q.responsibleUserId);

  const rowTaskRows = await db
    .select()
    .from(protocolRowTasks)
    .innerJoin(protocolRows, eq(protocolRowTasks.rowId, protocolRows.id));
  const rowTasks = rowTaskRows
    .filter((rt) => sessionIds.includes(rt.protocol_rows.sessionId))
    .map((rt) => rt.protocol_row_tasks);

  if (q.taskId) {
    const rowsWithTask = new Set(rowTasks.filter((x) => x.taskId === q.taskId).map((x) => x.rowId));
    rows = rows.filter((r) => rowsWithTask.has(r.id));
  }

  const taskRows = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  const taskById = new Map(taskRows.map((t) => [t.id, t]));
  const userRows = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username }).from(users);
  const userById = new Map(userRows.map((u) => [u.id, u]));

  const tasksByRow = new Map<string, string[]>();
  for (const rt of rowTasks) {
    if (!tasksByRow.has(rt.rowId)) tasksByRow.set(rt.rowId, []);
    tasksByRow.get(rt.rowId)!.push(rt.taskId);
  }

  const search = (q.search || "").trim().toLowerCase();
  if (search) {
    rows = rows.filter((r) => {
      const sess = filteredSessions.find((s) => s.id === r.sessionId);
      const resp = r.responsibleUserId ? userById.get(r.responsibleUserId) : null;
      const taskIds = tasksByRow.get(r.id) || [];
      const taskTitles = taskIds.map((id) => taskById.get(id)?.title || "").join(" ");
      const hay = [
        sess?.date || "",
        resp ? `${resp.firstName} ${resp.lastName} ${resp.username}` : "",
        r.text || "",
        r.result || "",
        taskTitles,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(search);
    });
  }

  const sessionById = new Map(filteredSessions.map((s) => [s.id, s]));
  const groupsOut = groupRows
    .filter((g) => groupIds.has(g.id))
    .map((g) => ({
      id: g.id,
      projectId: g.projectId,
      name: g.name,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));

  const sessionsOut = filteredSessions.map((s) => ({
    id: s.id,
    groupId: s.groupId,
    date: s.date,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));

  const rowsOut = rows.map((r) => ({
    id: r.id,
    sessionId: r.sessionId,
    responsibleUserId: r.responsibleUserId,
    text: r.text,
    result: r.result,
    taskIds: tasksByRow.get(r.id) || [],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  return NextResponse.json({
    ok: true,
    groups: groupsOut,
    sessions: sessionsOut,
    rows: rowsOut,
    users: userRows,
    tasks: taskRows.map((t) => ({ id: t.id, title: t.title })),
    sessionById: Object.fromEntries([...sessionById.entries()]),
  });
}

const groupCreateSchema = z.object({ type: z.literal("group"), name: z.string().min(1).max(120) });
const sessionCreateSchema = z.object({
  type: z.literal("session"),
  groupId: z.string().uuid(),
  date: ymd,
});
const rowCreateSchema = z.object({
  type: z.literal("row"),
  sessionId: z.string().uuid(),
  responsibleUserId: z.string().uuid().nullable().optional(),
  text: z.string().max(5000).optional(),
  result: z.string().max(5000).optional(),
  taskIds: z.array(z.string().uuid()).optional(),
});

const createSchema = z.discriminatedUnion("type", [groupCreateSchema, sessionCreateSchema, rowCreateSchema]);

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

  const now = new Date();

  if (parsed.data.type === "group") {
    const inserted = await db
      .insert(protocolGroups)
      .values({ projectId, name: parsed.data.name.trim(), createdAt: now, updatedAt: now })
      .returning();
    return NextResponse.json({ ok: true, group: inserted[0] });
  }

  if (parsed.data.type === "session") {
    const g = await db.select().from(protocolGroups).where(and(eq(protocolGroups.id, parsed.data.groupId), eq(protocolGroups.projectId, projectId))).limit(1);
    if (!g.length) return NextResponse.json({ error: "Bereich nicht gefunden." }, { status: 404 });
    const inserted = await db
      .insert(protocolSessions)
      .values({ groupId: parsed.data.groupId, date: parsed.data.date, createdAt: now, updatedAt: now })
      .returning();
    return NextResponse.json({ ok: true, session: inserted[0] });
  }

  const s = await db
    .select()
    .from(protocolSessions)
    .innerJoin(protocolGroups, eq(protocolSessions.groupId, protocolGroups.id))
    .where(and(eq(protocolSessions.id, parsed.data.sessionId), eq(protocolGroups.projectId, projectId)))
    .limit(1);
  if (!s.length) return NextResponse.json({ error: "Sitzung nicht gefunden." }, { status: 404 });

  const inserted = await db
    .insert(protocolRows)
    .values({
      sessionId: parsed.data.sessionId,
      responsibleUserId: parsed.data.responsibleUserId ?? null,
      text: (parsed.data.text || "").slice(0, 5000),
      result: (parsed.data.result || "").slice(0, 5000),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const row = inserted[0];
  const taskIds = parsed.data.taskIds ?? [];
  for (const taskId of taskIds) {
    const t = await db.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId))).limit(1);
    if (!t.length) continue;
    await db.insert(protocolRowTasks).values({ rowId: row.id, taskId, createdAt: now }).onConflictDoNothing();
  }

  return NextResponse.json({ ok: true, row });
}

const groupPatchSchema = z.object({
  type: z.literal("group"),
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
});

const sessionPatchSchema = z.object({
  type: z.literal("session"),
  id: z.string().uuid(),
  date: ymd,
});

const rowPatchSchema = z.object({
  type: z.literal("row"),
  id: z.string().uuid(),
  responsibleUserId: z.string().uuid().nullable().optional(),
  text: z.string().max(5000).optional(),
  result: z.string().max(5000).optional(),
  taskIds: z.array(z.string().uuid()).optional(),
});

const patchSchema = z.discriminatedUnion("type", [groupPatchSchema, sessionPatchSchema, rowPatchSchema]);

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

  if (parsed.data.type === "group") {
    const current = await db
      .select()
      .from(protocolGroups)
      .where(and(eq(protocolGroups.id, parsed.data.id), eq(protocolGroups.projectId, projectId)))
      .limit(1);
    if (!current.length) return NextResponse.json({ error: "Bereich nicht gefunden." }, { status: 404 });
    const updated = await db
      .update(protocolGroups)
      .set({ name: parsed.data.name.trim(), updatedAt: now })
      .where(eq(protocolGroups.id, parsed.data.id))
      .returning();
    return NextResponse.json({ ok: true, group: updated[0] });
  }

  if (parsed.data.type === "session") {
    const current = await db
      .select()
      .from(protocolSessions)
      .innerJoin(protocolGroups, eq(protocolSessions.groupId, protocolGroups.id))
      .where(and(eq(protocolSessions.id, parsed.data.id), eq(protocolGroups.projectId, projectId)))
      .limit(1);
    if (!current.length) return NextResponse.json({ error: "Sitzung nicht gefunden." }, { status: 404 });
    const updated = await db
      .update(protocolSessions)
      .set({ date: parsed.data.date, updatedAt: now })
      .where(eq(protocolSessions.id, parsed.data.id))
      .returning();
    return NextResponse.json({ ok: true, session: updated[0] });
  }

  const current = await db
    .select()
    .from(protocolRows)
    .innerJoin(protocolSessions, eq(protocolRows.sessionId, protocolSessions.id))
    .innerJoin(protocolGroups, eq(protocolSessions.groupId, protocolGroups.id))
    .where(and(eq(protocolRows.id, parsed.data.id), eq(protocolGroups.projectId, projectId)))
    .limit(1);
  if (!current.length) return NextResponse.json({ error: "Zeile nicht gefunden." }, { status: 404 });

  const updated = await db
    .update(protocolRows)
    .set({
      responsibleUserId:
        parsed.data.responsibleUserId !== undefined ? parsed.data.responsibleUserId : current[0].protocol_rows.responsibleUserId,
      text: parsed.data.text !== undefined ? parsed.data.text.slice(0, 5000) : current[0].protocol_rows.text,
      result: parsed.data.result !== undefined ? parsed.data.result.slice(0, 5000) : current[0].protocol_rows.result,
      updatedAt: now,
    })
    .where(eq(protocolRows.id, parsed.data.id))
    .returning();

  if (parsed.data.taskIds) {
    // only tasks of this project
    const allowedTaskRows = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.projectId, projectId));
    const allowed = new Set(allowedTaskRows.map((t) => t.id));
    const next = [...new Set(parsed.data.taskIds)].filter((id) => allowed.has(id));

    const cur = await db.select().from(protocolRowTasks).where(eq(protocolRowTasks.rowId, parsed.data.id));
    const curSet = new Set(cur.map((x) => x.taskId));
    const nextSet = new Set(next);

    for (const tId of curSet) {
      if (!nextSet.has(tId)) {
        await db
          .delete(protocolRowTasks)
          .where(and(eq(protocolRowTasks.rowId, parsed.data.id), eq(protocolRowTasks.taskId, tId)));
      }
    }
    for (const tId of nextSet) {
      if (!curSet.has(tId)) {
        await db.insert(protocolRowTasks).values({ rowId: parsed.data.id, taskId: tId, createdAt: now }).onConflictDoNothing();
      }
    }
  }

  return NextResponse.json({ ok: true, row: updated[0] });
}

const deleteSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("group"), id: z.string().uuid() }),
  z.object({ type: z.literal("session"), id: z.string().uuid() }),
  z.object({ type: z.literal("row"), id: z.string().uuid() }),
]);

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { id: projectId } = await context.params;
  const ok = await canAccessProject(session, projectId);
  if (!ok) return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });

  const url = new URL(req.url);
  const parsed = deleteSchema.safeParse({
    type: url.searchParams.get("type"),
    id: url.searchParams.get("id"),
  });
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });

  if (parsed.data.type === "group") {
    const g = await db
      .select()
      .from(protocolGroups)
      .where(and(eq(protocolGroups.id, parsed.data.id), eq(protocolGroups.projectId, projectId)))
      .limit(1);
    if (!g.length) return NextResponse.json({ error: "Bereich nicht gefunden." }, { status: 404 });
    await db.delete(protocolGroups).where(eq(protocolGroups.id, parsed.data.id));
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.type === "session") {
    const s = await db
      .select()
      .from(protocolSessions)
      .innerJoin(protocolGroups, eq(protocolSessions.groupId, protocolGroups.id))
      .where(and(eq(protocolSessions.id, parsed.data.id), eq(protocolGroups.projectId, projectId)))
      .limit(1);
    if (!s.length) return NextResponse.json({ error: "Sitzung nicht gefunden." }, { status: 404 });
    await db.delete(protocolSessions).where(eq(protocolSessions.id, parsed.data.id));
    return NextResponse.json({ ok: true });
  }

  const r = await db
    .select()
    .from(protocolRows)
    .innerJoin(protocolSessions, eq(protocolRows.sessionId, protocolSessions.id))
    .innerJoin(protocolGroups, eq(protocolSessions.groupId, protocolGroups.id))
    .where(and(eq(protocolRows.id, parsed.data.id), eq(protocolGroups.projectId, projectId)))
    .limit(1);
  if (!r.length) return NextResponse.json({ error: "Zeile nicht gefunden." }, { status: 404 });
  await db.delete(protocolRows).where(eq(protocolRows.id, parsed.data.id));
  return NextResponse.json({ ok: true });
}

