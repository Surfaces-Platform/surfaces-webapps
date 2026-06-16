export type ReferenceSlug =
  | "overview"
  | "identity"
  | "foundations"
  | "tokens"
  | "components"
  | "patterns"
  | "resources"
  | "governance"
  | "changelog";

export interface NavItem {
  slug: ReferenceSlug;
  label: string;
  href: string;
  summary: string;
}

export interface ResourceItem {
  title: string;
  kind: string;
  href: string;
  note: string;
  preview: "wordmark" | "mark" | "reverse" | "app" | "social" | "file";
}

export interface ReferencePage {
  slug: ReferenceSlug;
  label: string;
  title: string;
  description: string;
  meta: string[];
}

export const designSystemOrigin = "https://surfaces.systems";
export const designSystemBasePath = "/design-system";
export const assetBasePath = `${designSystemBasePath}`;

export const currentReference = {
  version: "Version 1.0",
  updated: "June 16, 2026",
  owner: "Product Systems",
  evidence: "Contrast, state, focus, and responsive checks",
  scope: "Identity, foundations, tokens, components, patterns, resources",
} as const;

export const navItems: NavItem[] = [
  {
    slug: "overview",
    label: "Overview",
    href: designSystemBasePath,
    summary: "System status, quick links, and primary downloads.",
  },
  {
    slug: "identity",
    label: "Identity",
    href: `${designSystemBasePath}/identity`,
    summary: "Wordmark, compact mark, lockups, sizing, clearspace, and misuse.",
  },
  {
    slug: "foundations",
    label: "Foundations",
    href: `${designSystemBasePath}/foundations`,
    summary: "Grayscale color, type, spacing, rules, captions, and voice.",
  },
  {
    slug: "tokens",
    label: "Tokens",
    href: `${designSystemBasePath}/tokens`,
    summary: "Brand primitives, product semantics, CSS variables, and modes.",
  },
  {
    slug: "components",
    label: "Components",
    href: `${designSystemBasePath}/components`,
    summary: "Buttons, inputs, tags, alerts, tables, focus, and disabled states.",
  },
  {
    slug: "patterns",
    label: "Patterns",
    href: `${designSystemBasePath}/patterns`,
    summary: "Release Record, Evidence Table, Approval Path, and Control Surface.",
  },
  {
    slug: "resources",
    label: "Resources",
    href: `${designSystemBasePath}/resources`,
    summary: "Active assets, token files, and the versioned brand kit.",
  },
  {
    slug: "governance",
    label: "Governance",
    href: `${designSystemBasePath}/governance`,
    summary: "Ownership, update cadence, accessibility evidence, and boundaries.",
  },
  {
    slug: "changelog",
    label: "Changelog",
    href: `${designSystemBasePath}/changelog`,
    summary: "Release notes, version policy, and deprecation rules.",
  },
];

export const pages: Record<ReferenceSlug, ReferencePage> = {
  overview: {
    slug: "overview",
    label: "Reference / Version 1.0",
    title: "Surfaces Design System",
    description:
      "Identity, product tokens, patterns, resources, and implementation guidance for building with Surfaces.",
    meta: [
      `Owner / ${currentReference.owner}`,
      `Updated / ${currentReference.updated}`,
      "Scope / public reference",
    ],
  },
  identity: {
    slug: "identity",
    label: "Identity",
    title: "Wordmark first, compact mark second.",
    description:
      "The Surfaces wordmark is the primary identity. The compact mark supports app icons, favicons, dense chrome, avatars, and partner placements where the wordmark will not hold.",
    meta: ["Minimum lockup / 128 px", "Mark / 16 px minimum", "Clearspace / one mark width"],
  },
  foundations: {
    slug: "foundations",
    label: "Foundations",
    title: "Quiet structure for evidence-led product work.",
    description:
      "Foundations are deliberately sparse: grayscale color, precise type, durable spacing, thin rules, metadata captions, and concrete voice.",
    meta: ["Color / grayscale", "Type / system sans", "Rules / 1 px"],
  },
  tokens: {
    slug: "tokens",
    label: "Tokens",
    title: "Brand primitives and product semantics stay separate.",
    description:
      "Use brand tokens for identity and grayscale expression. Use product semantic tokens for interface text, surfaces, borders, focus, actions, validation, and status.",
    meta: ["Brand JSON", "Product JSON", "CSS variables"],
  },
  components: {
    slug: "components",
    label: "Components",
    title: "Common components use stable semantic behavior.",
    description:
      "Documented examples cover buttons, inputs, tags, alerts, tables, focus states, disabled states, validation, and semantic status.",
    meta: ["Button", "Input", "Tag", "Alert", "Table"],
  },
  patterns: {
    slug: "patterns",
    label: "Patterns",
    title: "Reusable modules for release evidence and approval.",
    description:
      "Patterns make product work inspectable through release records, evidence tables, approval paths, control surfaces, and resource cards.",
    meta: ["Release Record", "Evidence Table", "Approval Path"],
  },
  resources: {
    slug: "resources",
    label: "Resources",
    title: "Active assets and implementation files.",
    description:
      "Download the active Surfaces identity assets, token files, and versioned brand kit. Use these files as provided.",
    meta: ["SVG", "CSS", "JSON", "ZIP"],
  },
  governance: {
    slug: "governance",
    label: "Governance",
    title: "Keep public guidance, assets, and tokens aligned.",
    description:
      "Governance defines ownership, change cadence, required checks, accessibility evidence, and the boundary for material published outside Surfaces.",
    meta: [`Owner / ${currentReference.owner}`, "Review / monthly", currentReference.version],
  },
  changelog: {
    slug: "changelog",
    label: "Changelog",
    title: "Release notes for the public reference.",
    description:
      "Use this page to understand what changed, which assets are current, and how future changes are versioned.",
    meta: [currentReference.version, currentReference.updated, "Policy / semver"],
  },
};

