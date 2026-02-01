import Link from "next/link";
import { getSignalByKey } from "@/lib/mock/signals";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ signalKey: string }>;
}

export default async function SignalDetailPage({ params }: Props) {
  const { signalKey } = await params;
  const signal = getSignalByKey(signalKey);

  if (!signal) {
    notFound();
  }

  const metadataEntries = Object.entries(signal.metadata);
  const hasOccurrences = signal.occurrences.length > 0;

  return (
    <div>
      <div className="mb-4">
        <Link href="/signals" className="text-sm text-neutral-600 hover:text-neutral-900">
          ← Signals
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-neutral-900 mb-4">{signal.title}</h1>
      {metadataEntries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {metadataEntries.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center rounded-md bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700"
            >
              {key}: {value}
            </span>
          ))}
        </div>
      )}
      <section className="rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-900 mb-3">Occurrences</h2>
        {!hasOccurrences ? (
          <p className="text-neutral-600 text-sm" data-empty="occurrences">
            No occurrences yet
          </p>
        ) : (
          <ul className="text-sm text-neutral-700 space-y-1">
            {signal.occurrences.map((occ) => (
              <li key={occ.id}>
                {occ.id} — {occ.at}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
