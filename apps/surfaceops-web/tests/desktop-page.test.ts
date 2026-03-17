import { afterEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`redirect:${target}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: mocked.redirect,
}));

import DesktopPage from "@/app/desktop/page";

describe("desktop compatibility route", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("sends desktop runtime back to the workbench route", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SURFACEOPS_LOCAL_WORKBENCH", "1");
    vi.stubEnv("SURFACEOPS_DESKTOP_RUNTIME", "1");

    expect(() => DesktopPage()).toThrowError("redirect:/contracts/governance");
    expect(mocked.redirect).toHaveBeenCalledWith("/contracts/governance");
  });

  it("redirects the public /desktop route to the download page", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SURFACEOPS_LOCAL_WORKBENCH", undefined);
    vi.stubEnv("SURFACEOPS_DESKTOP_RUNTIME", undefined);

    expect(() => DesktopPage()).toThrowError("redirect:/download");
    expect(mocked.redirect).toHaveBeenCalledWith("/download");
  });
});
