import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { setSessionCookie, signSession, verifyPassword } from "@/lib/auth";

const inputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: "DATABASE_URL fehlt." }, { status: 500 });
  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const username = parsed.data.username.trim().toLowerCase();
  const row = await db.select().from(users).where(eq(users.username, username)).limit(1);
  const user = row[0];
  if (!user || !user.active) {
    return NextResponse.json({ error: "Benutzer nicht gefunden." }, { status: 401 });
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Passwort falsch." }, { status: 401 });
  }

  const token = signSession({
    sub: user.id,
    username: user.username,
    role: user.role === "admin" ? "admin" : "user",
  });
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
