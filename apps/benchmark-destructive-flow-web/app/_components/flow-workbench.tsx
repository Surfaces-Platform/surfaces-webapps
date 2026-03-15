"use client";

import { useState } from "react";
import { ConfirmStep } from "./confirm-step";
import { RequestForm } from "./request-form";
import { ReviewStep } from "./review-step";

export function FlowWorkbench() {
  const [workspace, setWorkspace] = useState("northwind-prod");
  const [windowLabel, setWindowLabel] = useState("Next maintenance window");
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="flowGrid">
      <RequestForm
        workspace={workspace}
        windowLabel={windowLabel}
        onWorkspaceChange={setWorkspace}
        onWindowChange={setWindowLabel}
      />
      <ReviewStep workspace={workspace} windowLabel={windowLabel} />
      <ConfirmStep
        confirmed={confirmed}
        onConfirmedChange={setConfirmed}
        workspace={workspace}
      />
    </div>
  );
}
