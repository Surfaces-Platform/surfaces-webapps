const interfacectlRepoUrl = "https://github.com/Surfaces-Platform/interfacectl";

function docLink(path, label, description) {
  return {
    href: `${interfacectlRepoUrl}/blob/main/${path}`,
    label,
    description,
    external: true,
  };
}

export const interfacectlDocLinks = {
  repo: {
    href: interfacectlRepoUrl,
    label: "GitHub repo",
    description: "Source, issues, and release history.",
    external: true,
  },
  cli: docLink(
    "README.md",
    "CLI docs",
    "Top-level install, lifecycle, and command guidance.",
  ),
  api: docLink(
    "API.md",
    "API reference",
    "CLI flags, exit codes, and output contracts.",
  ),
  contractValidation: docLink(
    "docs/contract-validation.md",
    "Contract validation",
    "Canonical compliance and exit-code semantics.",
  ),
  runtimeEdge: docLink(
    "docs/runtime-edge.md",
    "Runtime (edge)",
    "Canonical runtime-consumption and edge-enforcement guidance.",
  ),
  adapterQuickStart: docLink(
    "docs/ai-generator-adapter-quickstart.md",
    "Adapter quick start",
    "Canonical generation-time adapter flow and mode guidance.",
  ),
  adapterApi: docLink(
    "docs/ai-generator-adapter-api.md",
    "Adapter API",
    "Canonical request, response, and verdict semantics.",
  ),
  toolPlaybooks: docLink(
    "docs/ai-tool-playbooks.md",
    "Tool playbooks",
    "Canonical integration patterns across local and hosted generators.",
  ),
  generatorConsumption: docLink(
    "docs/generator-consumption.md",
    "Generator consumption",
    "How generators should use contracts to improve generation accuracy.",
  ),
  shellBoundary: docLink(
    "docs/shell-boundary.md",
    "Shell boundary",
    "Canonical shell-ownership semantics for generators.",
  ),
};

export const interfacectlDocsNavigationLinks = [
  { label: "GitHub", href: interfacectlDocLinks.repo.href },
  { label: "API", href: interfacectlDocLinks.api.href },
];

export const interfacectlGenerationReferenceCards = [
  interfacectlDocLinks.adapterQuickStart,
  interfacectlDocLinks.generatorConsumption,
  interfacectlDocLinks.shellBoundary,
];

export const interfacectlIntegrationReferenceCards = [
  interfacectlDocLinks.contractValidation,
  interfacectlDocLinks.adapterApi,
  interfacectlDocLinks.toolPlaybooks,
];

export const interfacectlRuntimeReferenceCards = [
  interfacectlDocLinks.contractValidation,
  interfacectlDocLinks.runtimeEdge,
  interfacectlDocLinks.api,
];

export const interfacectlDiscoveryCards = [
  interfacectlDocLinks.cli,
  interfacectlDocLinks.api,
  interfacectlDocLinks.contractValidation,
  interfacectlDocLinks.runtimeEdge,
  interfacectlDocLinks.adapterQuickStart,
  interfacectlDocLinks.generatorConsumption,
];
