import { existsSync } from "node:fs";
import path from "node:path";

export function resolveWorkspaceRoot(): string {
  const cwd = process.cwd();
  const candidates = [cwd, path.resolve(cwd, ".."), path.resolve(cwd, "..", "..")];
  for (const candidate of candidates) {
    const manifestPath = path.join(
      candidate,
      "apps",
      "surfaceops-web",
      "prototypes",
      "governance",
      "manifest.json",
    );
    if (existsSync(manifestPath)) {
      return candidate;
    }
  }
  throw new Error("Could not resolve workspace root for governance prototype registry.");
}