export const grayscale = [
  { name: "Ink", value: "#0D0D0D", fg: "#FFFFFF" },
  { name: "Graphite", value: "#242424", fg: "#FFFFFF" },
  { name: "Steel", value: "#575757", fg: "#FFFFFF" },
  { name: "Ash", value: "#767676", fg: "#FFFFFF" },
  { name: "Line", value: "#B8B8B2", fg: "#0D0D0D" },
  { name: "Plane", value: "#D6D6D0", fg: "#0D0D0D" },
  { name: "Mist", value: "#EFEFEC", fg: "#0D0D0D" },
  { name: "Paper", value: "#F7F7F4", fg: "#0D0D0D" },
] as const;

export const brandTokens = [
  ["--sp-color-ink", "#0D0D0D", "Primary text and identity"],
  ["--sp-color-paper", "#F7F7F4", "Page background"],
  ["--sp-color-plane", "#D6D6D0", "Structural surfaces"],
  ["--sp-color-line", "#B8B8B2", "Rules and dividers"],
  ["--sp-color-steel", "#575757", "Captions and metadata"],
  ["--sp-font-sans", "Inter, SF Pro, Arial", "Interface and reference text"],
  ["--sp-radius-sm", "4px", "Controls and small cards"],
  ["--sp-space-6", "24px", "Primary spacing unit"],
] as const;

export const productTokens = [
  ["Action", "--sp-ui-action-bg", "Primary commands"],
  ["Focus", "--sp-ui-focus-ring", "Keyboard focus"],
  ["Success", "--sp-ui-success-bg", "Approved or verified state"],
  ["Warning", "--sp-ui-warning-bg", "Needs review state"],
  ["Danger", "--sp-ui-danger-bg", "Blocked or destructive state"],
  ["Info", "--sp-ui-info-bg", "Informational state"],
] as const;

export const resources: ResourceItem[] = [
  {
    title: "Surfaces brand kit",
    kind: "ZIP / Version 1.0",
    href: `${assetBasePath}/brand-kit/surfaces-brand-kit-v1.0.zip`,
    note: "Complete handoff package for approved identity assets and token files.",
    preview: "reverse",
  },
  {
    title: "Wordmark",
    kind: "SVG / Primary identity",
    href: `${assetBasePath}/logo/surfaces-wordmark.svg`,
    note: "Use when space allows the name to carry the identity.",
    preview: "wordmark",
  },
  {
    title: "Compact mark",
    kind: "SVG / Constrained use",
    href: `${assetBasePath}/logo/surfaces-mark.svg`,
    note: "Use for favicons, app icons, avatars, and dense chrome.",
    preview: "mark",
  },
  {
    title: "Reverse mark",
    kind: "SVG / Dark surfaces",
    href: `${assetBasePath}/logo/surfaces-mark-reverse.svg`,
    note: "Use on ink or dark graphite backgrounds only.",
    preview: "reverse",
  },
  {
    title: "Small mark",
    kind: "SVG / 24 px",
    href: `${assetBasePath}/logo/surfaces-mark-small.svg`,
    note: "Use when the full compact mark loses clarity.",
    preview: "mark",
  },
  {
    title: "Mono mark",
    kind: "SVG / One color",
    href: `${assetBasePath}/logo/surfaces-mark-mono.svg`,
    note: "Use for print, engraving, labels, and one-color reproduction.",
    preview: "mark",
  },
  {
    title: "Horizontal lockup",
    kind: "SVG / Standard use",
    href: `${assetBasePath}/logo/surfaces-lockup-horizontal.svg`,
    note: "Use for headers, docs, partner lists, and broad placements.",
    preview: "wordmark",
  },
  {
    title: "Stacked lockup",
    kind: "SVG / Narrow use",
    href: `${assetBasePath}/logo/surfaces-lockup-stacked.svg`,
    note: "Use when horizontal space is constrained but the name should remain visible.",
    preview: "wordmark",
  },
  {
    title: "Favicon",
    kind: "SVG / Browser icon",
    href: `${assetBasePath}/logo/favicon.svg`,
    note: "Use at 16 px and browser tab sizes.",
    preview: "mark",
  },
  {
    title: "App icon",
    kind: "SVG / Product icon",
    href: `${assetBasePath}/logo/app-icon.svg`,
    note: "Use for application icons and launch surfaces.",
    preview: "app",
  },
  {
    title: "Social card",
    kind: "SVG / Share image",
    href: `${assetBasePath}/logo/surfaces-social-card.svg`,
    note: "Use for public previews and shared links.",
    preview: "social",
  },
  {
    title: "CSS tokens",
    kind: "CSS / Variables and classes",
    href: `${assetBasePath}/tokens/surfaces.css`,
    note: "Use for CSS variables, state classes, and component examples.",
    preview: "file",
  },
  {
    title: "Brand tokens",
    kind: "JSON / Brand primitives",
    href: `${assetBasePath}/tokens/surfaces.tokens.json`,
    note: "Use for grayscale brand primitives and expression aliases.",
    preview: "file",
  },
  {
    title: "Product tokens",
    kind: "JSON / Product semantics",
    href: `${assetBasePath}/tokens/surfaces.product.tokens.json`,
    note: "Use for interface text, surfaces, states, focus, and validation.",
    preview: "file",
  },
];

