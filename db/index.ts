import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is unavailable. Configure PostgreSQL before using the database."
    );
  }

  if (!client) {
    client = postgres(connectionString, {
      max: Number(process.env.DB_POOL_MAX ?? 10),
      prepare: false,
    });
  }

  database ??= drizzle(client, { schema });
  return database;
}

export async function closeDb() {
  if (client) await client.end({ timeout: 5 });
  client = undefined;
  database = undefined;
}
