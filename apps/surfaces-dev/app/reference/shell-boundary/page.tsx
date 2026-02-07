'use client';

import { motion } from 'motion/react';
import Navigation from '@surfaces/ui/components/Navigation';
import { colors } from '@surfaces/ui/tokens/colors';
import { fadeVariants, staggerContainerFast } from '@surfaces/ui/utils/motion';

const sections = [
  { label: 'Get started', href: '/get-started' },
  { label: 'Contracts', href: '/contracts' },
  { label: 'interfacectl', href: '/interfacectl' },
  { label: 'Guides', href: '/guides' },
  { label: 'Reference', href: '/reference/validation-boundaries' },
  { label: 'Shell boundary', href: '/reference/shell-boundary' }
];

const bullets = [
  {
    title: 'Contract fields',
    items: [
      '`shell.owns`: shell-owned primitives (nav, header, sidebar, authWrapper, appChrome); surfaces must not emit these.',
      '`shell.contentSlot`: the shell’s content mount point (frame name or DOM id).',
      '`surface.mustNotEmit`: optional per-surface ban list; default to `shell.owns` when missing.'
    ]
  },
  {
    title: 'Defaults & compatibility',
    items: [
      'If `mustNotEmit` is absent, generators substitute `shell.owns` when `shell` exists.',
      '`shell` is optional; legacy contracts stay valid.'
    ]
  },
  {
    title: 'Generator enforcement patterns',
    items: [
      'Figma Make: lock frames/components matching `shell.owns`; expose only the `contentSlot` frame; preflight blocks banned names/roles.',
      'Lovable / LLM builders: include `mustNotEmit` in system prompt + scaffold; post-gen structural lint rejects banned primitives before returning.',
      'Agentic coder / template engines: read `shell` + `mustNotEmit`; block imports/components matching the ban list; snapshot test surfaces inside a mocked shell to ensure a single nav/header/auth wrapper.'
    ]
  },
  {
    title: 'Why it matters',
    items: [
      'Prevents double-navigation and similar layout duplication by making the shell boundary explicit at generation time without bloating contracts.'
    ]
  }
];

export default function ShellBoundary() {
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
        sections={sections}
        utilities={[{ label: 'GitHub', href: '#github' }]}
        theme="dark"
        onSurfaceChange={handleSurfaceChange}
      />

      <div className="contract-container">
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="pt-32 pb-20"
        >
          <motion.h1
            variants={fadeVariants}
            style={{
              fontSize: '20px',
              fontWeight: 600,
              lineHeight: 1.4,
              marginBottom: '24px'
            }}
          >
            Shell Ownership Boundary
          </motion.h1>

          <motion.p
            variants={fadeVariants}
            style={{
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: 1.6,
              maxWidth: '720px',
              marginBottom: '28px'
            }}
          >
            Define what the shell owns and what a surface must never generate, so generators can enforce the boundary and avoid double navigation or duplicate chrome.
          </motion.p>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="pb-24 space-y-10"
          style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
        >
          {bullets.map((bucket, idx) => (
            <motion.div key={bucket.title} variants={fadeVariants} className="space-y-3" style={{ paddingTop: idx === 0 ? 0 : '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600 }}>{bucket.title}</h2>
              <ul className="space-y-2" style={{ listStyle: 'disc', paddingLeft: '18px' }}>
                {bucket.items.map((item) => (
                  <li key={item} style={{ fontSize: '12px', lineHeight: 1.6, color: colors.neutral[400], fontFamily: 'Inter, sans-serif' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.section>
      </div>
    </div>
  );
}
