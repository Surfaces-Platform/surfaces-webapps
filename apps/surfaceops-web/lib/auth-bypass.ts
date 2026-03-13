export function isSurfaceOpsAuthBypassEnabled(): boolean {
  if (process.env.SURFACEOPS_TEST_BYPASS_AUTH !== "1") {
    return false;
  }
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return process.env.VERCEL_ENV === "preview";
}

export function isSurfaceOpsLocalWorkbenchEnabled(): boolean {
  if (process.env.SURFACEOPS_LOCAL_WORKBENCH === "1") {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}
