import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function sha256File(filePath) {
  const content = fs.readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

async function makeContractsSandbox() {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-browser-smoke-"));
  await fsp.mkdir(path.join(dir, "contracts", "generated"), { recursive: true });
  await fsp.writeFile(
    path.join(dir, "contracts", "surfaces.web.contract.json"),
    JSON.stringify({
      contractId: "surfaces.web",
      version: "0.1.0",
      surfaces: [],
      sections: [],
      constraints: {
        motion: { allowedDurationsMs: [120], allowedTimingFunctions: ["linear"] },
      },
    }, null, 2),
    "utf8",
  );
  return dir;
}

async function waitForServer(url, isProcessRunning, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessRunning()) {
      throw new Error(`Server process exited before becoming ready: ${url}`);
    }
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // server not ready yet
    }
    await wait(500);
  }
  throw new Error(`Timed out waiting for server: ${url}`);
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate free port.")));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on("error", reject);
  });
}

test("browser smoke: onboarding empty-state flow redirects to runs detail", { timeout: 120_000 }, async (t) => {
  let chromium;
  try {
    ({ chromium } = await import("@playwright/test"));
  } catch {
    t.skip("Playwright is not installed.");
    return;
  }

  const sandbox = await makeContractsSandbox();
  const canonicalPath = path.join(sandbox, "contracts", "surfaces.web.contract.json");
  const beforeHash = sha256File(canonicalPath);
  const port = await getFreePort();

  const dev = spawn("pnpm", ["exec", "next", "dev", "--port", String(port), "--webpack"], {
    cwd: appDir,
    env: {
      ...process.env,
      SURFACEOPS_CONTRACTS_DIR: path.join(sandbox, "contracts"),
      SURFACEOPS_TEST_BYPASS_AUTH: "1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: "pipe",
  });
  let serverLogs = "";
  dev.stdout.on("data", (chunk) => {
    serverLogs += chunk.toString();
  });
  dev.stderr.on("data", (chunk) => {
    serverLogs += chunk.toString();
  });
  let exited = false;
  dev.on("exit", () => {
    exited = true;
  });

  try {
    try {
      await waitForServer(`http://127.0.0.1:${port}/contracts`, () => !exited);
    } catch (error) {
      throw new Error(`${error instanceof Error ? error.message : String(error)}\nServer logs:\n${serverLogs}`);
    }
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
    } catch (error) {
      t.skip(`Chromium not available for Playwright: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    try {
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:${port}/contracts`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Generate First Contract" }).waitFor({ timeout: 20_000 });
      await page.getByPlaceholder("https://customer.example.com").fill("https://example.com/products");
      await page.getByRole("button", { name: "Generate First Contract" }).click();
      await page.waitForURL(/\/contracts\/runs\//, { timeout: 20_000 });
      const url = page.url();
      assert.match(url, /\/contracts\/runs\/example-com-products$/);
      await page.getByText("Activated (not yet in canonical policy)").waitFor({ timeout: 10_000 });
    } finally {
      await browser.close();
    }

    const afterHash = sha256File(canonicalPath);
    assert.equal(afterHash, beforeHash, "Canonical contract must remain unchanged.");
  } finally {
    dev.kill("SIGTERM");
    await wait(500);
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});
