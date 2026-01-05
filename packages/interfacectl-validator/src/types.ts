export type SurfaceType = "web" | "cli";

export interface ContractSurface {
  id: string;
  displayName: string;
  type: SurfaceType;
  requiredSections: string[];
  allowedFonts: string[];
  layout: {
    maxContentWidth: number;
  };
}

export interface ContractSection {
  id: string;
  intent: string;
  description: string;
}

export interface ContractConstraints {
  motion: {
    allowedDurationsMs: number[];
    allowedTimingFunctions: string[];
  };
}

export interface InterfaceContract {
  contractId: string;
  version: string;
  description?: string;
  surfaces: ContractSurface[];
  sections: ContractSection[];
  constraints: ContractConstraints;
}

export interface SurfaceSectionDescriptor {
  id: string;
  source?: string;
}

export interface SurfaceFontDescriptor {
  value: string;
  source?: string;
}

export interface SurfaceMotionDescriptor {
  durationMs: number;
  timingFunction: string;
  source?: string;
}

export interface SurfaceLayoutDescriptor {
  maxContentWidth?: number | null;
  containers?: string[];
  containerSources?: string[];
  source?: string;
}

export interface SurfaceDescriptor {
  surfaceId: string;
  sections: SurfaceSectionDescriptor[];
  fonts: SurfaceFontDescriptor[];
  layout: SurfaceLayoutDescriptor;
  motion: SurfaceMotionDescriptor[];
}

export type DriftViolationType =
  | "unknown-surface"
  | "missing-section"
  | "unknown-section"
  | "font-not-allowed"
  | "layout-width-exceeded"
  | "layout-width-undetermined"
  | "layout-container-missing"
  | "motion-duration-not-allowed"
  | "motion-timing-not-allowed"
  | "descriptor-missing"
  | "descriptor-unused";

export interface DriftViolation {
  surfaceId: string;
  type: DriftViolationType;
  message: string;
  details?: Record<string, unknown>;
}

export interface SurfaceReport {
  surfaceId: string;
  violations: DriftViolation[];
}

export interface ValidationSummary {
  contract: InterfaceContract;
  surfaceReports: SurfaceReport[];
}

