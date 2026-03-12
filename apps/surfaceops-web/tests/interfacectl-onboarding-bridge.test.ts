import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const INTERFACECTL_ROOT_ENV = "SURFACES_INTERFACECTL_ROOT";
const CONTRACTS_DIR_ENV = "SURFACEOPS_CONTRACTS_DIR";

async function makeFakeInterfacectlRepo() {
  const root = await mkdtemp(path.join(os.tmpdir(), "surfaceops-interfacectl-repo-"));
  const cliDir = path.join(root, "packages", "interfacectl-cli");
  const onboardingDir = path.join(root, "packages", "interfacectl-onboarding");
  const distDir = path.join(onboardingDir, "dist");
  await mkdir(cliDir, { recursive: true });
  await mkdir(distDir, { recursive: true });
  await writeFile(path.join(cliDir, "package.json"), JSON.stringify({ name: "@surfaces/interfacectl-cli" }), "utf8");
  await writeFile(
    path.join(onboardingDir, "package.json"),
    JSON.stringify({ name: "@surfaces/interfacectl-onboarding", type: "module" }),
    "utf8",
  );
  await writeFile(
    path.join(distDir, "index.js"),
    [
      "export async function runOnboardingRequest(request) {",
      "  return {",
      "    state: 'completed',",
      "    surfaceId: request.surfaceId ?? 'forwarded-surface',",
      "    status: 'warn',",
      "    gateStatus: 'ok',",
      "    echoedRequest: request,",
      "  };",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
  return root;
}

async function makeContractsRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "surfaceops-contracts-root-"));
  await mkdir(path.join(root, "contracts", "generated"), { recursive: true });
  return root;
}

afterEach(() => {
  delete process.env[INTERFACECTL_ROOT_ENV];
  delete process.env[CONTRACTS_DIR_ENV];
});

describe("SurfaceOps onboarding bridge", () => {
  it("forwards auth profile and gate options to the shared onboarding package", async () => {
    const fakeRepo = await makeFakeInterfacectlRepo();
    const contractsRoot = await makeContractsRoot();
    process.env[INTERFACECTL_ROOT_ENV] = fakeRepo;
    process.env[CONTRACTS_DIR_ENV] = path.join(contractsRoot, "contracts");

    try {
      const { runSurfaceOpsOnboarding } = await import("@/lib/interfacectl-onboarding");
      const result = await runSurfaceOpsOnboarding({
        url: "https://secure.example.com/dashboard",
        surfaceId: "secure-dashboard",
        surfaceName: "Secure Dashboard",
        authMode: "browser-session",
        authProfileName: "secure-profile",
        continueOnGate: true,
      }) as { echoedRequest: Record<string, unknown> };

      expect(result.echoedRequest.rootDir).toBe(contractsRoot);
      expect(result.echoedRequest.sourceMode).toBe("remote-url");
      expect(result.echoedRequest.url).toBe("https://secure.example.com/dashboard");
      expect(result.echoedRequest.surfaceId).toBe("secure-dashboard");
      expect(result.echoedRequest.surfaceName).toBe("Secure Dashboard");
      expect(result.echoedRequest.authProfileName).toBe("secure-profile");
      expect(result.echoedRequest.continueOnGate).toBe(true);
      expect(result.echoedRequest.outDir).toBe(path.join("contracts", "generated"));
    } finally {
      await rm(fakeRepo, { recursive: true, force: true });
      await rm(contractsRoot, { recursive: true, force: true });
    }
  });
});
