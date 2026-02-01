import Link from "next/link";
import { getSignalsList } from "@/lib/mock/signals";

export default function SignalsPage() {
  const signals = getSignalsList();

  if (signals.length === 0) {
    return (
      <p className="text-neutral-600 text-sm" data-empty="signals">
        No signals yet
      </p>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">Signals</h1>
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-neutral-900">Severity</th>
              <th className="px-4 py-3 font-semibold text-neutral-900">Type</th>
              <th className="px-4 py-3 font-semibold text-neutral-900">Title</th>
              <th className="px-4 py-3 font-semibold text-neutral-900">Surface</th>
              <th className="px-4 py-3 font-semibold text-neutral-900">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr
                key={s.signalKey}
                className="border-b border-neutral-100 hover:bg-neutral-50 last:border-0"
              >
                <td className="px-4 py-3 text-neutral-700">{s.severity}</td>
                <td className="px-4 py-3 text-neutral-700">{s.type}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/signals/${s.signalKey}`}
                    className="text-neutral-900 font-medium hover:underline"
                  >
                    {s.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-700">{s.surface}</td>
                <td className="px-4 py-3 text-neutral-600">{s.lastSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
