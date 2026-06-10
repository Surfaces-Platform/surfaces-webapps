'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import Navigation from '@surfaces/ui/components/Navigation';
import type { NavigationSurfaceId } from '@surfaces/ui/components/Navigation';
import { colors } from '@surfaces/ui/tokens/colors';
import { fadeVariants, staggerContainerFast } from '@surfaces/ui/utils/motion';
import {
  interfacectlDiscoveryCards,
  interfacectlDocsNavigationLinks,
  interfacectlDocLinks
} from '../../_shared/interfacectl-doc-links.js';

const quickStartSteps = [
  {
    label: 'Install locally',
    detail: 'pnpm add -D @surfaces/interfacectl-cli'
  },
  {
    label: 'Start onboarding',
    detail: 'interfacectl'
  },
  {
    label: 'Run the canonical gate',
    detail: 'interfacectl validate --contract <path>'
  }
];

export default function Home() {
  const handleSurfaceChange = (surface: NavigationSurfaceId) => {
    console.log('Surface change:', surface);
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: colors.neutral[900],
        fontFamily: 'JetBrains Mono, monospace',
        color: colors.neutral[0]
      }}
    >
      <Navigation
        currentSurface="interfacectl"
        currentContext={{
          contentType: 'docs',
          subject: 'validation'
        }}
        sections={[
          { label: 'Start', href: '#start' },
          { label: 'Docs', href: '#docs' }
        ]}
        utilities={interfacectlDocsNavigationLinks}
        theme="dark"
        onSurfaceChange={handleSurfaceChange}
      />

      <div
        className="contract-container max-w-[1040px]"
        data-contract="page-container"
        data-contract-typography-profile="marketing-mono"
      >
        <motion.section
          id="start"
          data-contract-section="landing.hero"
          data-contract-marketing-layout-profile="marketing-open-flow-text-compact"
          data-contract-hero-container-mode="open-flow"
          data-contract-hero-visual-placement="none"
          data-contract-section-divider-mode="border-top"
          data-contract-section-spacing-profile="compact"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="pt-32 pb-24"
          style={{
            paddingTop: 'var(--marketing-layout-hero-padding-top-compact)',
            paddingBottom: 'var(--marketing-layout-hero-padding-bottom-compact)'
          }}
        >
          <motion.p
            variants={fadeVariants}
            data-contract-copy-role="heroEyebrow"
            style={{
              margin: 0,
              marginBottom: '14px',
              fontFamily: 'var(--marketing-mono-hero-eyebrow-family)',
              fontSize: 'var(--marketing-mono-hero-eyebrow-size)',
              lineHeight: 'var(--marketing-mono-hero-eyebrow-line-height)',
              letterSpacing: 'var(--marketing-mono-hero-eyebrow-letter-spacing)',
              color: colors.signal.active,
              textTransform: 'uppercase'
            }}
          >
            Discovery Surface
          </motion.p>

          <motion.h1
            variants={fadeVariants}
            data-contract-copy-role="heroTitle"
            style={{
              fontFamily: 'var(--marketing-mono-hero-title-family)',
              fontSize: 'var(--marketing-mono-hero-title-size)',
              fontWeight: 600,
              lineHeight: 'var(--marketing-mono-hero-title-line-height)',
              marginBottom: '16px'
            }}
          >
            interfacectl
          </motion.h1>

          <motion.p
            variants={fadeVariants}
            data-contract-copy-role="heroBody"
            style={{
              fontFamily: 'var(--marketing-mono-hero-body-family)',
              fontSize: 'var(--marketing-mono-hero-body-size)',
              lineHeight: 'var(--marketing-mono-hero-body-line-height)',
              maxWidth: 'var(--marketing-layout-copy-max-width-wide)',
              marginBottom: '14px'
            }}
          >
            interfacectl-web is a discovery surface. Canonical CLI, validation, runtime, and generator semantics live in the
            {' '}
            <code>interfacectl</code>
            {' '}
            repo docs.
          </motion.p>

          <motion.p
            variants={fadeVariants}
            data-contract-copy-role="body"
            style={{
              margin: 0,
              fontFamily: 'var(--marketing-mono-body-family)',
              fontSize: 'var(--marketing-mono-body-size)',
              lineHeight: 'var(--marketing-mono-body-line-height)',
              color: colors.neutral[400]
            }}
          >
            Use this page to start quickly, then jump to the canonical docs for specifics.
          </motion.p>
        </motion.section>

        <motion.section
          data-contract-section="landing.guidance"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="py-24"
          style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
        >
          <motion.h2
            variants={fadeVariants}
            data-contract-copy-role="sectionTitle"
            style={{
              fontFamily: 'var(--marketing-mono-section-title-family)',
              fontSize: 'var(--marketing-mono-section-title-size)',
              fontWeight: 600,
              lineHeight: 'var(--marketing-mono-section-title-line-height)',
              marginBottom: '18px'
            }}
          >
            Start Here
          </motion.h2>

          <motion.pre
            variants={fadeVariants}
            className="rounded-[4px] p-5 overflow-x-auto"
            style={{
              margin: 0,
              border: `1px solid ${colors.neutral[600]}`,
              backgroundColor: colors.neutral[800],
              color: colors.neutral[200],
              fontSize: '12px',
              lineHeight: 1.6
            }}
          >
{`pnpm add -D @surfaces/interfacectl-cli
interfacectl
interfacectl validate --contract <path>`}
          </motion.pre>

          <motion.div variants={fadeVariants} className="grid gap-4 md:grid-cols-3" style={{ marginTop: '18px' }}>
            {quickStartSteps.map((step) => (
              <div
                key={step.label}
                className="rounded-[4px] p-4"
                style={{
                  border: `1px solid ${colors.neutral[600]}`,
                  backgroundColor: colors.neutral[800]
                }}
              >
                <div style={{ fontSize: '12px', color: colors.neutral[400], marginBottom: '8px' }}>{step.label}</div>
                <div style={{ fontSize: '13px', lineHeight: 1.7 }}>{step.detail}</div>
              </div>
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          id="docs"
          data-contract-section="landing.actions"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="py-24"
          style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
        >
          <motion.h2
            variants={fadeVariants}
            data-contract-copy-role="sectionTitle"
            style={{
              fontFamily: 'var(--marketing-mono-section-title-family)',
              fontSize: 'var(--marketing-mono-section-title-size)',
              fontWeight: 600,
              lineHeight: 'var(--marketing-mono-section-title-line-height)',
              marginBottom: '18px'
            }}
          >
            Canonical Docs
          </motion.h2>

          <motion.p
            variants={fadeVariants}
            data-contract-copy-role="body"
            style={{
              maxWidth: '820px',
              marginTop: 0,
              marginBottom: '18px',
              fontFamily: 'var(--marketing-mono-body-family)',
              fontSize: 'var(--marketing-mono-body-size)',
              lineHeight: 'var(--marketing-mono-body-line-height)',
              color: colors.neutral[400]
            }}
          >
            Use the canonical docs for exact command behavior, exit codes, contract validation semantics, runtime guidance, and generator integration.
          </motion.p>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {interfacectlDiscoveryCards.map((card) => (
              <motion.div key={card.href} variants={fadeVariants}>
                <Link
                  href={card.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-[4px] p-4"
                  style={{
                    backgroundColor: colors.neutral[800],
                    border: `1px solid ${colors.neutral[600]}`,
                    color: colors.neutral[0],
                    textDecoration: 'none'
                  }}
                >
                  <div style={{ fontSize: '12px', color: colors.neutral[400], marginBottom: '6px' }}>Canonical doc</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{card.label}</div>
                  <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, color: colors.neutral[400] }}>
                    {card.description}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeVariants} style={{ marginTop: '18px' }}>
            <Link
              href={interfacectlDocLinks.repo.href}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: colors.neutral[400],
                textDecoration: 'none',
                fontSize: '12px'
              }}
            >
              Open the repo →
            </Link>
          </motion.div>
        </motion.section>
      </div>
    </div>
  );
}
