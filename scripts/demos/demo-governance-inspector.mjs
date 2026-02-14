#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

function parseArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function positiveNumberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

async function narration(enabled, text, pauseMs = 0) {
  if (!enabled) return;
  console.log(`[demo] [narration] ${text}`);
  if (pauseMs > 0) {
    await delay(pauseMs);
  }
}

async function waitForHttp(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok || response.status < 500) return;
    } catch {
      // Server not ready yet.
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForEnabled(locator, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await locator.count()) > 0 && (await locator.first().isVisible()) && (await locator.first().isEnabled())) {
        return locator.first();
      }
    } catch {
      // Locator not stable yet.
    }
    await delay(250);
  }
  throw new Error("Control never became enabled.");
}

async function waitForTelemetryReady(page, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  let didReload = false;
  while (Date.now() < deadline) {
    const ready = page.getByText(/Telemetry ready/i).first();
    if ((await ready.count()) > 0 && (await ready.isVisible())) {
      return;
    }

    const unsupportedVisible = await (async () => {
      const unsupported = page.getByText(/Telemetry unsupported/i).first();
      return (await unsupported.count()) > 0 && (await unsupported.isVisible());
    })();
    if (!didReload && unsupportedVisible && Date.now() > deadline - timeoutMs / 2) {
      await page.reload({ waitUntil: "domcontentloaded" });
      didReload = true;
    }

    await delay(500);
  }
  throw new Error("Telemetry did not reach ready state.");
}

function withSimulationFlag(targetBaseUrl, enabled) {
  const url = new URL(targetBaseUrl);
  url.searchParams.set("simulateDuplicateNav", enabled ? "1" : "0");
  return url.toString();
}

async function run() {
  const inspectorBaseUrl =
    parseArg("--inspector-url", process.env.SURFACEOPS_INSPECTOR_URL) ??
    "http://localhost:3001/contracts/governance/inspector";
  const targetBaseUrl =
    parseArg("--target-url", process.env.SURFACEOPS_TARGET_URL_BASE) ?? "http://localhost:3000/";
  const prototypeId = parseArg("--prototype", process.env.SURFACEOPS_PROTOTYPE) ?? "p0004";
  const slowMo = Number(parseArg("--slow-mo", "250"));
  const headless = hasFlag("--headless");
  const keepOpen = hasFlag("--keep-open");
  const record = hasFlag("--record");
  const narrated = hasFlag("--narrated");
  const narrationShortMs = positiveNumberOr(parseArg("--narration-short-ms", "1800"), 1800);
  const narrationLongMs = positiveNumberOr(parseArg("--narration-long-ms", "3200"), 3200);

  const baselineTarget = withSimulationFlag(targetBaseUrl, false);
  const violatingTarget = withSimulationFlag(targetBaseUrl, true);
  const videoDir = path.resolve(process.cwd(), "artifacts", "governance-inspector-demo");
  if (record) {
    fs.mkdirSync(videoDir, { recursive: true });
  }

  console.log("[demo] waiting for local servers...");
  await waitForHttp("http://localhost:3000");
  await waitForHttp("http://localhost:3001/contracts/governance/inspector");
  await narration(
    narrated,
    "We are connected to both apps. Step 1 is loading inspector with the baseline target (no simulated drift).",
    narrationLongMs,
  );

  const browser = await chromium.launch({ headless, slowMo });
  const context = await browser.newContext({
    viewport: { width: 1720, height: 980 },
    ...(record ? { recordVideo: { dir: videoDir, size: { width: 1720, height: 980 } } } : {}),
  });
  const page = await context.newPage();
  const video = page.video();

  const inspectorUrl = new URL(inspectorBaseUrl);
  inspectorUrl.searchParams.set("prototype", prototypeId);
  inspectorUrl.searchParams.set("route", baselineTarget);
  const violatingInspectorUrl = new URL(inspectorBaseUrl);
  violatingInspectorUrl.searchParams.set("prototype", prototypeId);
  violatingInspectorUrl.searchParams.set("route", violatingTarget);

  console.log(`[demo] open inspector at ${inspectorUrl.toString()}`);
  await page.goto(inspectorUrl.toString(), { waitUntil: "domcontentloaded" });
  await narration(
    narrated,
    "Inspector is open. We will capture baseline from the stable page state.",
    narrationShortMs,
  );

  const captureButtonLocator = page.getByRole("button", { name: /Capture baseline|Re-capture baseline/ });
  const captureButton = await waitForEnabled(captureButtonLocator);
  console.log("[demo] capture baseline (no duplicate nav)");
  await captureButton.click();

  await page.getByText(/Baseline ready/i).first().waitFor({ timeout: 20000 });
  await narration(
    narrated,
    "Baseline is captured. Now we switch to a target URL variant that simulates duplicate primary navigation.",
    narrationLongMs,
  );

  console.log("[demo] switch target to duplicate-nav simulation");
  await page.goto(violatingInspectorUrl.toString(), { waitUntil: "domcontentloaded" });

  await waitForTelemetryReady(page);
  await narration(
    narrated,
    "Telemetry is ready on the drifted target. Next we reload telemetry to recompute violations against baseline.",
    narrationShortMs,
  );
  const reloadButton = await waitForEnabled(page.getByRole("button", { name: "Reload target surface" }));
  console.log("[demo] reload telemetry and wait for violations");
  await reloadButton.click();

  const duplicateViolation = page.getByRole("button", { name: /Duplicate navigation detected/i }).first();
  await duplicateViolation.waitFor({ timeout: 20000 });
  await duplicateViolation.click();

  await page.getByText(/Needs review 2/i).first().waitFor({ timeout: 15000 });
  await page.getByText(/Blocking 2/i).first().waitFor({ timeout: 15000 });
  await narration(
    narrated,
    "Violation list is now populated with two blocking navigation failures, and selection is linked back to canvas highlights.",
    narrationLongMs,
  );

  console.log("[demo] simulation complete: duplicate-nav violations are visible");

  if (keepOpen) {
    console.log("[demo] keeping browser open for manual walkthrough. Press Ctrl+C to stop.");
    // Keep process alive while preserving page state.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await delay(1000);
    }
  }

  await context.close();
  await browser.close();

  if (record && video) {
    console.log(`[demo] video saved: ${await video.path()}`);
  }
}

run().catch((error) => {
  console.error("[demo] failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
