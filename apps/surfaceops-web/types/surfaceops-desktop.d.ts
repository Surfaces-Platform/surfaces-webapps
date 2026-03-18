import type { SurfaceOpsDesktopBridge } from "@surfaces/surfaceops-desktop-bridge";

declare global {
  interface Window {
    surfaceopsDesktop?: SurfaceOpsDesktopBridge;
  }
}

export {};
