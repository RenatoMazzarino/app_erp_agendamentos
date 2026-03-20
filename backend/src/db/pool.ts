import pg from "pg";

import type { AppEnv } from "../config/env.js";

const { Pool } = pg;

export type DbPool = pg.Pool;

export function createDbPool(env: AppEnv): DbPool | null {
  if (env.DATABASE_URL) {
    return new Pool({
      connectionString: env.DATABASE_URL,
      ssl: env.DB_SSL ? { rejectUnauthorized: false } : undefined
    });
  }

  if (!env.DB_HOST || !env.DB_NAME || !env.DB_USER || !env.DB_PASSWORD) {
    return null;
  }

  return new Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: env.DB_SSL ? { rejectUnauthorized: false } : undefined
  });
}

export async function pingDb(db: DbPool): Promise<boolean> {
  try {
    await db.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
