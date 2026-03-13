import { notFound } from "next/navigation";
import { BenchmarkWorkbench } from "../_components/benchmark-workbench";
import { loadGenerationWorkbench } from "@/lib/generation-benchmarks";

export default async function BenchmarkWorkbenchPage({
  params,
  searchParams,
}: {
  params: Promise<{ benchmarkId: string }>;
  searchParams: Promise<{ surface?: string; attempt?: string }>;
}) {
  const { benchmarkId } = await params;
  const { surface, attempt } = await searchParams;

  try {
    const data = loadGenerationWorkbench({
      benchmarkId,
      surfaceId: surface ?? null,
      attemptView: attempt ?? null,
    });
    return <BenchmarkWorkbench data={data} />;
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) {
      notFound();
    }
    throw error;
  }
}
