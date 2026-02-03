/**
 * Run migrations. Usage: DATABASE_URL=... npx tsx scripts/run-migrations.ts
 * From repo root: cd apps/surfaceops-web && DATABASE_URL=... npx tsx scripts/run-migrations.ts
 */
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
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
