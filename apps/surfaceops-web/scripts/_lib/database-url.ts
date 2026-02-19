export type AdminDatabaseUrlSource = "DATABASE_URL_UNPOOLED" | "DATABASE_URL";

export interface AdminDatabaseUrl {
  connectionString: string;
  source: AdminDatabaseUrlSource;
}

function readNonEmptyEnv(name: string): string | null {
  const value = process.env[name];
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveAdminDatabaseUrl(): AdminDatabaseUrl | null {
  const unpooled = readNonEmptyEnv("DATABASE_URL_UNPOOLED");
  if (unpooled) {
    return {
      connectionString: unpooled,
      source: "DATABASE_URL_UNPOOLED",
    };
  }

  const pooled = readNonEmptyEnv("DATABASE_URL");
  if (pooled) {
    return {
      connectionString: pooled,
      source: "DATABASE_URL",
    };
  }

  return null;
}
