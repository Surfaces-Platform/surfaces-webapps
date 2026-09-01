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
  version: "Version 0.2",
  updated: "July 5, 2026",
  owner: "Product Systems",
  evidence: "Simple Slab assets, token values, review-copy checks, and responsive checks",
  scope: "Simple Slab identity, public-page tokens, generated-screen review patterns, resources",
} as const;

export const navItems: NavItem[] = [
  {
    slug: "overview",
    label: "Overview",
    href: designSystemBasePath,
    summary: "Current Simple Slab source, proof reference, and downloads.",
  },
  {
    slug: "identity",
    label: "Identity",
    href: `${designSystemBasePath}/identity`,
    summary: "Simple Slab mark, lockups, sizing, clearspace, and misuse.",
  },
  {
    slug: "foundations",
    label: "Foundations",
    href: `${designSystemBasePath}/foundations`,
    summary: "Active colors, type, spacing, rules, captions, and voice.",
  },
  {
    slug: "tokens",
    label: "Tokens",
    href: `${designSystemBasePath}/tokens`,
    summary: "Brand primitives, public-page roles, CSS variables, and review signals.",
  },
  {
    slug: "components",
    label: "Components",
    href: `${designSystemBasePath}/components`,
    summary: "Buttons, media cards, tags, focus, and review-friendly states.",
  },
  {
    slug: "patterns",
    label: "Patterns",
    href: `${designSystemBasePath}/patterns`,
    summary: "Generated-screen comparison, visible rationale, owner, and next step.",
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
    summary: "Ownership, update cadence, proof scope, and public boundaries.",
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
    label: "Reference / Version 0.2",
    title: "Surfaces Design System",
    description:
      "Simple Slab identity, public-page tokens, and proof-oriented patterns for reviewable generated UI.",
    meta: [
      `Owner / ${currentReference.owner}`,
      `Updated / ${currentReference.updated}`,
      "Scope / public reference",
    ],
  },
  identity: {
    slug: "identity",
    label: "Identity",
    title: "Use the Simple Slab mark exactly as drawn.",
    description:
      "The active mark is three slabs: a top wedge, a middle plane, and a lower wedge. Do not redraw it, round it, add dots, or turn Proof Cyan into mark geometry.",
    meta: ["Master viewBox / 0 0 64 64", "Small mark / 16-24 px", "Radius / do not smooth geometry"],
  },
  foundations: {
    slug: "foundations",
    label: "Foundations",
    title: "Quiet structure for generated-screen review.",
    description:
      "Foundations stay sparse: Simple Slab color, fixed type, durable spacing, thin rules, concise captions, and concrete voice.",
    meta: ["Color / Simple Slab", "Type / Geist, Inter, Arial", "Rules / 1 px"],
  },
  tokens: {
    slug: "tokens",
    label: "Tokens",
    title: "Brand primitives and review signals stay separate.",
    description:
      "Use Ink, Ivory, Nickel, Rule, Paper, Muted, and Subtle for the visual system. Use Proof Cyan only for small proof and focus signals.",
    meta: ["Brand JSON", "Public-page JSON", "CSS variables"],
  },
  components: {
    slug: "components",
    label: "Components",
    title: "Common pieces keep review context readable.",
    description:
      "Documented examples cover buttons, media cards, tags, focus states, and compact review summaries.",
    meta: ["Button", "Media card", "Tag", "Focus", "Question row"],
  },
  patterns: {
    slug: "patterns",
    label: "Patterns",
    title: "Reusable patterns for screens that look ready before they are.",
    description:
      "Patterns keep source, behavior, owner, rationale, and next step beside generated work before it moves into handoff.",
    meta: ["Generated screen", "Visible rationale", "Review context"],
  },
  resources: {
    slug: "resources",
    label: "Resources",
    title: "Active assets and resource files.",
    description:
      "Download the active Surfaces identity assets, token files, and versioned brand kit. Use these files as provided.",
    meta: ["SVG", "CSS", "JSON", "ZIP"],
  },
  governance: {
    slug: "governance",
    label: "Governance",
    title: "Keep guidance, assets, and claims aligned.",
    description:
      "Governance defines ownership, change cadence, required checks, proof scope, and the boundary for public Surfaces material.",
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
  { name: "Ink", value: "#0B0D0E", fg: "#FFFFFF" },
  { name: "Ivory", value: "#F7F6F2", fg: "#0B0D0E" },
  { name: "Nickel", value: "#8B9096", fg: "#0B0D0E" },
  { name: "Rule", value: "#DAD7CF", fg: "#0B0D0E" },
  { name: "Paper", value: "#FFFFFF", fg: "#0B0D0E" },
  { name: "Muted text", value: "#3C4145", fg: "#FFFFFF" },
  { name: "Subtle text", value: "#555B60", fg: "#FFFFFF" },
  { name: "Proof cyan", value: "#00A7C8", fg: "#0B0D0E" },
] as const;

export const brandTokens = [
  ["--sp-color-ink", "#0B0D0E", "Primary text and identity"],
  ["--sp-color-ivory", "#F7F6F2", "Warm page canvas"],
  ["--sp-color-nickel", "#8B9096", "Lower slab and secondary neutral"],
  ["--sp-color-rule", "#DAD7CF", "Rules and dividers"],
  ["--sp-color-paper", "#FFFFFF", "Raised surface"],
  ["--sp-color-proof", "#00A7C8", "Small proof or focus signal only"],
  ["--sp-font-sans", "Geist, Inter, Arial", "Interface and reference text"],
  ["--sp-radius-8", "8px", "Maximum standard radius"],
] as const;

export const productTokens = [
  ["Action", "--sp-ui-action", "Primary commands"],
  ["Focus", "--sp-ui-focus-ring", "Keyboard focus"],
  ["Proof accent", "--sp-ui-focus-accent", "Small proof or active signal"],
  ["Surface", "--sp-ui-surface", "Raised public-page surface"],
  ["Border", "--sp-ui-border", "Rules and dividers"],
  ["Muted text", "--sp-ui-fg-secondary", "Supporting copy"],
] as const;

export const resources: ResourceItem[] = [
  {
    title: "Surfaces brand kit",
    kind: "ZIP / Version 0.2",
    href: `${assetBasePath}/brand-kit/surfaces-brand-kit-v0.2.zip`,
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
    title: "Simple Slab mark",
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
    kind: "SVG / 16-24 px",
    href: `${assetBasePath}/logo/surfaces-mark-small.svg`,
    note: "Use for favicon, 16 px, and 24 px placements where the full lockup loses clarity.",
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
    kind: "CSS / Variables",
    href: `${assetBasePath}/tokens/surfaces.css`,
    note: "Use for Simple Slab color roles, focus, button, and proof-media variables.",
    preview: "file",
  },
  {
    title: "Brand tokens",
    kind: "JSON / Brand primitives",
    href: `${assetBasePath}/tokens/surfaces.tokens.json`,
    note: "Use for active Simple Slab primitives, radius, and type references.",
    preview: "file",
  },
  {
    title: "Product tokens",
    kind: "JSON / Public-page roles",
    href: `${assetBasePath}/tokens/surfaces.product.tokens.json`,
    note: "Use for public-page surfaces, text, borders, action, focus, and proof signal roles.",
    preview: "file",
  },
];

export const releaseRecordRows = [
  ["Screen", "Generated renewal handoff"],
  ["Owner", "Design Systems"],
  ["Source", "Renewal policy and product terms"],
  ["Behavior", "Keep state, evidence, and next step visible"],
  ["Question", "Which customer term survives here?"],
  ["Next step", "Revise the screen before sharing"],
] as const;

export const evidenceRows = [
  ["Source", "Which pattern, term, or brand choice belongs here?", "Visible", "Review"],
  ["Behavior", "What must stay true for loading, errors, focus, and state?", "Visible", "Review"],
  ["Owner", "Who can resolve the open question before the work moves?", "Visible", "Review"],
  ["Next", "What changes before the screen is shared?", "Visible", "Review"],
] as const;

export const approvalSteps = [
  "Generate screen",
  "Attach rationale",
  "Name owner",
  "Review before sharing",
  "Carry decision forward",
] as const;

export const componentExamples = [
  {
    title: "Button",
    note: "Use the primary button for one principal command on the page.",
  },
  {
    title: "Media card",
    note: "Pair a generated-screen image with the point a designer should inspect.",
  },
  {
    title: "Tag",
    note: "Tags represent state or metadata, not decoration.",
  },
  {
    title: "Question row",
    note: "Rows should name source, behavior, owner, or next step in plain language.",
  },
  {
    title: "Focus",
    note: "Focus uses Ink for contrast. Proof Cyan may support it, but cannot be the only cue.",
  },
] as const;

export const governanceRows = [
  ["Owner", "Product Systems owns identity guidance, resource packaging, token documentation, and release notes."],
  ["Updates", "Visible guidance, downloadable assets, token files, and release notes move together."],
  ["Cadence", "Review when identity assets, token semantics, or public-page patterns change."],
  ["Support", "Use Product Systems as the contact owner for public reference questions and change requests."],
] as const;

export const accessibilityRows = [
  ["Text pairs", "Review target", "Primary page text pairs target WCAG 2.2 AA."],
  ["Controls", "Review target", "Buttons and focus rings use contrast-safe Ink boundaries."],
  ["Proof signal", "Bounded use", "Proof Cyan appears with text or structure and never as the only cue."],
  ["Layout", "Review target", "Pages should be checked at desktop and 390 px mobile widths before promotion."],
] as const;

export const changelogItems = [
  "Updated public reference to the active Simple Slab identity system.",
  "Replaced retired mark assets with the three-slab geometry.",
  "Aligned public token files with Ink, Ivory, Nickel, Rule, Paper, Muted, Subtle, and Proof Cyan.",
  "Refocused examples around generated-screen review context from the 12B landing page.",
] as const;

export function getPage(slug: string): ReferencePage | undefined {
  return pages[slug as ReferenceSlug];
}
