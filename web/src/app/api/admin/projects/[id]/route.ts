import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { projectMembers, projects, tasks } from "@/lib/schema";
import { readSessionFromCookie } from "@/lib/auth";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  imageUrl: z.string().max(5_000_000).nullable().optional(),
});

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const session = await readSessionFromCookie();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 });
  const { id } = await context.params;

  const existing = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!existing.length) return NextResponse.json({ error: "Projekt nicht gefunden." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });

  const p = parsed.data;
  const updated = await db
    .update(projects)
    .set({
      title: p.title !== undefined ? p.title.trim() : existing[0].title,
      description: p.description !== undefined ? (p.description ? p.description.trim() : null) : existing[0].description,
      imageUrl: p.imageUrl !== undefined ? p.imageUrl : existing[0].imageUrl,
    })
    .where(eq(projects.id, id))
    .returning();

  return NextResponse.json({ ok: true, project: updated[0] });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const session = await readSessionFromCookie();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 });
  const { id } = await context.params;

  const existing = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!existing.length) return NextResponse.json({ error: "Projekt nicht gefunden." }, { status: 404 });

  await db.delete(tasks).where(eq(tasks.projectId, id));
  await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
  await db.delete(projects).where(and(eq(projects.id, id)));
  return NextResponse.json({ ok: true });
}

