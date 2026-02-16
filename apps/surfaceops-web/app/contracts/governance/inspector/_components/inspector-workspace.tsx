"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SurfaceContract } from "../../_lib/types";
import { INSPECTOR_CHANNEL, INSPECTOR_VERSION, isInspectorMessage } from "../_lib/protocol";
import { runInspectorChecks } from "../_lib/checker";
import { deriveInspectorBaselineFromSnapshot } from "../_lib/baseline";
import type {
  InspectorCategory,
  InspectorDomSnapshot,
  ReliabilityReason,
  ReliabilityTier,
  InspectorTargetBaselineRecord,
  InspectorViolation,
} from "../_lib/types";
import {
  buildInspectorQuery,
  isAbsoluteHttpUrl,
  normalizeInspectorRouteInput,
  type InspectorPanelState,
} from "../_lib/url-state";
import type {
  InspectorTargetMode,
  InspectorTargetProfile,
  InspectorTargetProfileId,
} from "../_lib/target-registry";
import styles from "./inspector.module.css";

type TelemetryStatus = "connecting" | "ready" | "unsupported";
type BaselineStatus = "idle" | "loading" | "loaded" | "missing" | "error";

type InspectorWorkspaceProps = {
  prototypeOptions: Array<{ id: string; title: string }>;
  selectedPrototypeId: string;
  snapshotOptions: Array<{ snapshotId: string; createdAt: string }>;
  selectedSnapshotId: string;
  baselineSnapshotId: string;
  routeOptions: string[];
  selectedRoute: string;
  targetProfiles: InspectorTargetProfile[];
  initialTargetMode: InspectorTargetMode;
  initialTargetProfileId: InspectorTargetProfileId;
  canWrite: boolean;
  latestExtractionUpdatedAt: string;
  contractDraft: SurfaceContract;
  requiredSections: string[];
  initialViolationId?: string;
  initialNodeId?: string;
  initialCategory?: string;
  initialPanel: InspectorPanelState;
};

const CATEGORY_ORDER: Array<InspectorCategory> = [
  "layout",
  "navigation",
  "generation",
  "drift",
  "sections",
  "tokens",
  "other",
];

const PANEL_WIDTH_KEY = "surfaceops.governance.inspector.panelWidth";
const TARGET_ROUTE_STORAGE_PREFIX = "surfaceops.governance.inspector.targetRoute.";
const TARGET_MODE_STORAGE_PREFIX = "surfaceops.governance.inspector.targetMode.";
const TARGET_PROFILE_STORAGE_PREFIX = "surfaceops.governance.inspector.targetProfile.";

function clampPanelWidth(value: number): number {
  return Math.min(720, Math.max(300, value));
}

function categoryLabel(category: InspectorCategory): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function severityLabel(value: InspectorViolation["severity"]): string {
  if (value === "blocking") return "Blocking";
  if (value === "warning") return "Warning";
  return "Info";
}

function severityClass(value: InspectorViolation["severity"]): string {
  if (value === "blocking") return styles.badgeBlocking;
  if (value === "warning") return styles.badgeWarning;
  return styles.badgeInfo;
}

function formatIsoTime(value: string | null | undefined): string {
  if (!value) return "n/a";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
}

function reliabilityReasonLabel(reason: ReliabilityReason): string {
  if (reason === "byo_target") return "BYO URL";
  if (reason === "telemetry_unavailable") return "Telemetry unavailable";
  if (reason === "missing_marker_fidelity") return "Missing marker fidelity";
  if (reason === "baseline_unavailable") return "Baseline unavailable";
  return reason;
}

function hasMarkerFidelity(snapshot: InspectorDomSnapshot | null): boolean {
  if (!snapshot) return false;
  return snapshot.nodes.some(
    (node) => Boolean(node.attributes["data-contract"] || node.attributes["data-contract-section"]),
  );
}

