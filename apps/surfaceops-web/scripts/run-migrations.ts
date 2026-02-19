/**
 * Run migrations.
 * Usage: DATABASE_URL_UNPOOLED=... npx tsx scripts/run-migrations.ts
 * Fallback: DATABASE_URL=... npx tsx scripts/run-migrations.ts
 * From repo root: cd apps/surfaceops-web && DATABASE_URL_UNPOOLED=... npx tsx scripts/run-migrations.ts
 */
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveAdminDatabaseUrl } from "./_lib/database-url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const database = resolveAdminDatabaseUrl();
  if (!database) {
    console.error("DATABASE_URL_UNPOOLED or DATABASE_URL is required");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: database.connectionString });
  console.log(`[run-migrations] using ${database.source}`);
  const migrationsDir = path.join(__dirname, "..", "migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await pool.query(sql);
    console.log("Ran:", file);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
