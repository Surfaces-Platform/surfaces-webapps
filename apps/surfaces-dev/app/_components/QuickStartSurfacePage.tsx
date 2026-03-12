'use client';

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import Navigation from '@surfaces/ui/components/Navigation';
import { colors } from '@surfaces/ui/tokens/colors';
import { fadeVariants, staggerContainerFast } from '@surfaces/ui/utils/motion';
import { interfacectlDocsNavigationLinks } from '../../../_shared/interfacectl-doc-links.js';
import {
  ContextLinkCard,
  surfacesDevBodyStyle,
  surfacesDevCardStyle,
  surfacesDevMutedBodyStyle,
  surfacesDevNavSections,
  surfacesDevPreStyle,
  surfacesDevSectionTitleStyle
} from './DocsSurfaceShell';

export type QuickStartStep = {
  title: string;
  detail: string;
};

export type QuickStartDetailItem = {
  label?: string;
  text: string;
};

export type QuickStartDetailSection = {
  title: string;
  intro?: string;
  items?: QuickStartDetailItem[];
  ordered?: boolean;
};

export type QuickStartReferenceCard = {
  href: string;
  label: string;
  description?: string;
  eyebrow?: string;
  external?: boolean;
};

export type QuickStartSurfacePageProps = {
  activeTab: 'generation' | 'integration' | 'runtime';
  title: string;
  summary: string;
  contextLabel: string;
  steps: QuickStartStep[];
  snippetTitle: string;
  snippet: string;
  notes?: string[];
  detailSections?: QuickStartDetailSection[];
  referenceCards?: QuickStartReferenceCard[];
  actions?: ReactNode;
};

const statusRules = [
  { status: 'pass', meaning: 'No findings. Continue.' },
  { status: 'warn', meaning: 'Warnings only. Continue with visibility.' },
  { status: 'block', meaning: 'Strict/error finding present. Stop and fix.' }
];

