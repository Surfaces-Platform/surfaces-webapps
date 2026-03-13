import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

function resolveRepoRoot(start = process.cwd()): string {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error("Could not resolve the Surfaces workspace root.");
    }
    current = parent;
  }
}

export function resolveBlobRoot(): string {
  if (process.env.SURFACEOPS_BLOB_ROOT?.trim()) {
    return path.resolve(process.env.SURFACEOPS_BLOB_ROOT);
  }
  return path.join(resolveRepoRoot(), "artifacts", "surfaceops-blobs");
}

async function copyDirectory(sourceDir: string, targetDir: string): Promise<void> {
  await fsp.mkdir(targetDir, { recursive: true });
  const entries = await fsp.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
      continue;
    }
    await fsp.mkdir(path.dirname(targetPath), { recursive: true });
    await fsp.copyFile(sourcePath, targetPath);
  }
}

export async function writeArtifactTree(ref: string, sourceDir: string): Promise<string> {
  const root = resolveBlobRoot();
  const targetDir = path.join(root, ref);
  await fsp.rm(targetDir, { recursive: true, force: true });
  await copyDirectory(sourceDir, targetDir);
  return targetDir;
}

export function resolveBlobRef(ref: string): string {
  return path.join(resolveBlobRoot(), ref);
}
