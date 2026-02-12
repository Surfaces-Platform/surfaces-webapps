"use client";

import React from "react";
import { makeDefaultContract } from "../_lib/default-contract";
import { simulateFindings } from "../_lib/simulator";
import type {
  ContractState,
  EnvironmentId,
  GovernanceTabId,
  SimulationFinding,
  SurfaceContract,
  SurfaceId,
  ValidationFinding,
} from "../_lib/types";
import { validateContract } from "../_lib/validator";

type Scope = {
  surface: SurfaceId;
  contractState: ContractState;
  environment: EnvironmentId;
};

type FocusState = {
  tab: GovernanceTabId;
  path: string;
} | null;

type Store = {
  scope: Scope;
  contract: SurfaceContract;
  findings: ValidationFinding[];
  simulation: SimulationFinding[];
  isValidForPublish: boolean;
  activeTab: GovernanceTabId;
  focusState: FocusState;
  setScope: (patch: Partial<Scope>) => void;
  setActiveTab: (tab: GovernanceTabId) => void;
  focusTab: (tab: GovernanceTabId, path: string) => void;
  clearFocus: () => void;
  updateContract: (fn: (contract: SurfaceContract) => SurfaceContract) => void;
  setContractFromJson: (raw: string) => { ok: boolean; error?: string };
};

const ContractContext = React.createContext<Store | null>(null);

function recompute(contract: SurfaceContract): {
  findings: ValidationFinding[];
  simulation: SimulationFinding[];
  isValidForPublish: boolean;
} {
  const findings = validateContract(contract);
  const simulation = simulateFindings(contract);
  const hasBlocking = findings.some((finding) => finding.level === "danger");
  return {
    findings,
    simulation,
    isValidForPublish: !hasBlocking,
  };
}

export function ContractProvider({
  children,
  initialContract,
}: {
  children: React.ReactNode;
  initialContract?: SurfaceContract;
}) {
  const bootstrapContract = initialContract ?? makeDefaultContract("app");
  const [scope, setScopeState] = React.useState<Scope>({
    surface: bootstrapContract.surface,
    contractState: "draft",
    environment: "dev",
  });

  const [activeTab, setActiveTab] = React.useState<GovernanceTabId>("layout");
  const [focusState, setFocusState] = React.useState<FocusState>(null);
  const [contract, setContract] = React.useState<SurfaceContract>(() => bootstrapContract);
  const [findings, setFindings] = React.useState<ValidationFinding[]>(() =>
    validateContract(bootstrapContract),
  );
  const [simulation, setSimulation] = React.useState<SimulationFinding[]>(() =>
    simulateFindings(bootstrapContract),
  );
  const [isValidForPublish, setIsValidForPublish] = React.useState<boolean>(true);

  React.useEffect(() => {
    const next = recompute(contract);
    setFindings(next.findings);
    setSimulation(next.simulation);
    setIsValidForPublish(next.isValidForPublish);
  }, [contract]);

  function setScope(patch: Partial<Scope>) {
    setScopeState((current) => {
      const next = { ...current, ...patch };
      if (patch.surface && patch.surface !== current.surface) {
        setContract(makeDefaultContract(patch.surface));
      }
      return next;
    });
  }

  function updateContract(fn: (next: SurfaceContract) => SurfaceContract) {
    setContract((current) => fn(current));
  }

  function setContractFromJson(raw: string) {
    try {
      const parsed = JSON.parse(raw) as SurfaceContract;
      setContract(parsed);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid JSON",
      };
    }
  }

  function focusTab(tab: GovernanceTabId, path: string) {
    setActiveTab(tab);
    setFocusState({ tab, path });
  }

  function clearFocus() {
    setFocusState(null);
  }

  const value: Store = {
    scope,
    contract,
    findings,
    simulation,
    isValidForPublish,
    activeTab,
    focusState,
    setScope,
    setActiveTab,
    focusTab,
    clearFocus,
    updateContract,
    setContractFromJson,
  };

  return (
    <ContractContext.Provider value={value}>{children}</ContractContext.Provider>
  );
}

export function useContractStore() {
  const context = React.useContext(ContractContext);
  if (!context) {
    throw new Error("useContractStore must be used within ContractProvider");
  }
  return context;
}
