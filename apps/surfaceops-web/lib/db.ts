import { Pool, type PoolConfig } from "pg";

function sanitizeConnectionString(value: string | undefined): string | undefined {
  if (!value) {
    return value;
  }

  return value.replace(/\\[rn]/g, "").trim();
}

const poolConfig: PoolConfig = {
  connectionString: sanitizeConnectionString(process.env.DATABASE_URL),
};

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    if (!sanitizeConnectionString(process.env.DATABASE_URL)) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool(poolConfig);
  }
  return pool;
}

export async function runMigrations(client: { query: (q: string) => Promise<unknown> }): Promise<void> {
  const fs = await import("fs");
  const path = await import("path");
  const migrationsDir = path.join(process.cwd(), "migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await client.query(sql);
  }
}
