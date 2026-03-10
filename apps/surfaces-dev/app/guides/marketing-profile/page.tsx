'use client';

import { motion } from 'motion/react';
import { colors } from '@surfaces/ui/tokens/colors';
import { fadeVariants, staggerContainerFast } from '@surfaces/ui/utils/motion';
import { NextContextLinks } from '../../_components/QuickStartSurfacePage';
import {
  SurfacesDevShell,
  surfacesDevCardStyle,
  surfacesDevPreStyle
} from '../../_components/DocsSurfaceShell';

const contractShapeSnippet = `{
  "marketingProfiles": {
    "layout": [
      { "id": "marketing-open-flow-text-compact" }
    ],
    "typography": [
      { "id": "marketing-mono" }
    ]
  },
  "surfaces": [
    {
      "id": "example-web",
      "layout": {
        "landingPattern": {
          "marketingLayoutProfile": "marketing-open-flow-text-compact",
          "marketingLayoutPolicy": "warn"
        }
      },
      "marketingTypographyProfile": "marketing-mono",
      "marketingTypographyPolicy": "warn"
    }
  ]
}`;

const firstTimeSteps = [
  'You start from a landing or marketing surface instead of a blank contract.',
  'The platform recognizes a common surface family and seeds a matching layout profile and typography profile.',
  'Your first contract gets a usable shape immediately, so you are not inventing hero rhythm, section spacing, and copy-role structure from scratch.',
  'Validation stays warn-first at the profile layer, which means the first run teaches you what the platform sees without blocking progress.',
  'If the seeded profile is close but not right, you can switch profiles or remove the profile rather than fighting hidden rules.'
];

const ongoingExpectations = [
  'Validation compares your live implementation against the chosen profile and flags drift in hero/container behavior, section spacing rhythm, and typography-role usage.',
  'Warnings should help you decide whether to fix the page or change the declared profile. The goal is faster decisions, not more ceremony.',
  'Bounded variation is expected. The profile should keep the surface family recognizable without freezing the implementation into a template.',
  'When a surface evolves out of the marketing family, the right move is to change the profile, not silently accumulate one-off exceptions.'
];

const boundaries = [
  'Use a marketing profile for landing and marketing surfaces, not for app shells, workspaces, or operational tools.',
  'A profile describes a reusable surface family. Severity still lives in separate warn/strict settings.',
  'If the platform needs a new kind of reusable surface behavior, add a new profile family instead of stretching marketing until it means everything.'
];

