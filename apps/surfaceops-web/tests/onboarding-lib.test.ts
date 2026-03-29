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
    const localRootInvalid = contracts.validateOnboardingRequest({
      extractMode: "local-root",
      appRoot: "",
    });
    expect(localRootInvalid.ok).toBe(false);
    expect(localRootInvalid.errors.join(" ")).toContain("App root is required");
    await rm(root, { recursive: true, force: true });
  });

  it("runOnboardingExtraction keeps canonical contract immutable and reports governance handoff metadata", async () => {
    const { root, contractsDir } = await createContractsSandbox();
    process.env.SURFACEOPS_CONTRACTS_DIR = contractsDir;
    const canonicalPath = path.join(contractsDir, "surfaces.web.contract.json");
    const beforeRaw = await readFile(canonicalPath, "utf-8");
    const beforeHash = sha256(beforeRaw);
    const runInterfacectlCli = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({
        state: "completed",
        surfaceId: "customer-example-com-dashboard",
        surfaceName: "Customer Example Dashboard",
        status: "warn",
        runId: "run-123",
        recommendedNextStep: "review-ui-ast",
        artifacts: {
          astPath: "contracts/generated/customer-example-com-dashboard.ui.surface.ast.json",
          compatibilityContractPath: "contracts/generated/customer-example-com-dashboard.contract.json",
          extractionReportPath: "contracts/generated/customer-example-com-dashboard.extraction.json",
          bundleRoot: "contracts/generated/customer-example-com-dashboard.bundle",
        },
      }, null, 2),
      stderr: "",
    });
    vi.doMock("@/lib/interfacectl", () => ({ runInterfacectlCli }));
    const contracts = await import("@/lib/contracts");

    const result = await contracts.runOnboardingExtraction({
      url: "https://customer.example.com/dashboard?token=secret",
      authMode: "browser-session",
      extractMode: "remote-url",
    });

    expect(result.state).toBe("completed");
    expect(result.surfaceId).toBe("customer-example-com-dashboard");
    expect(result.inPolicyContract).toBe(false);
    expect(result.artifacts?.astPath).toContain(".ui.surface.ast.json");
    expect(result.artifacts?.bundleRoot).toContain(".bundle");
    expect(result.recommendedRoute).toContain("/contracts/governance?");
    expect(runInterfacectlCli).toHaveBeenCalledWith(
      expect.arrayContaining(["init", "--non-interactive", "--json", "--surface-kind", "application"]),
      expect.objectContaining({ cwd: root }),
    );

    const afterRaw = await readFile(canonicalPath, "utf-8");
    const afterHash = sha256(afterRaw);
    expect(afterHash).toBe(beforeHash);
    const membership = contracts.getPolicyMembership("customer-example-com-dashboard");
    expect(membership.inPolicyContract).toBe(false);

    await rm(root, { recursive: true, force: true });
  });

  it("loadBootstrapGovernanceHandoff reads generated AST handoff metadata", async () => {
    const { root, contractsDir } = await createContractsSandbox();
    process.env.SURFACEOPS_CONTRACTS_DIR = contractsDir;
    const generatedDir = path.join(contractsDir, "generated");
    await writeFile(
      path.join(generatedDir, "customer-example-com-dashboard.ui.surface.ast.json"),
      JSON.stringify({
        astId: "customer-example-com-dashboard.generated",
        version: "0.1.0",
        migration: { escalations: [{ code: "test.warning", message: "example" }] },
        surfaces: [
          {
            id: "customer-example-com-dashboard",
            displayName: "Customer Example Dashboard",
            nodes: [{ id: "root" }, { id: "main" }],
            platforms: [{ platform: "web" }, { platform: "ios" }],
          },
        ],
      }, null, 2),
      "utf-8",
    );
    await writeFile(
      path.join(generatedDir, "customer-example-com-dashboard.contract.json"),
      JSON.stringify({ contractId: "customer-example-com-dashboard.generated", version: "0.1.0" }, null, 2),
      "utf-8",
    );
    await writeFile(
      path.join(generatedDir, "customer-example-com-dashboard.extraction.json"),
      JSON.stringify({ surfaceId: "customer-example-com-dashboard" }, null, 2),
      "utf-8",
    );
    await mkdir(path.join(generatedDir, "customer-example-com-dashboard.bundle"), { recursive: true });
    const contracts = await import("@/lib/contracts");
    const handoff = contracts.loadBootstrapGovernanceHandoff("customer-example-com-dashboard");
    expect(handoff?.displayName).toBe("Customer Example Dashboard");
    expect(handoff?.nodeCount).toBe(2);
    expect(handoff?.platforms).toEqual(["web", "ios"]);
    expect(handoff?.migrationEscalationCount).toBe(1);
    expect(handoff?.paths.astPath).toContain(".ui.surface.ast.json");
    expect(handoff?.paths.bundleRoot).toContain(".bundle");
    await rm(root, { recursive: true, force: true });
  });
});
