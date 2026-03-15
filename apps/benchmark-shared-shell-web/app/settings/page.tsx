import { SharedShell } from "../_components/shared-shell";

export default function SettingsPage() {
  return (
    <SharedShell eyebrow="Settings" title="Controls and policy tuning">
      <section className="surfaceSection" data-contract-section="settings.controls">
        <div className="surfaceHeader">
          <div>
            <span className="eyebrow">Settings</span>
            <h2>Shared shell settings</h2>
          </div>
          <p>These controls are stable. The intended drift lives elsewhere in the fixture.</p>
        </div>
        <div className="cardGrid">
          <article className="surfaceCard">
            <h3>Release cadence</h3>
            <p>Ship weekly changes after governance review clears the cohort.</p>
          </article>
          <article className="surfaceCard">
            <h3>Operator policy</h3>
            <p>Keep the shell untouched while route-level sections evolve under contract pressure.</p>
          </article>
        </div>
      </section>
    </SharedShell>
  );
}
