import {
  getSurfaceOpsNavigation,
  shouldRenderSurfaceOpsGlobalChrome,
  type SurfaceOpsNavigationConfig,
} from "@/lib/product-surface";

export interface SurfaceOpsRootChromeState {
  showGlobalChrome: boolean;
  navigation: SurfaceOpsNavigationConfig | null;
}

export function resolveSurfaceOpsRootChrome(): SurfaceOpsRootChromeState {
  const showGlobalChrome = shouldRenderSurfaceOpsGlobalChrome();

  return {
    showGlobalChrome,
    navigation: showGlobalChrome ? getSurfaceOpsNavigation() : null,
  };
}
