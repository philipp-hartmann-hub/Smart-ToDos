import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";

async function main() {
  loadEnv({ path: ".env.local" });
  loadEnv();
  const { db } = await import("../src/lib/db");
  const { users } = await import("../src/lib/schema");
  const { hashPassword } = await import("../src/lib/auth");
  if (!db) throw new Error("DATABASE_URL fehlt.");
  const username = "admin";
  const password = "Admin123!";
  const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (existing.length) {
    console.log("Admin existiert bereits.");
    return;
  }
  const passwordHash = await hashPassword(password);
  await db.insert(users).values({
    firstName: "System",
    lastName: "Admin",
    username,
    passwordHash,
    role: "admin",
    active: true,
  });
  console.log("Admin angelegt: admin / Admin123!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
