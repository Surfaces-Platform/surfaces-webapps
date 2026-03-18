import { redirect } from "next/navigation";
import { shouldRedirectHostedContractsRoutes } from "@/lib/product-surface";

export default async function ContractsLayout({
  children,
}: { children: React.ReactNode }) {
  if (shouldRedirectHostedContractsRoutes()) {
    redirect("/download");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
