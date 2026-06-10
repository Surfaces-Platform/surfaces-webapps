'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Navigation from '@surfaces/ui/components/Navigation';
import type { NavigationSurfaceId } from '@surfaces/ui/components/Navigation';
import { colors } from '@surfaces/ui/tokens/colors';
import { interfacectlDocsNavigationLinks } from '../../../_shared/interfacectl-doc-links.js';

export type SurfacesDevActiveTab = 'generation' | 'integration' | 'runtime' | 'guides';

export const surfacesDevNavSections = [
  { label: 'Generation', href: '/generation' },
  { label: 'Integration', href: '/integration' },
  { label: 'Runtime', href: '/runtime' },
  { label: 'Guides', href: '/guides' }
];

export const surfacesDevSectionTitleStyle = {
  fontFamily: 'var(--marketing-mono-section-title-family)',
  fontSize: 'var(--marketing-mono-section-title-size)',
  lineHeight: 'var(--marketing-mono-section-title-line-height)'
};

export const surfacesDevBodyStyle = {
  fontFamily: 'var(--marketing-mono-body-family)',
  fontSize: 'var(--marketing-mono-body-size)',
  lineHeight: 'var(--marketing-mono-body-line-height)'
};

export const surfacesDevMutedBodyStyle = {
  ...surfacesDevBodyStyle,
  color: colors.neutral[400]
};

export const surfacesDevCardStyle = {
  border: `1px solid ${colors.neutral[600]}`,
  backgroundColor: colors.neutral[800]
};

export const surfacesDevPreStyle = {
  margin: 0,
  maxWidth: '900px',
  border: `1px solid ${colors.neutral[600]}`,
  backgroundColor: colors.neutral[800],
  color: colors.neutral[200],
  fontSize: '11px',
  lineHeight: 1.6
};

// Preserve the existing PascalCase imports used across the docs app.
export const SurfacesDevSectionTitleStyle = surfacesDevSectionTitleStyle;
export const SurfacesDevBodyStyle = surfacesDevBodyStyle;
export const SurfacesDevMutedBodyStyle = surfacesDevMutedBodyStyle;
export const SurfacesDevCardStyle = surfacesDevCardStyle;
export const SurfacesDevPreStyle = surfacesDevPreStyle;

type SurfacesDevShellProps = {
  activeTab: SurfacesDevActiveTab;
  children: ReactNode;
};

export function SurfacesDevShell({
  activeTab,
  children
}: SurfacesDevShellProps) {
  const handleSurfaceChange = (surface: NavigationSurfaceId) => {
    console.log('Surface change:', surface);
  };

  return (
    <div
      className="min-h-screen w-full"
      data-surfaces-dev-context={activeTab}
      style={{
        backgroundColor: colors.neutral[900],
        fontFamily: 'JetBrains Mono, monospace',
        color: colors.neutral[0]
      }}
    >
      <Navigation
        currentSurface="surfaces-dev"
        sections={surfacesDevNavSections}
        utilities={interfacectlDocsNavigationLinks}
        theme="dark"
        currentContext={{ contentType: 'docs', subject: 'contracts' }}
        onSurfaceChange={handleSurfaceChange}
      />

      {children}
    </div>
  );
}

export function ContextLinkCard({
  href,
  label,
  eyebrow = 'Read next',
  description,
  external = false
}: {
  href: string;
  label: string;
  eyebrow?: string;
  description?: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className="block p-4 rounded-[4px]"
      style={{
        ...surfacesDevCardStyle,
        color: colors.neutral[200],
        textDecoration: 'none'
      }}
    >
      <span style={{ fontSize: '12px', color: colors.neutral[400], fontFamily: 'Inter, sans-serif' }}>{eyebrow}</span>
      <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 600 }}>{label}</div>
      {description ? (
        <p style={{ marginTop: '8px', marginBottom: 0, fontSize: '12px', lineHeight: 1.6, color: colors.neutral[400] }}>
          {description}
        </p>
      ) : null}
    </Link>
  );
}

export function NextContextLinks({
  left,
  right
}: {
  left: { href: string; label: string };
  right: { href: string; label: string };
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ContextLinkCard href={left.href} label={left.label} />
      <ContextLinkCard href={right.href} label={right.label} />
    </div>
  );
}
