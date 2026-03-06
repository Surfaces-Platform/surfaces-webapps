import { Pool, type PoolConfig } from "pg";

function sanitizeConnectionString(value: string | undefined): string | undefined {
  if (!value) {
    return value;
  }

  const sanitized = value.replace(/\\[rn]/g, "").trim();
  return sanitized.replace(/^(['"])+/, "").replace(/(['"])+$/, "");
}

function createPoolConfig(connectionString: string | undefined): PoolConfig {
  if (!connectionString) {
    return {};
  }

  const url = new URL(connectionString);
  const sslmode = url.searchParams.get("sslmode");

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    database: url.pathname.replace(/^\//, ""),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: sslmode ? { rejectUnauthorized: false } : undefined,
  };
}

const poolConfig: PoolConfig = createPoolConfig(
  sanitizeConnectionString(process.env.DATABASE_URL),
);

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
