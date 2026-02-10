import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

async function createContractsSandbox() {
  const root = await mkdtemp(path.join(os.tmpdir(), "surfaceops-onboarding-lib-"));
  const contractsDir = path.join(root, "contracts");
  await mkdir(path.join(contractsDir, "generated"), { recursive: true });
  await writeFile(
    path.join(contractsDir, "surfaces.web.contract.json"),
    JSON.stringify({
      contractId: "surfaces.web",
      version: "0.1.0",
      surfaces: [],
      sections: [],
      constraints: {
        motion: { allowedDurationsMs: [120], allowedTimingFunctions: ["linear"] },
      },
    }, null, 2),
    "utf-8",
  );
  return { root, contractsDir };
}

afterEach(() => {
  delete process.env.SURFACEOPS_CONTRACTS_DIR;
  vi.resetModules();
});

describe("onboarding contracts helpers", () => {
  it("validates onboarding requests", async () => {
    const { root, contractsDir } = await createContractsSandbox();
    process.env.SURFACEOPS_CONTRACTS_DIR = contractsDir;
    const contracts = await import("@/lib/contracts");
    const invalid = contracts.validateOnboardingRequest({ url: "not-a-url" });
    expect(invalid.ok).toBe(false);
    expect(invalid.errors.join(" ")).toContain("URL must be valid");
    await rm(root, { recursive: true, force: true });
  });

  it("runOnboardingExtraction keeps canonical contract immutable and reports policy membership", async () => {
    const { root, contractsDir } = await createContractsSandbox();
    process.env.SURFACEOPS_CONTRACTS_DIR = contractsDir;
    const canonicalPath = path.join(contractsDir, "surfaces.web.contract.json");
    const beforeRaw = await readFile(canonicalPath, "utf-8");
    const beforeHash = sha256(beforeRaw);
    const contracts = await import("@/lib/contracts");

    const result = contracts.runOnboardingExtraction({
      url: "https://customer.example.com/dashboard?token=secret",
      authMode: "browser-session",
      extractMode: "remote-url",
    });

    expect(result.state).toBe("completed");
    expect(result.surfaceId).toBe("customer-example-com-dashboard");
    expect(result.inPolicyContract).toBe(false);
    expect(result.extraction?.reportPath).toContain(".extraction.json");

    const afterRaw = await readFile(canonicalPath, "utf-8");
    const afterHash = sha256(afterRaw);
    expect(afterHash).toBe(beforeHash);
    const membership = contracts.getPolicyMembership("customer-example-com-dashboard");
    expect(membership.inPolicyContract).toBe(false);

    await rm(root, { recursive: true, force: true });
  });

  it("buildOnboardingArtifacts redacts sensitive URL query params", async () => {
    const { root, contractsDir } = await createContractsSandbox();
    process.env.SURFACEOPS_CONTRACTS_DIR = contractsDir;
    const contracts = await import("@/lib/contracts");
    const draft = contracts.buildOnboardingArtifacts({
      url: "https://example.com/path?token=abc&foo=bar",
    });
    expect(draft.extraction.onboarding?.sourceUrl).toContain("token=REDACTED");
    expect(draft.extraction.onboarding?.sourceUrl).toContain("foo=bar");
    await rm(root, { recursive: true, force: true });
  });
});
