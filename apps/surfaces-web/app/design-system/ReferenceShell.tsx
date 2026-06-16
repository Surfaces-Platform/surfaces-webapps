import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import styles from "./reference.module.css";
import {
  accessibilityRows,
  approvalSteps,
  assetBasePath,
  brandTokens,
  changelogItems,
  componentExamples,
  currentReference,
  evidenceRows,
  governanceRows,
  grayscale,
  navItems,
  pages,
  productTokens,
  releaseRecordRows,
  resources,
  type ReferencePage,
  type ReferenceSlug,
  type ResourceItem,
} from "./referenceContent";

const logo = {
  mark: `${assetBasePath}/logo/surfaces-mark.svg`,
  markReverse: `${assetBasePath}/logo/surfaces-mark-reverse.svg`,
  markSmall: `${assetBasePath}/logo/surfaces-mark-small.svg`,
  favicon: `${assetBasePath}/logo/favicon.svg`,
  appIcon: `${assetBasePath}/logo/app-icon.svg`,
  wordmark: `${assetBasePath}/logo/surfaces-wordmark.svg`,
  lockup: `${assetBasePath}/logo/surfaces-lockup-horizontal.svg`,
  lockupReverse: `${assetBasePath}/logo/surfaces-lockup-horizontal-reverse.svg`,
  stacked: `${assetBasePath}/logo/surfaces-lockup-stacked.svg`,
  social: `${assetBasePath}/logo/surfaces-social-card.svg`,
};

interface ReferencePageViewProps {
  page: ReferencePage;
}

export function ReferencePageView({ page }: ReferencePageViewProps) {
  return (
    <main className={styles.shell} id="top">
      <ReferenceRail activeSlug={page.slug} />
      <div className={styles.content}>
        <ReferenceTopbar />
        <PageHero page={page} />
        <PageBody slug={page.slug} />
      </div>
    </main>
  );
}

