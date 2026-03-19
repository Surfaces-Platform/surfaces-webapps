import { redirect } from "next/navigation";
import { isSurfaceOpsDesktopRuntimeEnabled } from "@/lib/product-surface";
import {
  loadSurfaceOpsDesktopModelCatalog,
  loadSurfaceOpsDesktopModelState,
} from "@/lib/desktop-models";
import { DesktopModelSetup } from "./_components/desktop-model-setup";

export const metadata = {
  title: "Desktop Setup | SurfaceOps",
};

export default function DesktopSetupPage() {
  if (!isSurfaceOpsDesktopRuntimeEnabled()) {
    redirect("/download");
  }

  const catalog = loadSurfaceOpsDesktopModelCatalog();
  const state = loadSurfaceOpsDesktopModelState();

  return <DesktopModelSetup catalog={catalog} initialState={state} />;
}
