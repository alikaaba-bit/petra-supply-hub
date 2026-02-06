import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Global connection pool singleton for serverless environments.
 *
 * In serverless, we use max: 1 to prevent connection pooling issues.
 * Each Lambda/Vercel function gets one connection, released after execution.
 *
 * For traditional servers, increase maxConnections in production.
 */
declare global {
  // eslint-disable-next-line no-var
  var _dbPool: Pool | undefined;
}

let pool: Pool;

if (process.env.NODE_ENV === "production") {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1, // Serverless: one connection per instance
  });
} else {
  if (!global._dbPool) {
    global._dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1, // Development: prevent connection exhaustion
    });
  }
  pool = global._dbPool;
}

/**
 * Drizzle database instance with full schema.
 *
 * Usage:
 * ```ts
 * import { db } from "@/server/db";
 *
 * const users = await db.query.users.findMany();
 * ```
 */
export const db = drizzle(pool, { schema });
