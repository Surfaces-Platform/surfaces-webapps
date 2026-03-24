"use client";

import { useState } from "react";
import { ConfirmStep } from "./confirm-step";
import { RequestForm } from "./request-form";
import { ReviewStep } from "./review-step";

type FlowWorkbenchProps = {
  runtimeReady: boolean;
  simulateMissingReviewStep: boolean;
  simulateMissingConfirmTransition: boolean;
  simulateTerminalBackEdge: boolean;
  simulateUnobservableFlow: boolean;
};

export function FlowWorkbench(input: FlowWorkbenchProps) {
  const [workspace, setWorkspace] = useState("northwind-prod");
  const [windowLabel, setWindowLabel] = useState("Next maintenance window");
  const [confirmed, setConfirmed] = useState(false);
  const includeFlowMarkers = input.runtimeReady && !input.simulateUnobservableFlow;

  return (
    <div
      className="flowGrid"
      {...(includeFlowMarkers ? { "data-contract-flow-id": "workspace-delete" } : {})}
    >
      <RequestForm
        includeFlowMarkers={includeFlowMarkers}
        workspace={workspace}
        windowLabel={windowLabel}
        onWorkspaceChange={setWorkspace}
        onWindowChange={setWindowLabel}
      />
      <ReviewStep
        runtimeReady={input.runtimeReady}
        includeFlowStepMarker={includeFlowMarkers && !input.simulateMissingReviewStep}
        includeConfirmTransitionMarker={includeFlowMarkers && !input.simulateMissingConfirmTransition}
        workspace={workspace}
        windowLabel={windowLabel}
      />
      <ConfirmStep
        confirmed={confirmed}
        includeFlowMarkers={includeFlowMarkers}
        onConfirmedChange={setConfirmed}
        runtimeReady={input.runtimeReady}
        simulateTerminalBackEdge={includeFlowMarkers && input.simulateTerminalBackEdge}
        workspace={workspace}
      />
    </div>
  );
}
