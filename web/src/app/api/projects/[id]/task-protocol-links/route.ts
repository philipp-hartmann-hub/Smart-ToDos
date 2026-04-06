import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccessProject } from "@/lib/access";
import { readSessionFromCookie } from "@/lib/auth";
import { protocolGroups, protocolRowTasks, protocolRows, protocolSessions } from "@/lib/schema";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { id: projectId } = await context.params;
  const ok = await canAccessProject(session, projectId);
  if (!ok) return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });

  const joined = await db
    .select({
      taskId: protocolRowTasks.taskId,
      rowId: protocolRows.id,
      sessionId: protocolSessions.id,
      sessionDate: protocolSessions.date,
      groupId: protocolGroups.id,
      groupName: protocolGroups.name,
    })
    .from(protocolRowTasks)
    .innerJoin(protocolRows, eq(protocolRowTasks.rowId, protocolRows.id))
    .innerJoin(protocolSessions, eq(protocolRows.sessionId, protocolSessions.id))
    .innerJoin(protocolGroups, and(eq(protocolSessions.groupId, protocolGroups.id), eq(protocolGroups.projectId, projectId)));

  const linksByTaskId: Record<
    string,
    Array<{ rowId: string; sessionId: string; sessionDate: string; groupId: string; groupName: string }>
  > = {};
  for (const j of joined) {
    if (!linksByTaskId[j.taskId]) linksByTaskId[j.taskId] = [];
    linksByTaskId[j.taskId].push({
      rowId: j.rowId,
      sessionId: j.sessionId,
      sessionDate: j.sessionDate,
      groupId: j.groupId,
      groupName: j.groupName,
    });
  }

  return NextResponse.json({ ok: true, linksByTaskId });
}

