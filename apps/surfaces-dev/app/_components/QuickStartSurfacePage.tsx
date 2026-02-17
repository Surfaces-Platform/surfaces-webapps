'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import Navigation from '@surfaces/ui/components/Navigation';
import { colors } from '@surfaces/ui/tokens/colors';
import { fadeVariants, staggerContainerFast } from '@surfaces/ui/utils/motion';

export type QuickStartStep = {
  title: string;
  detail: string;
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
  actions?: ReactNode;
};

const navSections = [
  { label: 'Generation', href: '/generation' },
  { label: 'Integration', href: '/integration' },
  { label: 'Runtime', href: '/runtime' }
];

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
        sections={navSections}
        utilities={[{ label: 'GitHub', href: '#github' }]}
        theme="dark"
        onSurfaceChange={handleSurfaceChange}
      />

      <div className="contract-container">
        <motion.section
          data-contract-section="landing.hero"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="pt-32 pb-20"
        >
          <motion.p
            variants={fadeVariants}
            style={{
              margin: 0,
              fontSize: '11px',
              letterSpacing: '0.02em',
              color: colors.signal.active,
              marginBottom: '14px',
              textTransform: 'uppercase'
            }}
          >
            {contextLabel}
          </motion.p>

          <motion.h1
            variants={fadeVariants}
            style={{
              fontSize: '22px',
              fontWeight: 600,
              lineHeight: 1.35,
              marginBottom: '16px'
            }}
          >
            {title}
          </motion.h1>

          <motion.p
            variants={fadeVariants}
            style={{
              fontSize: '14px',
              lineHeight: 1.7,
              maxWidth: '820px',
              marginBottom: '14px'
            }}
          >
            {summary}
          </motion.p>

          <motion.p
            variants={fadeVariants}
            style={{
              margin: 0,
              fontSize: '12px',
              color: colors.neutral[400],
              fontFamily: 'Inter, sans-serif'
            }}
          >
            Canonical policy source: <code>contracts/surfaces.web.contract.json</code>
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
            Quick Start
          </motion.h2>

          <motion.ol variants={fadeVariants} style={{ margin: 0, paddingLeft: '20px', maxWidth: '860px' }}>
            {steps.map((step) => (
              <li
                key={step.title}
                style={{
                  marginBottom: '12px',
                  fontSize: '12px',
                  color: colors.neutral[400],
                  fontFamily: 'Inter, sans-serif',
                  lineHeight: 1.65
                }}
              >
                <strong style={{ color: colors.neutral[200], fontWeight: 600 }}>{step.title}</strong>
                {' '}
                {step.detail}
              </li>
            ))}
          </motion.ol>
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
            {snippetTitle}
          </motion.h2>

          <motion.pre
            variants={fadeVariants}
            className="p-4 rounded-[4px] overflow-x-auto"
            style={{
              margin: 0,
              maxWidth: '900px',
              border: `1px solid ${colors.neutral[600]}`,
              backgroundColor: colors.neutral[800],
              color: colors.neutral[200],
              fontSize: '11px',
              lineHeight: 1.6
            }}
          >
            {snippet}
          </motion.pre>

          {notes.length > 0 ? (
            <motion.ul variants={fadeVariants} style={{ marginTop: '14px', marginBottom: 0, paddingLeft: '18px', maxWidth: '860px' }}>
              {notes.map((note) => (
                <li
                  key={note}
                  style={{
                    fontSize: '12px',
                    color: colors.neutral[400],
                    fontFamily: 'Inter, sans-serif',
                    lineHeight: 1.6,
                    marginBottom: '6px'
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
            Status Rules
          </motion.h2>

          <motion.div variants={fadeVariants} className="space-y-3" style={{ maxWidth: '860px' }}>
            {statusRules.map((rule) => (
              <div
                key={rule.status}
                className="p-4 rounded-[4px]"
                style={{
                  border: `1px solid ${colors.neutral[600]}`,
                  backgroundColor: colors.neutral[800]
                }}
              >
                <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, fontFamily: 'Inter, sans-serif', color: colors.neutral[400] }}>
                  <strong style={{ color: colors.neutral[200], fontWeight: 600 }}><code>{rule.status}</code></strong>
                  {' '}
                  {rule.meaning}
                </p>
              </div>
            ))}
          </motion.div>
        </motion.section>

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
            Next Context
          </motion.h2>

          <motion.div variants={fadeVariants} style={{ maxWidth: '860px' }}>
            {actions ?? (
              <p style={{ margin: 0, fontSize: '12px', color: colors.neutral[400], fontFamily: 'Inter, sans-serif' }}>
                Use the top navigation to switch contexts.
              </p>
            )}
          </motion.div>

          <motion.p variants={fadeVariants} style={{ marginTop: '18px', marginBottom: 0, fontSize: '12px', color: colors.neutral[600], fontFamily: 'Inter, sans-serif' }}>
            surfaces.dev quick start • {activeTab}
          </motion.p>
        </motion.section>
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
      <Link
        href={left.href}
        className="p-4 rounded-[4px]"
        style={{ border: `1px solid ${colors.neutral[600]}`, backgroundColor: colors.neutral[800], color: colors.neutral[200], textDecoration: 'none' }}
      >
        <span style={{ fontSize: '12px', color: colors.neutral[400], fontFamily: 'Inter, sans-serif' }}>Read next</span>
        <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 600 }}>{left.label}</div>
      </Link>

      <Link
        href={right.href}
        className="p-4 rounded-[4px]"
        style={{ border: `1px solid ${colors.neutral[600]}`, backgroundColor: colors.neutral[800], color: colors.neutral[200], textDecoration: 'none' }}
      >
        <span style={{ fontSize: '12px', color: colors.neutral[400], fontFamily: 'Inter, sans-serif' }}>Read next</span>
        <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 600 }}>{right.label}</div>
      </Link>
    </div>
  );
}