export const releaseRecordRows = [
  ["Record", "Claims Assistant / Release 014"],
  ["Owner", "Claims Experience"],
  ["Evaluation set", "claims-intake-v7 / 420 cases"],
  ["Boundary", "No policy advice without source confirmation"],
  ["Fallback", "Human review within service queue"],
  ["Approval", "Approved for limited release"],
  ["Rollout", "12% of authenticated claims sessions"],
] as const;

export const evidenceRows = [
  ["Behavior", "Source confirmation before recommendation", "412 / 420 pass", "Approved"],
  ["Boundary", "No unsupported coverage claim", "420 / 420 pass", "Approved"],
  ["Fallback", "Escalate after missing evidence", "418 / 420 pass", "Review"],
  ["Audit", "Owner and timestamp present", "420 / 420 pass", "Approved"],
] as const;

export const approvalSteps = [
  "Compose intent",
  "Evaluate behavior",
  "Review evidence",
  "Approve release",
  "Ship with owner",
] as const;

export const componentExamples = [
  {
    title: "Button",
    note: "Use the primary button for one principal command per surface.",
    code: '<button class="sp-button sp-button-primary">Approve release</button>',
  },
  {
    title: "Input",
    note: "Labels remain visible; helper copy and validation text are explicit.",
    code: '<label>Evaluation set <input class="sp-input" value="claims-intake-v7"></label>',
  },
  {
    title: "Tag",
    note: "Tags represent state or metadata, not decoration.",
    code: '<span class="sp-tag sp-tag-success">Approved</span>',
  },
  {
    title: "Alert",
    note: "Alerts name the state and the next action.",
    code: '<div class="sp-alert sp-alert-warning">Fallback evidence needs review.</div>',
  },
  {
    title: "Table",
    note: "Tables carry evidence, ownership, and status.",
    code: '<table class="sp-table">...</table>',
  },
] as const;

export const governanceRows = [
  ["Owner", "Product Systems owns identity guidance, resource packaging, token documentation, and release notes."],
  ["Updates", "Visible guidance, downloadable assets, token files, and release notes ship together."],
  ["Cadence", "Review monthly or whenever identity assets, token semantics, or public patterns change."],
  ["Support", "Use Product Systems as the contact owner for public reference questions and change requests."],
] as const;

export const accessibilityRows = [
  ["Text pairs", "Checked", "Light and dark text contrast pairs meet AA targets."],
  ["Controls", "Checked", "Buttons, inputs, disabled states, and focus rings are covered."],
  ["Semantic states", "Checked", "Success, warning, danger, info, and neutral states are covered."],
  ["Layout", "Review each release", "Pages are checked at desktop and 390 px mobile widths."],
] as const;

export const changelogItems = [
  "Public reference overview with identity, foundations, tokens, components, patterns, resources, and governance.",
  "Dedicated pages for the public reference set.",
  "Versioned brand kit and direct asset downloads.",
  "Accessibility evidence summary and product token coverage.",
] as const;

export function getPage(slug: string): ReferencePage | undefined {
  return pages[slug as ReferenceSlug];
}
