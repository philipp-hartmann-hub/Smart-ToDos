import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { stripUserFromAssigneesInProject } from "@/lib/project-assignees";
import { projectMembers, users } from "@/lib/schema";
import { readSessionFromCookie } from "@/lib/auth";

const inputSchema = z.object({
  projectIds: z.array(z.string().uuid()),
});

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const session = await readSessionFromCookie();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 });
  }

  const params = await context.params;
  const userId = params.id;
  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });

  const target = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target.length) return NextResponse.json({ error: "Benutzer nicht gefunden." }, { status: 404 });
  if (target[0].role === "admin") return NextResponse.json({ error: "Admin-Zuordnung nicht änderbar." }, { status: 400 });

  const current = await db.select().from(projectMembers).where(eq(projectMembers.userId, userId));
  const currentSet = new Set(current.map((m) => m.projectId));
  const nextSet = new Set(parsed.data.projectIds);

  for (const projectId of currentSet) {
    if (!nextSet.has(projectId)) {
      await stripUserFromAssigneesInProject(db, projectId, userId);
      await db
        .delete(projectMembers)
        .where(and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)));
    }
  }
  for (const projectId of nextSet) {
    if (!currentSet.has(projectId)) {
      await db.insert(projectMembers).values({ userId, projectId });
    }
  }

  return NextResponse.json({ ok: true });
}
