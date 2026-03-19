import { redirect } from "next/navigation";
import {
  resolveSurfaceOpsDesktopRuntimePath,
  shouldRedirectToSurfaceOpsDesktopWorkbench,
} from "@/lib/product-surface";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Desktop | SurfaceOps",
};

export default function DesktopPage() {
  if (shouldRedirectToSurfaceOpsDesktopWorkbench("/desktop")) {
    redirect(resolveSurfaceOpsDesktopRuntimePath());
  }

  redirect("/download");
}
