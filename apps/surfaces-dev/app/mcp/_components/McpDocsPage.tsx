'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { colors } from '@surfaces/ui/tokens/colors';
import {
  ContextLinkCard,
  surfacesDevBodyStyle,
  surfacesDevCardStyle,
  surfacesDevMutedBodyStyle,
  surfacesDevPreStyle,
  surfacesDevSectionTitleStyle,
  SurfacesDevShell
} from '../../_components/DocsSurfaceShell';
import type { JudgmentKitLifecycleRow } from '../judgmentkit/content';

type McpDocsSection = {
  title: string;
  body?: string;
  children?: ReactNode;
};

type McpDocsPageProps = {
  eyebrow: string;
  title: string;
  summary: string;
  sections: McpDocsSection[];
};

export function McpDocsPage({
  eyebrow,
  title,
  summary,
  sections
}: McpDocsPageProps) {
  return (
    <SurfacesDevShell activeTab="mcp">
      <main
        className="contract-container"
        data-contract="page-container"
        data-contract-typography-profile="marketing-mono"
      >
        <section
          data-contract-section="landing.hero"
          data-contract-marketing-layout-profile="marketing-open-flow-text-compact"
          data-contract-hero-container-mode="open-flow"
          data-contract-hero-visual-placement="none"
          data-contract-section-divider-mode="border-top"
          data-contract-section-spacing-profile="compact"
          className="pt-32 pb-20"
          style={{
            paddingTop: 'var(--marketing-layout-hero-padding-top-compact)',
            paddingBottom: 'var(--marketing-layout-hero-padding-bottom-compact)'
          }}
        >
          <p
            data-contract-copy-role="heroEyebrow"
            style={{
              margin: 0,
              fontFamily: 'var(--marketing-mono-hero-eyebrow-family)',
              fontSize: 'var(--marketing-mono-hero-eyebrow-size)',
              lineHeight: 'var(--marketing-mono-hero-eyebrow-line-height)',
              letterSpacing: 'var(--marketing-mono-hero-eyebrow-letter-spacing)',
              color: colors.signal.active,
              marginBottom: '14px',
              textTransform: 'uppercase'
            }}
          >
            {eyebrow}
          </p>

          <h1
            data-contract-copy-role="heroTitle"
            style={{
              fontFamily: 'var(--marketing-mono-hero-title-family)',
              fontSize: 'var(--marketing-mono-hero-title-size)',
              fontWeight: 600,
              lineHeight: 'var(--marketing-mono-hero-title-line-height)',
              marginBottom: '16px'
            }}
          >
            {title}
          </h1>

          <p
            data-contract-copy-role="heroBody"
            style={{
              fontFamily: 'var(--marketing-mono-hero-body-family)',
              fontSize: 'var(--marketing-mono-hero-body-size)',
              lineHeight: 'var(--marketing-mono-hero-body-line-height)',
              maxWidth: 'var(--marketing-layout-body-max-width)',
              marginBottom: 0
            }}
          >
            {summary}
          </p>
        </section>

        {sections.map((section) => (
          <section
            key={section.title}
            className="py-16"
            style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>
              <span data-contract-copy-role="sectionTitle" style={surfacesDevSectionTitleStyle}>
                {section.title}
              </span>
            </h2>

            {section.body ? (
              <p
                data-contract-copy-role="body"
                style={{
                  marginTop: 0,
                  marginBottom: section.children ? '16px' : 0,
                  maxWidth: '900px',
                  ...surfacesDevMutedBodyStyle
                }}
              >
                {section.body}
              </p>
            ) : null}

            {section.children}
          </section>
        ))}

        <p
          style={{
            marginTop: '18px',
            marginBottom: 0,
            paddingBottom: '56px',
            fontSize: '12px',
            color: colors.neutral[600],
            fontFamily: 'Inter, sans-serif'
          }}
        >
          surfaces.dev docs - mcp
        </p>
      </main>
    </SurfacesDevShell>
  );
}

export function LifecycleMatrix({ rows }: { rows: JudgmentKitLifecycleRow[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {rows.map((row) => (
        <article key={row.context} className="p-4 rounded-[4px]" style={surfacesDevCardStyle}>
          <p
            style={{
              marginTop: 0,
              marginBottom: '8px',
              color: colors.neutral[200],
              fontWeight: 600,
              ...surfacesDevBodyStyle
            }}
          >
            {row.context}
          </p>
          <p style={{ marginTop: 0, marginBottom: '10px', ...surfacesDevMutedBodyStyle }}>
            {row.purpose}
          </p>
          <p style={{ marginTop: 0, marginBottom: '6px', ...surfacesDevMutedBodyStyle }}>
            <strong style={{ color: colors.neutral[200], fontWeight: 600 }}>Artifact:</strong>
            {' '}
            {row.artifact}
          </p>
          <p style={{ margin: 0, ...surfacesDevMutedBodyStyle }}>
            <strong style={{ color: colors.neutral[200], fontWeight: 600 }}>Violation:</strong>
            {' '}
            {row.violation}
          </p>
        </article>
      ))}
    </div>
  );
}

export function LinkGrid({
  links
}: {
  links: Array<{
    href: string;
    label: string;
    description: string;
    eyebrow?: string;
    external?: boolean;
  }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {links.map((link) => (
        <ContextLinkCard
          key={link.href}
          href={link.href}
          label={link.label}
          description={link.description}
          eyebrow={link.eyebrow}
          external={link.external}
        />
      ))}
    </div>
  );
}

export function SequenceList({
  items
}: {
  items: Array<{
    label: string;
    text: string;
  }>;
}) {
  return (
    <ol style={{ margin: 0, paddingLeft: '20px', maxWidth: '900px' }}>
      {items.map((item) => (
        <li key={item.label} data-contract-copy-role="body" style={{ marginBottom: '10px', ...surfacesDevMutedBodyStyle }}>
          <strong style={{ color: colors.neutral[200], fontWeight: 600 }}>{item.label}</strong>
          {' '}
          {item.text}
        </li>
      ))}
    </ol>
  );
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="p-4 rounded-[4px]" style={surfacesDevCardStyle}>
      <p style={{ margin: 0, ...surfacesDevMutedBodyStyle }}>{children}</p>
    </div>
  );
}

export function CodeBlock({ value }: { value: string }) {
  return (
    <pre className="p-4 rounded-[4px] overflow-x-auto" style={surfacesDevPreStyle}>
      {value}
    </pre>
  );
}

export function InlineDocsLink({
  href,
  children,
  external = false
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      style={{ color: colors.signal.active, textDecoration: 'none' }}
    >
      {children}
    </Link>
  );
}
