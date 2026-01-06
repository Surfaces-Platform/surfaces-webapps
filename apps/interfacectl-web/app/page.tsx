export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)] text-slate-100">
      <main className="contract-container flex min-h-screen flex-col gap-20 py-24">
        <section
          data-contract-section="landing.hero"
          className="contract-surface-card space-y-6 text-center sm:text-left"
        >
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
            InterfaceCTL
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
            One contract to synchronise every surface in your control plane.
          </h1>
          <p className="max-w-xl text-lg text-slate-200">
            Ship coordinated interfaces across developer tooling, dashboards, and
            command line experiences. InterfaceCTL keeps your team in lock-step
            by flagging drift before it reaches production.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <a
              className="contract-motion inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950 no-underline hover:bg-slate-200"
              href="https://github.com/mikeylong/interfacectl"
              target="_blank"
              rel="noopener noreferrer"
            >
              View project on GitHub
            </a>
          </div>
        </section>

        <section
          data-contract-section="landing.guidance"
          className="contract-surface-card space-y-10"
        >
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">
              Operate with shared language
            </h2>
            <p className="max-w-2xl text-base text-slate-300">
              Every element uses contract-backed intent identifiers so product,
              engineering, and design stay aligned. Map semantic actions across
              CLI and UI surfaces without second-guessing naming or layout.
            </p>
          </div>
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <dt className="text-sm font-semibold text-white">Sections</dt>
              <dd className="mt-2 text-sm text-slate-300">
                Declarative `data-contract-section` tags make compliance checks
                frictionless.
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <dt className="text-sm font-semibold text-white">Fonts</dt>
              <dd className="mt-2 text-sm text-slate-300">
                Shared font variables ensure typography respects the contract.
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <dt className="text-sm font-semibold text-white">Motion</dt>
              <dd className="mt-2 text-sm text-slate-300">
                Motion classes enforce 120ms linear transitions across states.
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <dt className="text-sm font-semibold text-white">UI Copy</dt>
              <dd className="mt-2 text-sm text-slate-300">
                Contract-backed UI copy ensures consistent messaging across all
                surfaces.
              </dd>
            </div>
          </dl>
        </section>

        <section
          data-contract-section="landing.actions"
          className="contract-surface-card space-y-6"
        >
          <h2 className="text-xl font-semibold text-white">
            Build a consistent interface discipline
          </h2>
          <p className="max-w-2xl text-base text-slate-300">
            Start by validating the current surface and wire `interfacectl
            validate` into CI. Then invite partner teams to extend the shared
            contract for future surfaces.
          </p>
          <p className="max-w-2xl text-sm text-slate-400">
            Learn more about the contract workflow in the project documentation.
          </p>
        </section>
      </main>
    </div>
  );
}
