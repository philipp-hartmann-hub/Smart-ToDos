import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectMembers, users } from "@/lib/schema";
import { hashPassword, readSessionFromCookie } from "@/lib/auth";

const inputSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  username: z.string().min(3).max(120),
  password: z.string().min(8).max(200),
  projectIds: z.array(z.string().uuid()).default([]),
});

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const session = await readSessionFromCookie();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const username = parsed.data.username.trim().toLowerCase();
  const exists = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (exists.length) return NextResponse.json({ error: "Benutzername existiert bereits." }, { status: 409 });

  const passwordHash = await hashPassword(parsed.data.password);
  const inserted = await db
    .insert(users)
    .values({
      firstName: parsed.data.firstName.trim(),
      lastName: parsed.data.lastName.trim(),
      username,
      passwordHash,
      role: "user",
      active: true,
    })
    .returning({ id: users.id, username: users.username });

  const userId = inserted[0]?.id;
  if (userId && parsed.data.projectIds.length) {
    for (const projectId of parsed.data.projectIds) {
      const already = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)))
        .limit(1);
      if (!already.length) {
        await db.insert(projectMembers).values({ userId, projectId });
      }
    }
  }

  return NextResponse.json({ ok: true, user: inserted[0] });
}