function ReferenceRail({ activeSlug }: { activeSlug: ReferenceSlug }) {
  return (
    <aside className={styles.rail} aria-label="Reference navigation">
      <Link className={styles.brand} href="/design-system" aria-label="Surfaces Design System home">
        <img className={styles.brandMark} src={logo.mark} alt="" />
        <img className={styles.brandWord} src={logo.wordmark} alt="Surfaces" />
      </Link>
      <nav className={styles.nav} aria-label="Primary reference">
        {navItems.map((item) => (
          <Link key={item.slug} href={item.href} aria-current={activeSlug === item.slug ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
      <aside className={styles.railCard} aria-label="Current release">
        <span>Current</span>
        <strong>{currentReference.version}</strong>
        <p>Updated {currentReference.updated}</p>
      </aside>
    </aside>
  );
}

function ReferenceTopbar() {
  return (
    <header className={styles.topbar}>
      <Link className={styles.topbrand} href="/design-system" aria-label="Surfaces Design System home">
        <img src={logo.mark} alt="" />
        <span>Surfaces</span>
      </Link>
      <nav className={styles.toplinks} aria-label="Quick navigation">
        <Link href="/design-system/identity">Identity</Link>
        <Link href="/design-system/tokens">Tokens</Link>
        <Link href="/design-system/resources">Resources</Link>
      </nav>
    </header>
  );
}

function PageHero({ page }: { page: ReferencePage }) {
  if (page.slug === "overview") {
    return (
      <section className={`${styles.hero} ${styles.overviewHero}`} aria-labelledby="page-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>{page.label}</p>
          <h1 id="page-title">{page.title}</h1>
          <p className={styles.lede}>{page.description}</p>
          <div className={styles.heroMeta} aria-label="Reference metadata">
            {page.meta.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <ReferenceBoard />
      </section>
    );
  }

  const showIdentitySpecimen = page.slug === "identity";

  return (
    <section className={`${styles.hero} ${styles.docHero}`} aria-labelledby="page-title">
      <div className={styles.heroCopy}>
        <p className={styles.kicker}>{page.label}</p>
        <h1 id="page-title">{page.title}</h1>
        <p className={styles.lede}>{page.description}</p>
        <div className={styles.heroMeta} aria-label="Page metadata">
          {page.meta.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
      {showIdentitySpecimen ? (
        <section className={styles.specimen} aria-label="Identity specimen">
          <div className={styles.specimenHead}>
            <h2>{page.label}</h2>
            <span>{currentReference.version}</span>
          </div>
          <div className={styles.specimenLogo}>
            <img src={logo.lockup} alt="Surfaces horizontal lockup" />
          </div>
        </section>
      ) : null}
    </section>
  );
}

function ReferenceBoard() {
  return (
    <section className={styles.referenceBoard} aria-label="Surfaces reference summary">
      <article className={styles.referenceBrand} aria-label="Identity specimen">
        <img src={logo.lockup} alt="Surfaces horizontal lockup" />
        <div className={styles.markRow} role="list" aria-label="Small mark examples">
          <span role="listitem">
            <img src={logo.favicon} width="16" height="16" alt="" />
            16 px
          </span>
          <span role="listitem">
            <img src={logo.markSmall} width="24" height="24" alt="" />
            24 px
          </span>
          <span role="listitem">
            <img src={logo.mark} width="32" height="32" alt="" />
            32 px
          </span>
        </div>
      </article>
      <article className={styles.trustPanel} aria-labelledby="reference-status-title">
        <header>
          <h2 id="reference-status-title">Reference status</h2>
          <span>Current</span>
        </header>
        <dl>
          <div>
            <dt>Owner</dt>
            <dd>{currentReference.owner}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{currentReference.updated}</dd>
          </div>
          <div>
            <dt>Scope</dt>
            <dd>{currentReference.scope}</dd>
          </div>
          <div>
            <dt>Evidence</dt>
            <dd>{currentReference.evidence}</dd>
          </div>
        </dl>
      </article>
      <article className={styles.resourcePanel} aria-labelledby="quick-resources-title">
        <header>
          <h2 id="quick-resources-title">Primary resources</h2>
          <span>Downloads</span>
        </header>
        <div className={styles.downloadStrip}>
          {resources.slice(0, 4).map((item) => (
            <a key={item.href} href={item.href} download>
              {item.title}
            </a>
          ))}
        </div>
      </article>
    </section>
  );
}

function PageBody({ slug }: { slug: ReferenceSlug }) {
  switch (slug) {
    case "overview":
      return <OverviewSections />;
    case "identity":
      return <IdentitySections />;
    case "foundations":
      return <FoundationsSections />;
    case "tokens":
      return <TokenSections />;
    case "components":
      return <ComponentSections />;
    case "patterns":
      return <PatternSections />;
    case "resources":
      return <ResourceSections />;
    case "governance":
      return <GovernanceSections />;
    case "changelog":
      return <ChangelogSections />;
  }
}

function OverviewSections() {
  return (
    <>
      <section className={`${styles.section} ${styles.trustBand}`} aria-labelledby="status-title">
        <SectionHead index="00" kicker="Reference Contract" title="Stable source material for identity, product UI, and external builder handoff." titleId="status-title" />
        <dl className={styles.statusGrid}>
          <div>
            <dt>Owner</dt>
            <dd>{currentReference.owner}</dd>
          </div>
          <div>
            <dt>Evidence date</dt>
            <dd>{currentReference.updated}</dd>
          </div>
          <div>
            <dt>Accessibility scope</dt>
            <dd>Token contrast, controls, states, focus</dd>
          </div>
          <div>
            <dt>Resource scope</dt>
            <dd>Active SVGs, favicon, app icon, CSS, JSON</dd>
          </div>
        </dl>
      </section>
      <section className={styles.section} aria-labelledby="start-title">
        <SectionHead
          index="01"
          kicker="Overview"
          title="Start with the source of truth, then move into the details."
          description="Dedicated pages carry implementation details for identity, foundations, product tokens, interface components, patterns, resources, and governance."
          titleId="start-title"
        />
        <div className={styles.indexGrid}>
          {navItems.slice(1).map((item) => (
            <Link className={styles.indexCard} href={item.href} key={item.slug}>
              <span>{item.label}</span>
              <strong>{item.summary}</strong>
            </Link>
          ))}
        </div>
      </section>
      <IdentityPreview index="02" />
      <FoundationsPreview index="03" />
      <PatternPreview index="04" />
      <ResourcePreview index="05" />
    </>
  );
}

function IdentitySections() {
  return (
    <>
      <IdentityPreview index="01" />
      <section className={styles.section} aria-labelledby="small-title">
        <SectionHead index="02" kicker="Small Use" title="Small marks must stay simple and optically centered." titleId="small-title" />
        <div className={styles.specimenGrid} role="list" aria-label="Small mark sizes">
          <span role="listitem">
            <img src={logo.favicon} width="16" height="16" alt="" />
            16 px favicon
          </span>
          <span role="listitem">
            <img src={logo.markSmall} width="24" height="24" alt="" />
            24 px small mark
          </span>
          <span role="listitem">
            <img src={logo.mark} width="32" height="32" alt="" />
            32 px compact mark
          </span>
        </div>
      </section>
      <section className={styles.section} aria-labelledby="misuse-title">
        <SectionHead index="03" kicker="Misuse" title="Do not make the identity louder than the system." titleId="misuse-title" />
        <div className={styles.misuseGrid}>
          {[
            ["Color", "Do not recolor the mark with campaign, product-state, or decorative colors.", styles.tinted],
            ["Effects", "Do not add shadows, glow, extrusion, texture, or dimensional styling.", styles.shadowed],
            ["Geometry", "Do not stretch, rotate, outline, crop, or redraw the wordmark or compact mark.", styles.stretched],
            ["Placement", "Do not use the compact mark as wallpaper, decoration, or an interface control.", styles.outlined],
          ].map(([title, note, className]) => (
            <article className={styles.misuseExample} key={title}>
              <div className={`${styles.misuseStage} ${className}`}>
                <img src={logo.mark} alt="" />
              </div>
              <h3>{title}</h3>
              <p>{note}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function FoundationsSections() {
  return (
    <>
      <FoundationsPreview index="01" />
      <section className={styles.section} aria-labelledby="type-title">
        <SectionHead index="02" kicker="Type And Space" title="Use precision, not personality, to create hierarchy." titleId="type-title" />
        <div className={`${styles.grid} ${styles.three}`}>
          <InfoCard title="Typeface" text="Use the system sans stack for product and editorial surfaces. Use mono for captions, indexes, versions, and status metadata." code="Inter, SF Pro, Arial" />
          <InfoCard title="Spacing" text="Build from 4, 8, 12, 16, 24, 32, 48, and 64 px spacing values. Keep dense product evidence aligned to the same scale." />
          <InfoCard title="Rules" text="Use 1 px rules for structure and 2 px rules only when a reference specimen needs stronger separation." />
        </div>
      </section>
      <section className={styles.section} aria-labelledby="voice-title">
        <SectionHead index="03" kicker="Voice" title="Use operational language that can be checked." titleId="voice-title" />
        <div className={styles.specGrid}>
          <InfoCard title="Prefer" text="Compose, evaluate, review, approve, inspect, ship, rollback." />
          <InfoCard title="Avoid" text="Vague intelligence claims, magic language, hype, and ornamental metaphors." />
          <InfoCard title="Evidence" text="Name the record, owner, evaluation set, policy boundary, approval state, and rollout scope." />
          <InfoCard title="Tone" text="Quiet, direct, factual, and specific. Let product evidence carry weight." />
        </div>
      </section>
    </>
  );
}

function TokenSections() {
  return (
    <>
      <section className={styles.section} aria-labelledby="install-title">
        <SectionHead index="01" kicker="Use" title="Import the CSS file, then apply semantic classes where they match the component." titleId="install-title" />
        <article className={styles.card}>
          <h3>CSS import</h3>
          <pre className={styles.code}><code>{'<link rel="stylesheet" href="/design-system/tokens/surfaces.css">'}</code></pre>
          <pre className={styles.code}><code>{'<button class="sp-button sp-button-primary" type="button">Approve release</button>\n<span class="sp-tag sp-tag-success">Verified</span>'}</code></pre>
        </article>
      </section>
      <section className={styles.section} aria-labelledby="brand-title">
        <SectionHead index="02" kicker="Brand Tokens" title="Grayscale primitives support identity, editorial surfaces, rules, and captions." titleId="brand-title" />
        <TokenTable rows={brandTokens} />
      </section>
      <section className={styles.section} aria-labelledby="product-title">
        <SectionHead index="03" kicker="Product Tokens" title="Semantic product color appears only when it carries meaning." titleId="product-title" />
        <TokenTable rows={productTokens} />
        <StateExamples />
      </section>
    </>
  );
}

function ComponentSections() {
  return (
    <>
      <section className={styles.section} aria-labelledby="component-title">
        <SectionHead index="01" kicker="Component Coverage" title="Examples cover expected interaction states and product semantics." titleId="component-title" />
        <div className={`${styles.grid} ${styles.two}`}>
          {componentExamples.map((item) => (
            <article className={styles.card} key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.note}</p>
              <pre className={styles.code}><code>{item.code}</code></pre>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.section} aria-labelledby="state-title">
        <SectionHead index="02" kicker="States" title="Focus, disabled, validation, and status must remain explicit." titleId="state-title" />
        <ComponentSpecimen />
      </section>
    </>
  );
}

function PatternSections() {
  return (
    <>
      <PatternPreview index="01" />
      <section className={styles.section} aria-labelledby="approval-title">
        <SectionHead index="02" kicker="Approval Path" title="The pattern names the action and the accountable owner at each step." titleId="approval-title" />
        <ol className={styles.approvalPath}>
          {approvalSteps.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </li>
          ))}
        </ol>
      </section>
      <section className={styles.section} aria-labelledby="control-title">
        <SectionHead index="03" kicker="Control Surface" title="Control modules keep policy, audit, security, and ownership visible." titleId="control-title" />
        <div className={styles.specGrid}>
          <InfoCard title="Policy boundary" text="State what the product must not do and when fallback is required." />
          <InfoCard title="Audit trail" text="Show evidence source, approver, timestamp, and release scope." />
          <InfoCard title="Ownership" text="Name the team, reviewer, and release owner." />
          <InfoCard title="Readiness" text="Indicate pass, review, or blocked states with semantic tokens." />
        </div>
      </section>
    </>
  );
}

function ResourceSections() {
  return (
    <>
      <ResourcePreview index="01" />
      <section className={styles.section} aria-labelledby="all-resources-title">
        <SectionHead index="02" kicker="All Resources" title="Download individual assets when a full kit is not needed." titleId="all-resources-title" />
        <ResourceGrid items={resources} />
      </section>
      <section className={styles.section} aria-labelledby="files-title">
        <SectionHead index="03" kicker="Implementation Files" title="Use token files directly in product and documentation work." titleId="files-title" />
        <table className={styles.table}>
          <thead>
            <tr><th>File</th><th>Type</th><th>Use</th></tr>
          </thead>
          <tbody>
            {resources.filter((item) => item.preview === "file").map((item) => (
              <tr key={item.href}>
                <td><a href={item.href} download>{item.title}</a></td>
                <td>{item.kind.split(" / ")[0]}</td>
                <td>{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function GovernanceSections() {
  return (
    <>
      <section className={styles.section} aria-labelledby="source-title">
        <SectionHead index="01" kicker="Source Of Truth" title="The public reference is authoritative for outside use." titleId="source-title" />
        <div className={styles.specGrid}>
          {governanceRows.map(([title, text]) => (
            <InfoCard key={title} title={title} text={text} />
          ))}
        </div>
      </section>
      <section className={styles.section} aria-labelledby="access-title">
        <SectionHead index="02" kicker="Accessibility Evidence" title="The current evidence covers token contrast, controls, states, validation, and focus." titleId="access-title" />
        <table className={styles.table}>
          <thead>
            <tr><th>Area</th><th>Status</th><th>Evidence</th></tr>
          </thead>
          <tbody>
            {accessibilityRows.map(([area, status, evidence]) => (
              <tr key={area}>
                <td>{area}</td>
                <td><StatusTag tone={status === "Checked" ? "success" : "info"}>{status}</StatusTag></td>
                <td>{evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className={styles.section} aria-labelledby="boundary-title">
        <SectionHead index="03" kicker="Publishing Boundary" title="Publish only approved, public-safe system material." titleId="boundary-title" />
        <div className={styles.specGrid}>
          <InfoCard title="Allowed" text="Active identity assets, current tokens, public examples, release notes, and versioned resources." />
          <InfoCard title="Restricted" text="Unapproved drafts, private comments, temporary notes, and nonpublic reports." />
          <InfoCard title="Outside use" text="Use the identity only to refer to Surfaces. Do not imply sponsorship, endorsement, or partnership without approval." />
          <InfoCard title="Changes" text="Minor copy fixes may ship with release notes. Token or identity changes require versioned updates." />
        </div>
      </section>
    </>
  );
}

function ChangelogSections() {
  return (
    <>
      <section className={styles.section} aria-labelledby="current-title">
        <SectionHead index="01" kicker="Current Release" title={`${currentReference.version} / ${currentReference.updated}`} titleId="current-title" />
        <div className={`${styles.grid} ${styles.two}`}>
          <article className={styles.card}>
            <h3>Added</h3>
            <ul className={styles.list}>
              {changelogItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
          <article className={styles.card}>
            <h3>Fixed</h3>
            <ul className={styles.list}>
              <li>Scoped metadata for system status, owner, update date, and evidence coverage.</li>
              <li>Explicit swatch foreground colors for readable grayscale samples.</li>
              <li>Reduced-motion-safe page scrolling.</li>
              <li>Public resource boundary tightened.</li>
            </ul>
          </article>
        </div>
      </section>
      <section className={styles.section} aria-labelledby="policy-title">
        <SectionHead index="02" kicker="Version Policy" title="Version changes according to the effect on builders." titleId="policy-title" />
        <table className={styles.table}>
          <thead><tr><th>Change class</th><th>Version change</th><th>Examples</th></tr></thead>
          <tbody>
            <tr><td>Patch</td><td>1.0.x</td><td>Copy fixes, link repairs, documentation clarifications</td></tr>
            <tr><td>Minor</td><td>1.x.0</td><td>New examples, new pages, additive token aliases</td></tr>
            <tr><td>Major</td><td>x.0.0</td><td>Identity replacement, token semantic changes, removed asset URLs</td></tr>
          </tbody>
        </table>
      </section>
      <section className={styles.section} aria-labelledby="deprecation-title">
        <SectionHead index="03" kicker="Deprecation" title="Keep existing public URLs working whenever possible." titleId="deprecation-title" />
        <div className={styles.specGrid}>
          <InfoCard title="Asset URLs" text="Preserve active logo and token URLs. Add replacements before removing old references." />
          <InfoCard title="Token names" text="Prefer aliases before removing or renaming product semantic tokens." />
          <InfoCard title="Pages" text="Redirect retired pages to the closest current reference page." />
          <InfoCard title="Notice" text="Document removals or replacements in the next changelog entry." />
        </div>
      </section>
    </>
  );
}

function IdentityPreview({ index }: { index: string }) {
  return (
    <section className={styles.section} aria-labelledby={`identity-title-${index}`}>
      <SectionHead
        index={index}
        kicker="Identity"
        title="Use the approved files without redrawing the identity."
        description="Use the wordmark whenever space allows. Reserve the compact mark for constrained spaces."
        titleId={`identity-title-${index}`}
      />
      <div className={`${styles.grid} ${styles.two} ${styles.identityGrid}`}>
        <article className={`${styles.logoStage} ${styles.logoStagePrimary}`}>
          <img src={logo.lockup} alt="Surfaces horizontal lockup" />
        </article>
        <article className={`${styles.logoStage} ${styles.dark}`}>
          <img src={logo.lockupReverse} alt="Surfaces reverse horizontal lockup" />
        </article>
        <InfoCard title="Minimum sizes" text="Use 16 px for favicon, 24 px for small mark, 128 px for horizontal lockup, and 96 px for stacked lockup." />
        <InfoCard title="Clearspace" text="Keep at least one compact-mark width around lockups. In dense chrome, keep one-half mark width around the compact mark." />
      </div>
    </section>
  );
}

function FoundationsPreview({ index }: { index: string }) {
  return (
    <section className={styles.section} aria-labelledby={`foundations-title-${index}`}>
      <SectionHead
        index={index}
        kicker="Foundations"
        title="A grayscale canon for release evidence, not decoration."
        description="Brand surfaces stay monochrome. Product semantic color appears only when it communicates state, validation, focus, alert, selection, or data meaning."
        titleId={`foundations-title-${index}`}
      />
      <div className={styles.swatchGrid} role="img" aria-label="Grayscale canon">
        {grayscale.map((swatch) => (
          <div key={swatch.name} style={{ background: swatch.value, color: swatch.fg } as CSSProperties}>
            <span>{swatch.name}</span>
            <strong>{swatch.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function PatternPreview({ index }: { index: string }) {
  return (
    <section className={styles.section} aria-labelledby={`patterns-title-${index}`}>
      <SectionHead
        index={index}
        kicker="Patterns"
        title="Release evidence should be named, inspectable, and owned."
        description="The core product pattern connects intent, behavior standards, evidence, approval, and rollout scope in one record."
        titleId={`patterns-title-${index}`}
      />
      <div className={`${styles.grid} ${styles.two}`}>
        <ReleaseRecord />
        <EvidenceTable />
      </div>
    </section>
  );
}

function ResourcePreview({ index }: { index: string }) {
  return (
    <section className={styles.section} aria-labelledby={`resources-title-${index}`}>
      <SectionHead
        index={index}
        kicker="Resources"
        title="Download the approved assets and token files from this reference."
        description="Assets are scoped under the design-system path to keep product files and public reference files separate."
        titleId={`resources-title-${index}`}
      />
      <ResourceGrid items={resources.slice(0, 6)} />
    </section>
  );
}

function SectionHead({
  index,
  kicker,
  title,
  description,
  titleId,
}: {
  index: string;
  kicker: string;
  title: string;
  description?: string;
  titleId?: string;
}) {
  return (
    <div className={styles.sectionHead}>
      <span>{index}</span>
      <div>
        <p className={styles.kicker}>{kicker}</p>
        <h2 id={titleId}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
    </div>
  );
}

function InfoCard({ title, text, code }: { title: string; text: string; code?: string }) {
  return (
    <article className={styles.card}>
      <h3>{title}</h3>
      <p>{text}</p>
      {code ? <code>{code}</code> : null}
    </article>
  );
}

function TokenTable({ rows }: { rows: readonly (readonly [string, string, string])[] }) {
  return (
    <table className={`${styles.table} ${styles.tokenTable}`}>
      <thead><tr><th>Token</th><th>Value</th><th>Use</th></tr></thead>
      <tbody>
        {rows.map(([token, value, use]) => (
          <tr key={token}>
            <td><code>{token}</code></td>
            <td>{value}</td>
            <td>{use}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StateExamples() {
  return (
    <div className={styles.stateExamples} aria-label="Product semantic state examples">
      <StatusTag tone="success">Approved</StatusTag>
      <StatusTag tone="warning">Review</StatusTag>
      <StatusTag tone="danger">Blocked</StatusTag>
      <StatusTag tone="info">Info</StatusTag>
    </div>
  );
}

function StatusTag({ tone, children }: { tone: "success" | "warning" | "danger" | "info"; children: ReactNode }) {
  return <span className={`${styles.statusTag} ${styles[tone]}`}>{children}</span>;
}

function ComponentSpecimen() {
  return (
    <div className={styles.componentSpecimen}>
      <button className={styles.primaryButton} type="button">Approve release</button>
      <button className={styles.secondaryButton} type="button">View record</button>
      <button className={styles.disabledButton} type="button" disabled>Disabled</button>
      <label>
        <span>Evaluation set</span>
        <input defaultValue="claims-intake-v7" />
      </label>
      <div className={styles.alertWarning}>Fallback evidence needs review before expansion.</div>
      <table className={styles.table}>
        <thead><tr><th>State</th><th>Owner</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Approval</td><td>Claims Experience</td><td><StatusTag tone="success">Approved</StatusTag></td></tr>
          <tr><td>Fallback</td><td>Policy Review</td><td><StatusTag tone="warning">Review</StatusTag></td></tr>
        </tbody>
      </table>
    </div>
  );
}

function ReleaseRecord() {
  return (
    <article className={styles.releaseRecord}>
      <div className={styles.recordTop}>
        <span>Release Record</span>
        <strong>Claims Assistant / Release 014</strong>
      </div>
      <dl>
        {releaseRecordRows.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function EvidenceTable() {
  return (
    <article className={styles.card}>
      <h3>Evidence Table</h3>
      <table className={styles.table}>
        <thead><tr><th>Check</th><th>Result</th><th>Status</th></tr></thead>
        <tbody>
          {evidenceRows.map(([check, _description, result, status]) => (
            <tr key={check}>
              <td>{check}</td>
              <td>{result}</td>
              <td><StatusTag tone={status === "Approved" ? "success" : "warning"}>{status}</StatusTag></td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function ResourceGrid({ items }: { items: ResourceItem[] }) {
  return (
    <div className={styles.resourceGrid}>
      {items.map((item) => (
        <a className={styles.resourceCard} href={item.href} download key={item.href}>
          <ResourcePreviewStage item={item} />
          <span>{item.title}</span>
          <strong>{item.kind}</strong>
          <p>{item.note}</p>
        </a>
      ))}
    </div>
  );
}

function ResourcePreviewStage({ item }: { item: ResourceItem }) {
  if (item.preview === "file") {
    return <span className={styles.resourcePreview}><code>{item.href.split("/").at(-1)}</code></span>;
  }

  if (item.preview === "social") {
    return <span className={`${styles.resourcePreview} ${styles.socialPreview}`}><img src={logo.social} alt="" /></span>;
  }

  if (item.preview === "app") {
    return <span className={`${styles.resourcePreview} ${styles.iconPreview}`}><img src={logo.appIcon} alt="" /></span>;
  }

  if (item.preview === "reverse") {
    return <span className={`${styles.resourcePreview} ${styles.dark} ${styles.iconPreview}`}><img src={item.href.endsWith(".zip") ? logo.lockupReverse : item.href} alt="" /></span>;
  }

  if (item.preview === "mark") {
    return <span className={`${styles.resourcePreview} ${styles.iconPreview}`}><img src={item.href} alt="" /></span>;
  }

  return <span className={styles.resourcePreview}><img src={item.href} alt="" /></span>;
}

export const referencePages = pages;
