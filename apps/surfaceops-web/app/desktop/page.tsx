import { redirect } from "next/navigation";
import {
  SURFACEOPS_DESKTOP_WORKBENCH_PATH,
  shouldRedirectToSurfaceOpsDesktopWorkbench,
} from "@/lib/product-surface";

export const metadata = {
  title: "Desktop | SurfaceOps",
};

export default function DesktopPage() {
  if (shouldRedirectToSurfaceOpsDesktopWorkbench("/desktop")) {
    redirect(SURFACEOPS_DESKTOP_WORKBENCH_PATH);
  }

  redirect("/download");
}
