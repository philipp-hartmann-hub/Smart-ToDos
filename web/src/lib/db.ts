import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const databaseUrl = process.env.DATABASE_URL;
export const db = databaseUrl ? drizzle({ client: neon(databaseUrl) }) : null;
