import { isSurfaceOpsLocalWorkbenchEnabled } from "@/lib/auth-bypass";

export interface SurfaceOpsNavigationLink {
  label: string;
  href: string;
}

export interface SurfaceOpsNavigationConfig {
  currentContext: {
    contentType: "overview";
    subject: "contracts";
  };
  sections: SurfaceOpsNavigationLink[];
  utilities: SurfaceOpsNavigationLink[];
}

export const SURFACEOPS_DESKTOP_ALPHA_TARGET = {
  platform: "Apple Silicon Mac",
  delivery: "Public alpha DMG first. Stable promotes automatically after a 72-hour soak.",
  modelPolicy: "Open-source local models only. No hosted inference requirement for the core workbench.",
};

export const SURFACEOPS_DESKTOP_WORKBENCH_PATH = "/contracts/governance";

function normalizeSurfaceOpsPath(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export function isSurfaceOpsDesktopMarketingMode(): boolean {
  return !isSurfaceOpsLocalWorkbenchEnabled();
}

export function isSurfaceOpsDesktopRuntimeEnabled(): boolean {
  return process.env.SURFACEOPS_DESKTOP_RUNTIME === "1";
}

export function shouldRenderSurfaceOpsGlobalChrome(): boolean {
  return !isSurfaceOpsDesktopRuntimeEnabled();
}

export function shouldRedirectToSurfaceOpsDesktopWorkbench(pathname: string): boolean {
  if (!isSurfaceOpsDesktopRuntimeEnabled()) {
    return false;
  }

  const normalizedPath = normalizeSurfaceOpsPath(pathname);
  if (normalizedPath === SURFACEOPS_DESKTOP_WORKBENCH_PATH) {
    return false;
  }

  if (normalizedPath === "/" || normalizedPath === "/download" || normalizedPath === "/release-notes" || normalizedPath === "/desktop" || normalizedPath === "/contracts") {
    return true;
  }

  return normalizedPath.startsWith("/contracts/");
}

export function shouldRedirectHostedContractsRoutes(): boolean {
  return isSurfaceOpsDesktopMarketingMode();
}

export function getSurfaceOpsNavigation(): SurfaceOpsNavigationConfig {
  if (isSurfaceOpsDesktopMarketingMode()) {
    return {
      currentContext: { contentType: "overview", subject: "contracts" },
      sections: [
        { label: "Overview", href: "/" },
        { label: "Download", href: "/download" },
        { label: "Release Notes", href: "/release-notes" },
      ],
      utilities: [
        { label: "surfaces.dev", href: "https://surfaces.dev" },
      ],
    };
  }

  return {
    currentContext: { contentType: "overview", subject: "contracts" },
    sections: [
      { label: "Overview", href: "/" },
      { label: "Workbench", href: "/contracts/governance" },
      { label: "Runs", href: "/contracts/runs" },
    ],
    utilities: [
      { label: "Download", href: "/download" },
      { label: "Release Notes", href: "/release-notes" },
    ],
  };
}
