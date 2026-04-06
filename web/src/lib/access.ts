import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectMembers } from "@/lib/schema";

export type SessionLike = { sub: string; role: "admin" | "user"; username: string };

export async function canAccessProject(session: SessionLike, projectId: string) {
  if (session.role === "admin") return true;
  if (!db) return false;
  const rows = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.userId, session.sub), eq(projectMembers.projectId, projectId)))
    .limit(1);
  return rows.length > 0;
}