export default function QuickStartSurfacePage({
  activeTab,
  title,
  summary,
  contextLabel,
  steps,
  snippetTitle,
  snippet,
  notes = [],
  detailSections = [],
  referenceCards = [],
  actions
}: QuickStartSurfacePageProps) {
  const handleSurfaceChange = (surface: 'surfaces' | 'surfaceops' | 'interfacectl' | 'surfaces-dev') => {
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
        currentSurface="surfaces-dev"
        sections={surfacesDevNavSections}
        utilities={interfacectlDocsNavigationLinks}
        theme="dark"
        currentContext={{ contentType: 'docs', subject: 'contracts' }}
        onSurfaceChange={handleSurfaceChange}
      />

      <div
        className="contract-container"
        data-contract="page-container"
        data-contract-typography-profile="marketing-mono"
      >
        <motion.section
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
          className="pt-32 pb-20"
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
              fontFamily: 'var(--marketing-mono-hero-eyebrow-family)',
              fontSize: 'var(--marketing-mono-hero-eyebrow-size)',
              lineHeight: 'var(--marketing-mono-hero-eyebrow-line-height)',
              letterSpacing: 'var(--marketing-mono-hero-eyebrow-letter-spacing)',
              color: colors.signal.active,
              marginBottom: '14px',
              textTransform: 'uppercase'
            }}
          >
            {contextLabel}
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
            {title}
          </motion.h1>

          <motion.p
            variants={fadeVariants}
            data-contract-copy-role="heroBody"
            style={{
              fontFamily: 'var(--marketing-mono-hero-body-family)',
              fontSize: 'var(--marketing-mono-hero-body-size)',
              lineHeight: 'var(--marketing-mono-hero-body-line-height)',
              maxWidth: 'var(--marketing-layout-body-max-width)',
              marginBottom: '14px'
            }}
          >
            {summary}
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
            Canonical contract source: <code>contracts/surfaces.web.contract.json</code>
          </motion.p>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="py-16"
          style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
        >
          <motion.h2 variants={fadeVariants} style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            <span
              data-contract-copy-role="sectionTitle"
              style={{
                fontFamily: 'var(--marketing-mono-section-title-family)',
                fontSize: 'var(--marketing-mono-section-title-size)',
                lineHeight: 'var(--marketing-mono-section-title-line-height)'
              }}
            >
              Quick Start
            </span>
          </motion.h2>

          <motion.ol variants={fadeVariants} style={{ margin: 0, paddingLeft: '20px', maxWidth: '860px' }}>
            {steps.map((step) => (
              <li
                key={step.title}
                data-contract-copy-role="body"
              style={{
                marginBottom: '12px',
                fontFamily: 'var(--marketing-mono-body-family)',
                fontSize: 'var(--marketing-mono-body-size)',
                lineHeight: 'var(--marketing-mono-body-line-height)',
                color: colors.neutral[400]
              }}
            >
                <strong style={{ color: colors.neutral[200], fontWeight: 600 }}>{step.title}</strong>
                {' '}
                {step.detail}
              </li>
            ))}
          </motion.ol>
        </motion.section>

        {referenceCards.length > 0 ? (
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainerFast}
            className="py-16"
            style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
          >
            <motion.h2 variants={fadeVariants} style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>
              <span
                data-contract-copy-role="sectionTitle"
                style={surfacesDevSectionTitleStyle}
              >
                Canonical interfacectl docs
              </span>
            </motion.h2>

            <motion.p
              variants={fadeVariants}
              data-contract-copy-role="body"
              style={{
                marginTop: 0,
                marginBottom: '14px',
                maxWidth: '860px',
                ...surfacesDevMutedBodyStyle
              }}
            >
              This page is a repo-local quick start. Canonical generator, validation, and runtime semantics live in the
              {' '}
              <code>interfacectl</code>
              {' '}
              docs.
            </motion.p>

            <motion.div variants={fadeVariants} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {referenceCards.map((card) => (
                <ContextLinkCard
                  key={`${card.label}-${card.href}`}
                  href={card.href}
                  label={card.label}
                  description={card.description}
                  eyebrow={card.eyebrow ?? 'Canonical doc'}
                  external={card.external}
                />
              ))}
            </motion.div>
          </motion.section>
        ) : null}

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="py-16"
          style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
        >
          <motion.h2 variants={fadeVariants} style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>
            <span
              data-contract-copy-role="sectionTitle"
              style={{
                fontFamily: 'var(--marketing-mono-section-title-family)',
                fontSize: 'var(--marketing-mono-section-title-size)',
                lineHeight: 'var(--marketing-mono-section-title-line-height)'
              }}
            >
              {snippetTitle}
            </span>
          </motion.h2>

          <motion.pre variants={fadeVariants} className="p-4 rounded-[4px] overflow-x-auto" style={surfacesDevPreStyle}>
            {snippet}
          </motion.pre>

          {notes.length > 0 ? (
            <motion.ul variants={fadeVariants} style={{ marginTop: '14px', marginBottom: 0, paddingLeft: '18px', maxWidth: '860px' }}>
              {notes.map((note) => (
                <li
                  key={note}
                  data-contract-copy-role="body"
                  style={{
                    marginBottom: '6px',
                    fontFamily: 'var(--marketing-mono-body-family)',
                    fontSize: 'var(--marketing-mono-body-size)',
                    lineHeight: 'var(--marketing-mono-body-line-height)',
                    color: colors.neutral[400]
                  }}
                >
                  {note}
                </li>
              ))}
            </motion.ul>
          ) : null}
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="py-16"
          style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
        >
          <motion.h2 variants={fadeVariants} style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>
            <span
              data-contract-copy-role="sectionTitle"
              style={{
                fontFamily: 'var(--marketing-mono-section-title-family)',
                fontSize: 'var(--marketing-mono-section-title-size)',
                lineHeight: 'var(--marketing-mono-section-title-line-height)'
              }}
            >
              Status Rules
            </span>
          </motion.h2>

          <motion.div variants={fadeVariants} className="space-y-3" style={{ maxWidth: '860px' }}>
            {statusRules.map((rule) => (
              <div
                key={rule.status}
                className="p-4 rounded-[4px]"
                style={surfacesDevCardStyle}
              >
                <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, fontFamily: 'Inter, sans-serif', color: colors.neutral[400] }}>
                  <span
                    data-contract-copy-role="body"
                    style={{
                      fontFamily: 'var(--marketing-mono-body-family)',
                      fontSize: 'var(--marketing-mono-body-size)',
                      lineHeight: 'var(--marketing-mono-body-line-height)'
                    }}
                  >
                    <strong style={{ color: colors.neutral[200], fontWeight: 600 }}><code>{rule.status}</code></strong>
                    {' '}
                    {rule.meaning}
                  </span>
                </p>
              </div>
            ))}
          </motion.div>
        </motion.section>

        {detailSections.map((section) => {
          const ListTag = section.ordered ? 'ol' : 'ul';

          return (
            <motion.section
              key={section.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainerFast}
              className="py-16"
              style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
            >
              <motion.h2 variants={fadeVariants} style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>
                <span
                  data-contract-copy-role="sectionTitle"
                  style={surfacesDevSectionTitleStyle}
                >
                  {section.title}
                </span>
              </motion.h2>

              {section.intro ? (
                <motion.p
                  variants={fadeVariants}
                  data-contract-copy-role="body"
                  style={{
                    marginTop: 0,
                    marginBottom: section.items?.length ? '14px' : 0,
                    maxWidth: '860px',
                    ...surfacesDevMutedBodyStyle
                  }}
                >
                  {section.intro}
                </motion.p>
              ) : null}

              {section.items?.length ? (
                <motion.div variants={fadeVariants}>
                  <ListTag
                    style={{
                      margin: 0,
                      paddingLeft: section.ordered ? '20px' : '18px',
                      maxWidth: '860px'
                    }}
                  >
                    {section.items.map((item, index) => (
                      <li
                        key={`${section.title}-${item.label ?? index}`}
                        data-contract-copy-role="body"
                        style={{
                          marginBottom: '10px',
                          ...surfacesDevMutedBodyStyle
                        }}
                      >
                        {item.label ? (
                          <>
                            <strong style={{ color: colors.neutral[200], fontWeight: 600 }}>{item.label}</strong>
                            {' '}
                          </>
                        ) : null}
                        {item.text}
                      </li>
                    ))}
                  </ListTag>
                </motion.div>
              ) : null}
            </motion.section>
          );
        })}

        <motion.section
          data-contract-section="landing.actions"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="py-16 pb-24"
          style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
        >
          <motion.h2 variants={fadeVariants} style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>
            <span
              data-contract-copy-role="sectionTitle"
              style={{
                fontFamily: 'var(--marketing-mono-section-title-family)',
                fontSize: 'var(--marketing-mono-section-title-size)',
                lineHeight: 'var(--marketing-mono-section-title-line-height)'
              }}
            >
              Next Context
            </span>
          </motion.h2>

          <motion.div variants={fadeVariants} style={{ maxWidth: '860px' }}>
            {actions ?? (
              <p style={{ margin: 0, fontSize: '12px', color: colors.neutral[400], fontFamily: 'Inter, sans-serif' }}>
                <span
                  data-contract-copy-role="body"
                  style={{
                    fontFamily: 'var(--marketing-mono-body-family)',
                    fontSize: 'var(--marketing-mono-body-size)',
                    lineHeight: 'var(--marketing-mono-body-line-height)'
                  }}
                >
                  Use the top navigation to switch contexts.
                </span>
              </p>
            )}
          </motion.div>
        </motion.section>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeVariants}
          style={{
            marginTop: '18px',
            marginBottom: 0,
            fontSize: '12px',
            color: colors.neutral[600],
            fontFamily: 'Inter, sans-serif'
          }}
        >
          surfaces.dev docs • {activeTab}
        </motion.p>
      </div>
    </div>
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
