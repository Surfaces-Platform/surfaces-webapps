export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef2ff,_#c7d2fe_50%,_#a855f7)] text-slate-900">
      <main className="contract-container flex min-h-screen flex-col gap-20 py-24">
        <section
          data-contract-section="landing.hero"
          className="contract-shell space-y-6 text-center sm:text-left"
        >
          <p className="text-xs uppercase tracking-[0.4em] text-indigo-500">
            Surfaces Platform
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.2] text-slate-900 sm:text-[2.75rem]">
            Design, inspect, and govern UX intent across every product touchpoint.
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            The Surfaces platform gives teams a bird&apos;s-eye view of interface
            health. Tie UX standards to deployable contracts and keep product
            pillars aligned with the same language.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <a
              className="contract-motion inline-flex items-center justify-center rounded-full bg-indigo-500 px-6 py-3 text-sm font-medium text-white no-underline hover:bg-indigo-400"
              href="mailto:hello@surfaces.systems"
            >
              Get in touch
            </a>
          </div>
        </section>

        <section
          data-contract-section="landing.guidance"
          className="contract-shell space-y-10"
        >
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Guidance aligned with the contract
            </h2>
            <p className="max-w-2xl text-base text-slate-600">
              Surfaces delivers built-in governance that scales with your product.
              Semantic intent, typography, and motion are backed by the same JSON
              contract powering InterfaceCTL and SurfaceOps.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <article className="rounded-2xl border border-indigo-200 bg-white/80 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Intent mapping
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Align marketing, product, and developer experiences with shared
                semantic identifiers.
              </p>
            </article>
            <article className="rounded-2xl border border-indigo-200 bg-white/80 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Contract-first audits
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                The CLI highlights violations with exact guidance on what to fix
                before launch.
              </p>
            </article>
            <article className="rounded-2xl border border-indigo-200 bg-white/80 p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Runtime parity
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Keep motion, layout, and fonts consistent across Figma, web, and
                CLI outputs.
              </p>
            </article>
          </div>
        </section>

        <section
          data-contract-section="landing.actions"
          className="contract-shell space-y-6"
        >
          <h2 className="text-xl font-semibold text-slate-900">
            Ready to align every surface?
          </h2>
          <p className="max-w-2xl text-base text-slate-600">
            Install the workspace tooling and add contract validation to your
            continuous delivery gates. Surfaces will alert you when any experience
            drifts from the intent map.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <a
              className="contract-motion inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white no-underline hover:bg-slate-700"
              href="mailto:hello@surfaces.systems"
            >
              Get in touch
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