export function InspectorWorkspace({
  prototypeOptions,
  selectedPrototypeId,
  snapshotOptions,
  selectedSnapshotId,
  baselineSnapshotId,
  routeOptions,
  selectedRoute,
  targetProfiles,
  initialTargetMode,
  initialTargetProfileId,
  canWrite,
  latestExtractionUpdatedAt,
  contractDraft,
  requiredSections,
  initialViolationId,
  initialNodeId,
  initialCategory,
  initialPanel,
}: InspectorWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const [panelWidth, setPanelWidth] = React.useState(420);
  const [detailsOpen, setDetailsOpen] = React.useState(initialPanel === "details");
  const [activeCategory, setActiveCategory] = React.useState<InspectorCategory | "all">(
    (initialCategory as InspectorCategory | undefined) ?? "all",
  );
  const [selectedViolationId, setSelectedViolationId] = React.useState<string | undefined>(
    initialViolationId,
  );
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | undefined>(initialNodeId);
  const [telemetryStatus, setTelemetryStatus] = React.useState<TelemetryStatus>("connecting");
  const [snapshot, setSnapshot] = React.useState<InspectorDomSnapshot | null>(null);
  const [targetBaseline, setTargetBaseline] = React.useState<InspectorTargetBaselineRecord | null>(
    null,
  );
  const [baselineStatus, setBaselineStatus] = React.useState<BaselineStatus>("idle");
  const [debugOpen, setDebugOpen] = React.useState(false);
  const [lastHandshakeAt, setLastHandshakeAt] = React.useState<string | null>(null);
  const [routeInput, setRouteInput] = React.useState(selectedRoute);
  const [targetMode, setTargetMode] = React.useState<InspectorTargetMode>(initialTargetMode);
  const [targetProfileId, setTargetProfileId] =
    React.useState<InspectorTargetProfileId>(initialTargetProfileId);
  const [lastTelemetryRefreshAt, setLastTelemetryRefreshAt] = React.useState<string | null>(null);
  const [workflowBusy, setWorkflowBusy] = React.useState<
    "extract" | "snapshot" | "baseline" | null
  >(null);
  const [workflowMessage, setWorkflowMessage] = React.useState<{
    kind: "info" | "success" | "error";
    text: string;
  } | null>(null);

  const normalizedSelectedRoute = React.useMemo(
    () => normalizeInspectorRouteInput(selectedRoute),
    [selectedRoute],
  );
  const selectedTargetProfile = React.useMemo(
    () =>
      targetProfiles.find((profile) => profile.id === targetProfileId) ?? targetProfiles[0],
    [targetProfiles, targetProfileId],
  );
  const isByoMode = targetMode === "byo";
  const hasTargetUrl = isByoMode && isAbsoluteHttpUrl(normalizedSelectedRoute);

  const routeSelectOptions = React.useMemo(() => {
    const normalized = routeOptions.map((route) => normalizeInspectorRouteInput(route));
    if (!isAbsoluteHttpUrl(normalizedSelectedRoute) && !normalized.includes(normalizedSelectedRoute)) {
      normalized.unshift(normalizedSelectedRoute);
    }
    return Array.from(new Set(normalized.filter((route) => !isAbsoluteHttpUrl(route))));
  }, [routeOptions, normalizedSelectedRoute]);

  const targetStorageKey = React.useMemo(
    () => `${TARGET_ROUTE_STORAGE_PREFIX}${selectedPrototypeId}`,
    [selectedPrototypeId],
  );
  const targetModeStorageKey = React.useMemo(
    () => `${TARGET_MODE_STORAGE_PREFIX}${selectedPrototypeId}`,
    [selectedPrototypeId],
  );
  const targetProfileStorageKey = React.useMemo(
    () => `${TARGET_PROFILE_STORAGE_PREFIX}${selectedPrototypeId}`,
    [selectedPrototypeId],
  );

  React.useEffect(() => {
    setRouteInput(normalizedSelectedRoute);
  }, [normalizedSelectedRoute]);

  React.useEffect(() => {
    setTargetMode(initialTargetMode);
  }, [initialTargetMode]);

  React.useEffect(() => {
    setTargetProfileId(initialTargetProfileId);
  }, [initialTargetProfileId]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isByoMode || !isAbsoluteHttpUrl(normalizedSelectedRoute)) return;
    window.localStorage.setItem(targetStorageKey, normalizedSelectedRoute);
  }, [isByoMode, normalizedSelectedRoute, targetStorageKey]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(targetModeStorageKey, targetMode);
  }, [targetMode, targetModeStorageKey]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(targetProfileStorageKey, targetProfileId);
  }, [targetProfileId, targetProfileStorageKey]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadBaseline() {
      if (!canWrite || !isByoMode || !hasTargetUrl) {
        setTargetBaseline(null);
        setBaselineStatus("idle");
        return;
      }
      setBaselineStatus("loading");
      try {
        const params = new URLSearchParams({
          prototypeId: selectedPrototypeId,
          targetUrl: normalizedSelectedRoute,
        });
        const response = await fetch(
          `/api/prototypes/governance/inspector-baseline?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );
        const body = (await response.json()) as {
          ok?: boolean;
          error?: string;
          baseline?: InspectorTargetBaselineRecord | null;
        };
        if (!response.ok || !body.ok) {
          throw new Error(body.error ?? "Failed to load baseline.");
        }
        if (cancelled) return;
        if (body.baseline) {
          setTargetBaseline(body.baseline);
          setBaselineStatus("loaded");
        } else {
          setTargetBaseline(null);
          setBaselineStatus("missing");
        }
      } catch {
        if (cancelled) return;
        setTargetBaseline(null);
        setBaselineStatus("error");
      }
    }
    void loadBaseline();
    return () => {
      cancelled = true;
    };
  }, [canWrite, isByoMode, hasTargetUrl, selectedPrototypeId, normalizedSelectedRoute]);

  const targetPreviewUrl = React.useMemo(() => {
    if (isByoMode && isAbsoluteHttpUrl(normalizedSelectedRoute)) return normalizedSelectedRoute;
    const routePath = normalizedSelectedRoute.startsWith("/")
      ? normalizedSelectedRoute
      : `/${normalizedSelectedRoute}`;
    return new URL(routePath, selectedTargetProfile.baseUrl).toString();
  }, [isByoMode, normalizedSelectedRoute, selectedTargetProfile.baseUrl]);

  const previewUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    params.set("target", targetPreviewUrl);
    return `/api/prototypes/governance/inspector-proxy?${params.toString()}`;
  }, [targetPreviewUrl]);

  const previewOrigin = React.useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    [],
  );

  React.useEffect(() => {
    const stored = window.localStorage.getItem(PANEL_WIDTH_KEY);
    if (!stored) return;
    const parsed = Number(stored);
    if (Number.isFinite(parsed)) {
      setPanelWidth(clampPanelWidth(parsed));
    }
  }, []);

  const activeContractDraft = React.useMemo(() => {
    if (!isByoMode || !hasTargetUrl || !canWrite) return contractDraft;
    return targetBaseline?.contract ?? null;
  }, [isByoMode, hasTargetUrl, canWrite, contractDraft, targetBaseline]);

  const activeRequiredSections = React.useMemo(() => {
    if (!isByoMode || !hasTargetUrl || !canWrite) return requiredSections;
    return targetBaseline?.requiredSections ?? [];
  }, [isByoMode, hasTargetUrl, canWrite, requiredSections, targetBaseline]);

  const violations = React.useMemo(() => {
    if (!snapshot || !activeContractDraft) return [];
    const reliabilityReasons: ReliabilityReason[] = [];
    const markerFidelity = hasMarkerFidelity(snapshot);

    if (isByoMode) {
      reliabilityReasons.push("byo_target");
      if (canWrite && !targetBaseline) {
        reliabilityReasons.push("baseline_unavailable");
      }
    }
    if (!isByoMode && !markerFidelity) {
      reliabilityReasons.push("missing_marker_fidelity");
    }
    if (telemetryStatus !== "ready") {
      reliabilityReasons.push("telemetry_unavailable");
    }

    const tier: ReliabilityTier =
      reliabilityReasons.length === 0 ? "full" : "degraded";

    return runInspectorChecks({
      contractDraft: activeContractDraft,
      domSnapshot: snapshot,
      requiredSections: activeRequiredSections,
      reliabilityTier: tier,
      reliabilityReasons: Array.from(new Set(reliabilityReasons)),
    });
  }, [
    activeContractDraft,
    snapshot,
    activeRequiredSections,
    isByoMode,
    canWrite,
    targetBaseline,
    telemetryStatus,
  ]);

  const reliability = React.useMemo(() => {
    const reasons: ReliabilityReason[] = [];
    if (isByoMode) reasons.push("byo_target");
    if (telemetryStatus !== "ready") reasons.push("telemetry_unavailable");
    if (isByoMode && canWrite && !targetBaseline) reasons.push("baseline_unavailable");
    if (!isByoMode && telemetryStatus === "ready" && !hasMarkerFidelity(snapshot)) {
      reasons.push("missing_marker_fidelity");
    }
    return {
      tier: reasons.length === 0 ? "full" : "degraded",
      reasons: Array.from(new Set(reasons)),
    } as { tier: ReliabilityTier; reasons: ReliabilityReason[] };
  }, [isByoMode, telemetryStatus, canWrite, targetBaseline, snapshot]);

  const violationsByCategory = React.useMemo(() => {
    const map = new Map<InspectorCategory, InspectorViolation[]>();
    for (const category of CATEGORY_ORDER) map.set(category, []);
    for (const violation of violations) {
      const bucket = map.get(violation.category) ?? [];
      bucket.push(violation);
      map.set(violation.category, bucket);
    }
    return map;
  }, [violations]);

  const filteredViolations = React.useMemo(() => {
    if (activeCategory === "all") return violations;
    return violationsByCategory.get(activeCategory) ?? [];
  }, [activeCategory, violations, violationsByCategory]);

  const selectedViolation = React.useMemo(
    () => violations.find((entry) => entry.id === selectedViolationId),
    [selectedViolationId, violations],
  );

  const highlightedViolations = React.useMemo(() => {
    if (!selectedViolationId) return [];
    const selected = violations.find((entry) => entry.id === selectedViolationId);
    return selected ? [selected] : [];
  }, [selectedViolationId, violations]);

  React.useEffect(() => {
    if (!violations.length) {
      setSelectedViolationId(undefined);
      return;
    }
    if (selectedViolationId && violations.some((entry) => entry.id === selectedViolationId)) {
      return;
    }
    const firstBlocking = violations.find((entry) => entry.severity === "blocking");
    setSelectedViolationId(firstBlocking?.id ?? violations[0].id);
  }, [violations, selectedViolationId]);

  const unresolvedCount = violations.length;
  const blockingCount = violations.filter((entry) => entry.severity === "blocking").length;
  const snapshotCount = snapshotOptions.length;

  function replaceInspectorState(
    patch: Partial<{
      prototype: string;
      snapshot: string;
      route: string;
      targetMode: InspectorTargetMode;
      targetProfile: string;
      violation: string;
      node: string;
      panel: "default" | "details";
      category: string;
    }>,
  ) {
    const nextMode = patch.targetMode ?? targetMode;
    let nextRoute = normalizeInspectorRouteInput(patch.route ?? selectedRoute);
    if (nextMode === "reference" && isAbsoluteHttpUrl(nextRoute)) {
      nextRoute = selectedTargetProfile.defaultRoute;
    }
    if (nextMode === "byo" && !isAbsoluteHttpUrl(nextRoute)) {
      nextRoute = selectedTargetProfile.baseUrl;
    }
    const params = {
      prototype: selectedPrototypeId,
      snapshot: selectedSnapshotId,
      route: nextRoute,
      targetMode,
      targetProfile: targetProfileId,
      violation: selectedViolationId,
      node: selectedNodeId,
      panel: detailsOpen ? "details" : "default",
      category: activeCategory === "all" ? undefined : activeCategory,
      ...patch,
    };
    const query = buildInspectorQuery({
      prototype: params.prototype ?? "p0004",
      snapshot: params.snapshot ?? "",
      route: normalizeInspectorRouteInput(params.route),
      targetMode: params.targetMode === "byo" ? "byo" : "reference",
      targetProfile:
        params.targetProfile === "reference_customer_v1"
          ? "reference_customer_v1"
          : "reference_customer_v1",
      violation: params.violation,
      node: params.node,
      panel: params.panel === "details" ? "details" : "default",
      category: params.category,
    });
    router.replace(`${pathname}?${query}`);
  }

  function postToPreview(payload: Record<string, unknown>) {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      {
        channel: INSPECTOR_CHANNEL,
        version: INSPECTOR_VERSION,
        ...payload,
      },
      previewOrigin,
    );
  }

  function setTargetRoute() {
    const normalized = normalizeInspectorRouteInput(routeInput);
    if (!isAbsoluteHttpUrl(normalized)) {
      setWorkflowMessage({
        kind: "error",
        text: "Enter a full target URL (example: https://example.com).",
      });
      return;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(targetStorageKey, normalized);
    }
    replaceInspectorState({
      route: normalized,
      targetMode: "byo",
      violation: undefined,
      node: undefined,
    });
    setTargetMode("byo");
    setWorkflowMessage({
      kind: "info",
      text: "BYO target set. Next: capture baseline from live telemetry.",
    });
  }

  function setTargetModeAndRoute(nextMode: InspectorTargetMode) {
    setTargetMode(nextMode);
    if (nextMode === "reference") {
      replaceInspectorState({
        targetMode: "reference",
        targetProfile: targetProfileId,
        route: selectedTargetProfile.defaultRoute,
        violation: undefined,
        node: undefined,
      });
      setWorkflowMessage({
        kind: "info",
        text: `Using reference target ${selectedTargetProfile.baseUrl}.`,
      });
      return;
    }

    const storedRoute =
      typeof window !== "undefined" ? window.localStorage.getItem(targetStorageKey) : null;
    const nextByoRoute = isAbsoluteHttpUrl(normalizeInspectorRouteInput(storedRoute ?? ""))
      ? normalizeInspectorRouteInput(storedRoute ?? "")
      : selectedTargetProfile.baseUrl;
    setRouteInput(nextByoRoute);
    replaceInspectorState({
      targetMode: "byo",
      targetProfile: targetProfileId,
      route: nextByoRoute,
      violation: undefined,
      node: undefined,
    });
    setWorkflowMessage({
      kind: "info",
      text: "BYO mode enabled. Set a target URL and capture baseline.",
    });
  }

  async function runExtractAndGenerate() {
    if (!canWrite) return;
    setWorkflowBusy("extract");
    setWorkflowMessage(null);
    try {
      const response = await fetch("/api/prototypes/governance/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prototypeId: selectedPrototypeId }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        snapshotId?: string;
      };
      if (!response.ok || !body.ok || !body.snapshotId) {
        throw new Error(body.error ?? "Extract and generate failed.");
      }
      setWorkflowMessage({
        kind: "success",
        text: `Generated extraction and contract snapshot ${body.snapshotId}.`,
      });
      replaceInspectorState({
        snapshot: body.snapshotId,
        violation: undefined,
        node: undefined,
      });
    } catch (error) {
      setWorkflowMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Extract and generate failed.",
      });
    } finally {
      setWorkflowBusy(null);
    }
  }

  async function ingestGeneratedSnapshot() {
    if (!canWrite) return;
    setWorkflowBusy("snapshot");
    setWorkflowMessage(null);
    try {
      const response = await fetch("/api/prototypes/governance/snapshot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prototypeId: selectedPrototypeId }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        snapshotId?: string;
      };
      if (!response.ok || !body.ok || !body.snapshotId) {
        throw new Error(body.error ?? "Snapshot ingestion failed.");
      }
      setWorkflowMessage({
        kind: "success",
        text: `Snapshot ${body.snapshotId} added from latest extraction artifact.`,
      });
      replaceInspectorState({
        snapshot: body.snapshotId,
        violation: undefined,
        node: undefined,
      });
    } catch (error) {
      setWorkflowMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Snapshot ingestion failed.",
      });
    } finally {
      setWorkflowBusy(null);
    }
  }

  async function captureTargetBaseline() {
    if (!canWrite || !hasTargetUrl || !snapshot) return;
    setWorkflowBusy("baseline");
    setWorkflowMessage(null);
    try {
      const derived = deriveInspectorBaselineFromSnapshot(snapshot);
      const response = await fetch("/api/prototypes/governance/inspector-baseline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prototypeId: selectedPrototypeId,
          targetUrl: normalizedSelectedRoute,
          contract: derived.contract,
          requiredSections: derived.requiredSections,
          sourceSnapshotCapturedAt: snapshot.capturedAt,
        }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        baseline?: InspectorTargetBaselineRecord;
      };
      if (!response.ok || !body.ok || !body.baseline) {
        throw new Error(body.error ?? "Failed to capture baseline.");
      }
      setTargetBaseline(body.baseline);
      setBaselineStatus("loaded");
      setSelectedViolationId(undefined);
      setSelectedNodeId(undefined);
      setWorkflowMessage({
        kind: "success",
        text: `Baseline captured for ${body.baseline.targetUrl} at ${formatIsoTime(
          body.baseline.sourceSnapshotCapturedAt,
        )}.`,
      });
      replaceInspectorState({
        violation: undefined,
        node: undefined,
      });
    } catch (error) {
      setWorkflowMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Failed to capture baseline.",
      });
      setBaselineStatus("error");
    } finally {
      setWorkflowBusy(null);
    }
  }

  function reloadTelemetry() {
    postToPreview({ type: "REQUEST_DOM_SNAPSHOT" });
    const refreshedAt = new Date().toISOString();
    setLastTelemetryRefreshAt(refreshedAt);
    setWorkflowMessage({
      kind: "info",
      text: `Reloaded target telemetry at ${formatIsoTime(refreshedAt)}.`,
    });
  }

  React.useEffect(() => {
    setTelemetryStatus("connecting");
    const timeout = window.setTimeout(() => {
      setTelemetryStatus((current) => (current === "ready" ? current : "unsupported"));
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [previewUrl]);

  React.useEffect(() => {
    if (!iframeRef.current?.contentWindow) return;
    if (telemetryStatus === "ready") return;
    const sendInit = () => {
      postToPreview({ type: "INSPECTOR_INIT" });
    };
    sendInit();
    const interval = window.setInterval(sendInit, 1000);
    return () => window.clearInterval(interval);
  }, [previewUrl, telemetryStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== previewOrigin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!isInspectorMessage(event.data)) return;

      if (event.data.type === "INSPECTOR_READY") {
        setTelemetryStatus("ready");
        setLastHandshakeAt(new Date().toISOString());
        postToPreview({ type: "REQUEST_DOM_SNAPSHOT" });
        return;
      }

      if (event.data.type === "DOM_SNAPSHOT") {
        const payload = event.data as typeof event.data & { snapshot?: InspectorDomSnapshot };
        if (!payload.snapshot || !Array.isArray(payload.snapshot.nodes)) return;
        setTelemetryStatus("ready");
        setSnapshot(payload.snapshot);
        return;
      }

      if (event.data.type === "NODE_SELECTED") {
        const payload = event.data as typeof event.data & { nodeId?: string };
        if (!payload.nodeId) return;
        setSelectedNodeId(payload.nodeId);
        const linked = violations.find((entry) => entry.nodeIds.includes(payload.nodeId as string));
        if (linked) {
          setSelectedViolationId(linked.id);
          setActiveCategory(linked.category);
          replaceInspectorState({
            node: payload.nodeId,
            violation: linked.id,
            category: linked.category,
          });
        } else {
          replaceInspectorState({
            node: payload.nodeId,
          });
        }
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [previewOrigin, violations, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    postToPreview({
      type: "HIGHLIGHT_VIOLATIONS",
      violations: highlightedViolations,
      selectedViolationId,
    });
  }, [highlightedViolations, selectedViolationId]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!selectedNodeId) return;
    postToPreview({ type: "SELECT_NODE", nodeId: selectedNodeId });
  }, [selectedNodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  function chooseViolation(violation: InspectorViolation) {
    setSelectedViolationId(violation.id);
    setSelectedNodeId(violation.nodeIds[0]);
    setActiveCategory(violation.category);
    replaceInspectorState({
      violation: violation.id,
      node: violation.nodeIds[0],
      category: violation.category,
    });
  }

  function onResizeStart(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const initial = panelWidth;

    function onMove(moveEvent: MouseEvent) {
      const delta = startX - moveEvent.clientX;
      const next = clampPanelWidth(initial + delta);
      setPanelWidth(next);
      window.localStorage.setItem(PANEL_WIDTH_KEY, String(next));
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const snapshotCreatedAt =
    snapshotOptions.find((entry) => entry.snapshotId === selectedSnapshotId)?.createdAt ?? "";

  return (
    <main className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.workflowRail}>
          <div
            className={`${styles.workflowStep} ${
              isByoMode ? (hasTargetUrl ? styles.workflowStepDone : styles.workflowStepActive) : styles.workflowStepDone
            }`}
          >
            <div className={styles.workflowStepNumber}>1</div>
            <div className={styles.workflowStepBody}>
              <div className={styles.workflowStepTitle}>Select inspection target</div>
              <div className={styles.workflowStepMeta}>
                {isByoMode
                  ? hasTargetUrl
                    ? normalizedSelectedRoute
                    : "Bring your own URL for exploratory checks."
                  : `Reference target ${selectedTargetProfile.label} (${selectedTargetProfile.baseUrl}).`}
              </div>
              <div className={styles.workflowRow}>
                <label className={styles.labelInline}>
                  Mode
                  <select
                    className={styles.select}
                    value={targetMode}
                    onChange={(event) =>
                      setTargetModeAndRoute(event.target.value === "byo" ? "byo" : "reference")
                    }
                  >
                    <option value="reference">Reference target</option>
                    <option value="byo">Bring your own URL</option>
                  </select>
                </label>
                <label className={styles.labelInline}>
                  Profile
                  <select
                    className={styles.select}
                    value={targetProfileId}
                    onChange={(event) => {
                      const nextProfileId = event.target.value as InspectorTargetProfileId;
                      setTargetProfileId(nextProfileId);
                      const nextProfile =
                        targetProfiles.find((profile) => profile.id === nextProfileId) ??
                        targetProfiles[0];
                      const nextRoute =
                        targetMode === "reference" ? nextProfile.defaultRoute : normalizedSelectedRoute;
                      replaceInspectorState({
                        targetProfile: nextProfileId,
                        route: nextRoute,
                        violation: undefined,
                        node: undefined,
                      });
                    }}
                  >
                    {targetProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {isByoMode ? (
                <div className={styles.workflowRow}>
                  <input
                    className={styles.input}
                    value={routeInput}
                    onChange={(event) => setRouteInput(event.target.value)}
                    placeholder="https://example.com"
                  />
                  <button className={styles.action} onClick={setTargetRoute}>
                    Set BYO target
                  </button>
                </div>
              ) : (
                <div className={styles.workflowRow}>
                  <label className={styles.labelInline}>
                    Reference route
                    <select
                      className={styles.select}
                      value={normalizedSelectedRoute}
                      onChange={(event) =>
                        replaceInspectorState({
                          route: normalizeInspectorRouteInput(event.target.value),
                          violation: undefined,
                          node: undefined,
                        })
                      }
                    >
                      {routeSelectOptions.map((route) => (
                        <option key={route} value={route}>
                          {route}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className={styles.workflowStep}>
            <div className={styles.workflowStepNumber}>2</div>
            <div className={styles.workflowStepBody}>
              {isByoMode ? (
                <>
                  <div className={styles.workflowStepTitle}>Capture target baseline contract</div>
                  <div className={styles.workflowStepMeta}>
                    {!canWrite
                      ? "Baseline capture is available only for writable prototypes."
                      : !hasTargetUrl
                        ? "Set a valid target URL before capturing baseline."
                        : targetBaseline
                          ? `Baseline captured ${formatIsoTime(
                              targetBaseline.updatedAt,
                            )} from telemetry ${formatIsoTime(targetBaseline.sourceSnapshotCapturedAt)}.`
                          : baselineStatus === "loading"
                            ? "Loading baseline for this target URL..."
                            : "Capture baseline from current telemetry before monitoring drift."}
                  </div>
                  <div className={styles.workflowRow}>
                    <button
                      className={styles.action}
                      onClick={captureTargetBaseline}
                      disabled={
                        !canWrite ||
                        !hasTargetUrl ||
                        telemetryStatus !== "ready" ||
                        !snapshot ||
                        workflowBusy !== null
                      }
                    >
                      {workflowBusy === "baseline"
                        ? "Capturing baseline..."
                        : targetBaseline
                          ? "Re-capture baseline"
                          : "Capture baseline"}
                    </button>
                    <span className={styles.badge}>
                      {targetBaseline ? "Baseline ready" : "Baseline pending"}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.workflowStepTitle}>Extract and generate contract snapshot</div>
                  <div className={styles.workflowStepMeta}>
                    Latest extraction {formatIsoTime(latestExtractionUpdatedAt)}. Selected snapshot{" "}
                    {selectedSnapshotId}.
                  </div>
                  <div className={styles.workflowRow}>
                    <button
                      className={styles.action}
                      onClick={runExtractAndGenerate}
                      disabled={!canWrite || workflowBusy !== null}
                    >
                      {workflowBusy === "extract" ? "Running extraction..." : "Run extract + generate"}
                    </button>
                    <button
                      className={styles.action}
                      onClick={ingestGeneratedSnapshot}
                      disabled={!canWrite || workflowBusy !== null}
                    >
                      {workflowBusy === "snapshot" ? "Ingesting..." : "Ingest existing extraction"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={styles.workflowStep}>
            <div className={styles.workflowStepNumber}>3</div>
            <div className={styles.workflowStepBody}>
              <div className={styles.workflowStepTitle}>Reload and monitor violations over time</div>
              <div className={styles.workflowStepMeta}>
                Telemetry {telemetryStatus}.{" "}
                {isByoMode
                  ? targetBaseline
                    ? `BYO baseline ready (${formatIsoTime(targetBaseline.updatedAt)}).`
                    : "BYO baseline pending."
                  : `Reference baseline snapshot ${baselineSnapshotId}. History ${snapshotCount} snapshots.`}
              </div>
              <div className={styles.workflowRow}>
                <button
                  className={styles.action}
                  onClick={reloadTelemetry}
                  disabled={telemetryStatus !== "ready"}
                >
                  Reload surface
                </button>
                <span className={styles.badge}>
                  Last reload {formatIsoTime(lastTelemetryRefreshAt ?? lastHandshakeAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.controls}>
            <label className={styles.label}>
              Prototype
              <select
                className={styles.select}
                value={selectedPrototypeId}
                onChange={(event) =>
                  router.replace(
                    `${pathname}?${buildInspectorQuery({
                      prototype: event.target.value,
                      snapshot: "",
                      route:
                        targetMode === "reference"
                          ? selectedTargetProfile.defaultRoute
                          : selectedTargetProfile.baseUrl,
                      targetMode,
                      targetProfile: targetProfileId,
                      panel: detailsOpen ? "details" : "default",
                    })}`,
                  )
                }
              >
                {prototypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.id} · {option.title}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Snapshot
              <select
                className={styles.select}
                value={selectedSnapshotId}
                onChange={(event) =>
                  replaceInspectorState({
                    snapshot: event.target.value,
                    violation: undefined,
                    node: undefined,
                  })
                }
              >
                {snapshotOptions.map((entry) => (
                  <option key={entry.snapshotId} value={entry.snapshotId}>
                    {entry.snapshotId}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.summary}>
            <span className={styles.badge}>Needs review {unresolvedCount}</span>
            <span className={styles.badge}>Blocking {blockingCount}</span>
            <span className={styles.badge}>
              Reliability {reliability.tier === "full" ? "full" : "degraded"}
            </span>
            <span className={styles.badge}>
              Publish{" "}
              {blockingCount === 0 && (!isByoMode || Boolean(targetBaseline)) ? "ready" : "blocked"}
            </span>
            <button
              className={styles.action}
              onClick={() => {
                const next = !detailsOpen;
                setDetailsOpen(next);
                replaceInspectorState({ panel: next ? "details" : "default" });
              }}
            >
              {detailsOpen ? "Hide details" : "Details"}
            </button>
          </div>
        </div>

        {workflowMessage && (
          <div
            className={`${styles.workflowNotice} ${
              workflowMessage.kind === "error"
                ? styles.workflowNoticeError
                : workflowMessage.kind === "success"
                  ? styles.workflowNoticeSuccess
                  : styles.workflowNoticeInfo
            }`}
          >
            {workflowMessage.text}
          </div>
        )}
        {isByoMode && hasTargetUrl && canWrite && !targetBaseline && baselineStatus !== "loading" && (
          <div className={`${styles.workflowNotice} ${styles.workflowNoticeInfo}`}>
            No baseline exists for this target URL yet. Capture baseline to start violation tracking.
          </div>
        )}
        {reliability.tier === "degraded" && (
          <div className={`${styles.workflowNotice} ${styles.workflowNoticeInfo}`}>
            Heuristic mode active. Marker-dependent blocking checks are downgraded to warnings.
            {reliability.reasons.length > 0
              ? ` Reason: ${reliability.reasons.map(reliabilityReasonLabel).join(", ")}.`
              : ""}
          </div>
        )}
      </header>

      <section className={styles.workspace} style={{ gridTemplateColumns: `minmax(0, 1fr) 8px ${panelWidth}px` }}>
        <div className={styles.canvas}>
          <iframe
            ref={iframeRef}
            src={previewUrl}
            title="Surface inspector preview"
            className={styles.iframe}
            loading="lazy"
            onLoad={() => postToPreview({ type: "INSPECTOR_INIT" })}
          />
          <div className={styles.canvasMeta}>
            <span>Telemetry: {telemetryStatus}</span>
            <span>{targetPreviewUrl}</span>
            <span>{snapshotCreatedAt}</span>
            {lastHandshakeAt && <span>connected {lastHandshakeAt}</span>}
          </div>
          {telemetryStatus === "unsupported" && (
            <div className={styles.warning}>
              Preview telemetry unavailable. Ensure the target surface can execute the inspector
              bridge and provide a DOM snapshot.
            </div>
          )}
        </div>

        <div
          className={styles.splitter}
          role="separator"
          aria-orientation="vertical"
          onMouseDown={onResizeStart}
        />

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Contract Violations</h2>
            <div className={styles.panelHeaderMeta}>
              <span className={styles.badge}>{filteredViolations.length}</span>
              <span className={styles.badge}>
                {reliability.tier === "full" ? "Full confidence" : "Degraded confidence"}
              </span>
            </div>
          </div>
          {reliability.reasons.length > 0 && (
            <div className={styles.reliabilityRow}>
              {reliability.reasons.map((reason) => reliabilityReasonLabel(reason)).join(" • ")}
            </div>
          )}

          <div className={styles.categories}>
            <button
              className={`${styles.filter} ${activeCategory === "all" ? styles.filterActive : ""}`}
              onClick={() => {
                setActiveCategory("all");
                replaceInspectorState({ category: undefined });
              }}
            >
              All
            </button>
            {CATEGORY_ORDER.map((category) => {
              const count = violationsByCategory.get(category)?.length ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={category}
                  className={`${styles.filter} ${activeCategory === category ? styles.filterActive : ""}`}
                  onClick={() => {
                    setActiveCategory(category);
                    replaceInspectorState({ category: category });
                  }}
                >
                  {categoryLabel(category)} ({count})
                </button>
              );
            })}
          </div>

          <div className={styles.list} role="listbox" aria-label="Inspector violations">
            {filteredViolations.map((violation) => {
              const selected = violation.id === selectedViolationId;
              const linkedToSelectedNode =
                selectedNodeId !== undefined && violation.nodeIds.includes(selectedNodeId);
              return (
                <button
                  key={violation.id}
                  className={`${styles.row} ${selected ? styles.rowActive : ""}`}
                  onClick={() => chooseViolation(violation)}
                >
                  <div className={styles.rowTop}>
                    <span className={`${styles.severity} ${severityClass(violation.severity)}`}>
                      {severityLabel(violation.severity)}
                    </span>
                    {linkedToSelectedNode && <span className={styles.linked}>Selected node</span>}
                  </div>
                  <div className={styles.rowTitle}>{violation.title}</div>
                  <div className={styles.rowMessage}>{violation.message}</div>
                  <div className={styles.rowPath}>{violation.rulePath}</div>
                  <div className={styles.rowMeta}>
                    {violation.confidence} confidence ·{" "}
                    {violation.heuristic ? "heuristic" : "deterministic"}
                  </div>
                </button>
              );
            })}
            {filteredViolations.length === 0 && (
              <div className={styles.empty}>No violations in this category.</div>
            )}
          </div>
        </aside>
      </section>

      {detailsOpen && (
        <aside className={styles.details}>
          <div className={styles.detailsHeader}>
            <h3>Inspector Details</h3>
            <button className={styles.action} onClick={() => setDebugOpen((value) => !value)}>
              {debugOpen ? "Hide debug" : "Show debug"}
            </button>
          </div>
          <div className={styles.detailsBody}>
            <h4>{isByoMode ? "Target Baseline Contract (JSON)" : "Draft Contract (JSON)"}</h4>
            <pre>{JSON.stringify(activeContractDraft ?? contractDraft, null, 2)}</pre>
            {isByoMode && (
              <>
                <h4>Target Baseline Status</h4>
                <pre>
                  {JSON.stringify(
                    targetBaseline
                      ? {
                          targetUrl: targetBaseline.targetUrl,
                          sourceSnapshotCapturedAt: targetBaseline.sourceSnapshotCapturedAt,
                          updatedAt: targetBaseline.updatedAt,
                          requiredSections: targetBaseline.requiredSections,
                        }
                      : { status: baselineStatus },
                    null,
                    2,
                  )}
                </pre>
              </>
            )}
            {selectedViolation && (
              <>
                <h4>Selected Violation</h4>
                <pre>{JSON.stringify(selectedViolation, null, 2)}</pre>
              </>
            )}
            {debugOpen && (
              <>
                <h4>Telemetry Snapshot</h4>
                <pre>{JSON.stringify(snapshot, null, 2)}</pre>
              </>
            )}
          </div>
        </aside>
      )}
    </main>
  );
}
