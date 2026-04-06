import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects } from "@/lib/schema";
import { readSessionFromCookie } from "@/lib/auth";

const inputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  imageUrl: z.string().max(5_000_000).optional().nullable(),
});

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const session = await readSessionFromCookie();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });

  const inserted = await db
    .insert(projects)
    .values({
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      imageUrl: parsed.data.imageUrl || null,
    })
    .returning({ id: projects.id, title: projects.title, imageUrl: projects.imageUrl });

  return NextResponse.json({ ok: true, project: inserted[0] });
}