export default function MarketingProfileGuidePage() {
  return (
    <SurfacesDevShell activeTab="guides">
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
            Guide • Marketing Profile
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
            Use Marketing Profiles As A Safe Starting Shape For Landing Surfaces
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
            Marketing profiles help first-time users generate a contract from a landing surface without starting from a blank schema, and help continuing users keep that surface coherent as it evolves.
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
            Canonical contract source: <code>contracts/surfaces.web.contract.json</code> • This guide explains the user experience first and shows the current field names only where needed.
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
          <motion.h2 variants={fadeVariants} style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>
            <span
              data-contract-copy-role="sectionTitle"
              style={{
                fontFamily: 'var(--marketing-mono-section-title-family)',
                fontSize: 'var(--marketing-mono-section-title-size)',
                lineHeight: 'var(--marketing-mono-section-title-line-height)'
              }}
            >
              What A Marketing Profile Is
            </span>
          </motion.h2>

          <motion.div variants={fadeVariants} className="space-y-4" style={{ maxWidth: '860px' }}>
            <p
              data-contract-copy-role="body"
              style={{
                margin: 0,
                fontFamily: 'var(--marketing-mono-body-family)',
                fontSize: 'var(--marketing-mono-body-size)',
                lineHeight: 'var(--marketing-mono-body-line-height)',
                color: colors.neutral[400]
              }}
            >
              A marketing profile is a reusable starter pattern for landing surfaces. It gives the platform a known surface family to seed and validate against, so the first contract is more concrete than a blank JSON file.
            </p>
            <p
              data-contract-copy-role="body"
              style={{
                margin: 0,
                fontFamily: 'var(--marketing-mono-body-family)',
                fontSize: 'var(--marketing-mono-body-size)',
                lineHeight: 'var(--marketing-mono-body-line-height)',
                color: colors.neutral[400]
              }}
            >
              It is optional, it starts warn-first, and it is meant to reduce ambiguity and drift. It is not a brand template, not a design-system replacement, and not a punitive style rule.
            </p>
            <p
              data-contract-copy-role="body"
              style={{
                margin: 0,
                fontFamily: 'var(--marketing-mono-body-family)',
                fontSize: 'var(--marketing-mono-body-size)',
                lineHeight: 'var(--marketing-mono-body-line-height)',
                color: colors.neutral[400]
              }}
            >
              Product-wise, the profile exists to give users a familiar starting shape and a shared review language. Platform-wise, it gives the contract a reusable surface pattern the validator can understand.
            </p>
          </motion.div>
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
              First-Time Experience: Generating Your First Contract
            </span>
          </motion.h2>

          <motion.ol variants={fadeVariants} style={{ margin: 0, paddingLeft: '20px', maxWidth: '860px' }}>
            {firstTimeSteps.map((step) => (
              <li
                key={step}
                data-contract-copy-role="body"
                style={{
                  marginBottom: '12px',
                  fontFamily: 'var(--marketing-mono-body-family)',
                  fontSize: 'var(--marketing-mono-body-size)',
                  lineHeight: 'var(--marketing-mono-body-line-height)',
                  color: colors.neutral[400]
                }}
              >
                {step}
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
            <span
              data-contract-copy-role="sectionTitle"
              style={{
                fontFamily: 'var(--marketing-mono-section-title-family)',
                fontSize: 'var(--marketing-mono-section-title-size)',
                lineHeight: 'var(--marketing-mono-section-title-line-height)'
              }}
            >
              Current Contract Shape
            </span>
          </motion.h2>

          <motion.pre variants={fadeVariants} className="p-4 rounded-[4px] overflow-x-auto" style={surfacesDevPreStyle}>
            {contractShapeSnippet}
          </motion.pre>

          <motion.div variants={fadeVariants} className="space-y-3" style={{ marginTop: '14px', maxWidth: '860px' }}>
            <p
              data-contract-copy-role="body"
              style={{
                margin: 0,
                fontFamily: 'var(--marketing-mono-body-family)',
                fontSize: 'var(--marketing-mono-body-size)',
                lineHeight: 'var(--marketing-mono-body-line-height)',
                color: colors.neutral[400]
              }}
            >
              The user-facing concept is the profile. The current schema still carries separate severity switches, so the contract can say both <code>which profile fits this surface</code> and <code>how strongly to enforce drift against it</code>.
            </p>
            <p
              data-contract-copy-role="body"
              style={{
                margin: 0,
                fontFamily: 'var(--marketing-mono-body-family)',
                fontSize: 'var(--marketing-mono-body-size)',
                lineHeight: 'var(--marketing-mono-body-line-height)',
                color: colors.neutral[400]
              }}
            >
              Today that means fields such as <code>marketingLayoutProfile</code>, <code>marketingTypographyProfile</code>, and warn-first settings like <code>marketingLayoutPolicy</code> or <code>marketingTypographyPolicy</code>. Those field names are implementation detail; the user experience should still read as “this surface uses a marketing profile.”
            </p>
          </motion.div>
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
              Ongoing Experience
            </span>
          </motion.h2>

          <motion.ul variants={fadeVariants} style={{ margin: 0, paddingLeft: '18px', maxWidth: '860px' }}>
            {ongoingExpectations.map((expectation) => (
              <li
                key={expectation}
                data-contract-copy-role="body"
                style={{
                  marginBottom: '10px',
                  fontFamily: 'var(--marketing-mono-body-family)',
                  fontSize: 'var(--marketing-mono-body-size)',
                  lineHeight: 'var(--marketing-mono-body-line-height)',
                  color: colors.neutral[400]
                }}
              >
                {expectation}
              </li>
            ))}
          </motion.ul>
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
              What Users Should Expect
            </span>
          </motion.h2>

          <motion.div variants={fadeVariants} className="grid gap-3 sm:grid-cols-2" style={{ maxWidth: '860px' }}>
            <div className="p-4 rounded-[4px]" style={surfacesDevCardStyle}>
              <p
                data-contract-copy-role="body"
                style={{
                  marginTop: 0,
                  marginBottom: '8px',
                  fontFamily: 'var(--marketing-mono-body-family)',
                  fontSize: 'var(--marketing-mono-body-size)',
                  lineHeight: 'var(--marketing-mono-body-line-height)',
                  color: colors.neutral[200],
                  fontWeight: 600
                }}
              >
                First-time user
              </p>
              <p
                data-contract-copy-role="body"
                style={{
                  margin: 0,
                  fontFamily: 'var(--marketing-mono-body-family)',
                  fontSize: 'var(--marketing-mono-body-size)',
                  lineHeight: 'var(--marketing-mono-body-line-height)',
                  color: colors.neutral[400]
                }}
              >
                Expect a guided start, fewer blank-page decisions, and profile findings that explain what the platform is inferring from the surface.
              </p>
            </div>

            <div className="p-4 rounded-[4px]" style={surfacesDevCardStyle}>
              <p
                data-contract-copy-role="body"
                style={{
                  marginTop: 0,
                  marginBottom: '8px',
                  fontFamily: 'var(--marketing-mono-body-family)',
                  fontSize: 'var(--marketing-mono-body-size)',
                  lineHeight: 'var(--marketing-mono-body-line-height)',
                  color: colors.neutral[200],
                  fontWeight: 600
                }}
              >
                Continuing user
              </p>
              <p
                data-contract-copy-role="body"
                style={{
                  margin: 0,
                  fontFamily: 'var(--marketing-mono-body-family)',
                  fontSize: 'var(--marketing-mono-body-size)',
                  lineHeight: 'var(--marketing-mono-body-line-height)',
                  color: colors.neutral[400]
                }}
              >
                Expect better consistency, lower review overhead, and clearer decisions about when to change implementation versus when to change the declared surface family.
              </p>
            </div>
          </motion.div>
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
              Boundaries
            </span>
          </motion.h2>

          <motion.ul variants={fadeVariants} style={{ margin: 0, paddingLeft: '18px', maxWidth: '860px' }}>
            {boundaries.map((boundary) => (
              <li
                key={boundary}
                data-contract-copy-role="body"
                style={{
                  marginBottom: '10px',
                  fontFamily: 'var(--marketing-mono-body-family)',
                  fontSize: 'var(--marketing-mono-body-size)',
                  lineHeight: 'var(--marketing-mono-body-line-height)',
                  color: colors.neutral[400]
                }}
              >
                {boundary}
              </li>
            ))}
          </motion.ul>
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
            <NextContextLinks
              left={{ href: '/generation', label: 'Generation Quick Start' }}
              right={{ href: '/integration', label: 'Integration Quick Start' }}
            />
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
          surfaces.dev docs • guides
        </motion.p>
      </div>
    </SurfacesDevShell>
  );
}
