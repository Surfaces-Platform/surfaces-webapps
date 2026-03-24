'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { useState } from 'react';
import { ReleaseUpdatesPanel } from '@surfaces/ui/components/ReleaseUpdatesPanel';
import Navigation from '@surfaces/ui/components/Navigation';
import { colors } from '@surfaces/ui/tokens/colors';
import { fadeUpVariants, staggerContainer } from '@surfaces/ui/utils/motion';

const enforcementStages = [
  { key: 'generation', label: 'Generation time', accent: colors.signal.active },
  { key: 'ci', label: 'CI/CD time', accent: colors.signal.warning },
  { key: 'runtime', label: 'Runtime', accent: colors.contract.valid }
] as const;

const adaptiveModules = [
  { id: 'shell-band', width: '28%', height: '8%', left: '16%', top: '16%' },
  { id: 'hero-panel', width: '36%', height: '18%', left: '22%', top: '30%' },
  { id: 'adaptive-row', width: '22%', height: '10%', left: '56%', top: '60%' }
] as const;

const rejectedFragments = [
  { id: 'fragment-runtime', width: 86, height: 18, top: '53%', right: '9%' }
] as const;

export default function Home() {
  const [simulateDuplicateNav] = useState(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('simulateDuplicateNav') === '1'
  );

  const handleSurfaceChange = (surface: 'surfaces' | 'surfaceops' | 'interfacectl' | 'surfaces-dev') => {
    // Handle surface change - could use router for Next.js navigation
    console.log('Surface change:', surface);
  };

  return (
    <div 
      className="min-h-screen w-full"
      style={{ 
        backgroundColor: colors.neutral[50],
        fontFamily: 'Inter, sans-serif',
        color: colors.neutral[900]
      }}
    >
      <Navigation
        currentSurface="surfaces"
        currentContext={{
          contentType: 'concepts',
          subject: 'contracts'
        }}
        sections={[
          { label: 'Philosophy', href: '#philosophy' },
          { label: 'System', href: '#system' },
          { label: 'Ecosystem', href: '#ecosystem' },
          { label: 'Documentation', href: '#docs' }
        ]}
        utilities={[
          { label: 'GitHub', href: '#github' },
          { label: 'Docs', href: '#docs' }
        ]}
        theme="light"
        onSurfaceChange={handleSurfaceChange}
      />

      {simulateDuplicateNav ? (
        <nav
          aria-label="Simulation duplicate primary navigation"
          data-contract-simulation="duplicate-primary-nav"
          style={{
            padding: '8px 24px',
            borderBottom: `1px dashed ${colors.neutral[200]}`,
            backgroundColor: colors.neutral[0],
            fontSize: '12px'
          }}
        >
          <a href="#simulation-nav" style={{ color: colors.structure.primary, textDecoration: 'none' }}>
            Simulation nav
          </a>
        </nav>
      ) : null}
      
      <div className="contract-container" data-contract="page-container">
        
        {/* Section 1 - Header / Hero */}
        <motion.section 
          data-contract-section="landing.hero"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="pt-32 pb-24 md:pt-32 md:pb-24"
        >
          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <motion.p
                variants={fadeUpVariants}
                className="landing-hero-kicker"
                style={{
                  margin: '0 0 12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: colors.neutral[600]
                }}
              >
                Canonical source of interface truth
              </motion.p>

              <motion.h1
                variants={fadeUpVariants}
                style={{
                  fontSize: 'clamp(2.5rem, 4vw, 4rem)',
                  fontWeight: 600,
                  lineHeight: 1.08,
                  letterSpacing: '-0.04em',
                  margin: '0 0 24px',
                  maxWidth: '720px'
                }}
              >
                Agent behavior, contract-enforced.
              </motion.h1>

              <motion.p
                variants={fadeUpVariants}
                style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  lineHeight: 1.6,
                  margin: 0,
                  maxWidth: '640px',
                  color: colors.neutral[600]
                }}
              >
                Interface contracts keep adaptive change bounded across generation time,
                CI/CD time, and runtime so behavior stays predictable and accountable.
              </motion.p>

              <motion.div
                variants={fadeUpVariants}
                className="landing-hero-actions"
                style={{ marginTop: '32px' }}
              >
                <ReleaseUpdatesPanel
                  variant="hero"
                  buttonLabel="Get release updates"
                  idleMessage="Enter your work email and we'll send SurfaceOps desktop alpha announcements, stable promotions, and major rollout updates."
                  successMessage="Thanks. We'll send SurfaceOps desktop release updates to this email."
                />
              </motion.div>
            </div>

            <motion.div
              variants={fadeUpVariants}
              className="landing-hero-art"
              role="img"
              aria-label="A rigid interface frame holds a stable outer shell while interior modules shift inside a restricted zone; three subtle control planes filter change, and invalid fragments dissolve at the boundaries before they can enter or render."
            >
              <div className="landing-hero-frame" aria-hidden="true">
                <div className="landing-hero-frame-top">
                  <span className="landing-hero-frame-brand">surfaces.systems</span>
                </div>
                <div className="landing-hero-rail landing-hero-rail-y" />
                <div className="landing-hero-rail landing-hero-rail-x" />

                <div className="landing-hero-field">
                  <div className="landing-hero-lattice" />

                  {enforcementStages.map((stage, index) => (
                    <motion.div
                      key={stage.key}
                      className="landing-hero-gate"
                      initial={{ opacity: 0.55, x: 0 }}
                      animate={{ opacity: [0.55, 0.9, 0.55], x: [0, 2, 0] }}
                      transition={{
                        duration: 6,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: 'mirror',
                        delay: index * 0.8
                      }}
                      style={{
                        left: `${26 + index * 20}%`,
                        borderColor: stage.accent
                      }}
                    >
                      <span
                        className="landing-hero-gate-label"
                        style={{ color: colors.neutral[600] }}
                      >
                        {stage.label}
                      </span>
                    </motion.div>
                  ))}

                  {adaptiveModules.map((module, index) => (
                    <motion.div
                      key={module.id}
                      className="landing-hero-module"
                      initial={{ opacity: 0.9 }}
                      animate={{
                        y: index % 2 === 0 ? [0, -4, 0] : [0, 3, 0],
                        scale: [1, 1.01, 1]
                      }}
                      transition={{
                        duration: 7 + index,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: 'mirror',
                        ease: 'easeInOut'
                      }}
                      style={{
                        width: module.width,
                        height: module.height,
                        left: module.left,
                        top: module.top
                      }}
                    >
                      <span className="landing-hero-module-shine" />
                    </motion.div>
                  ))}

                  <div className="landing-hero-signal-path" />

                  {rejectedFragments.map((fragment, index) => (
                    <motion.div
                      key={fragment.id}
                      className="landing-hero-fragment"
                      initial={{ opacity: 0.55, scale: 0.96 }}
                      animate={{
                        opacity: [0.2, 0.72, 0.2],
                        x: [0, 10, 0],
                        rotate: [0, 6, 0]
                      }}
                      transition={{
                        duration: 5.5,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: 'mirror',
                        delay: index * 0.7
                      }}
                      style={{
                        width: `${fragment.width}px`,
                        height: `${fragment.height}px`,
                        top: fragment.top,
                        right: fragment.right
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Section 1.5 - Demos */}
        <motion.section 
          id="demos"
          data-contract-section="landing.demos"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-24"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <motion.h2 
            variants={fadeUpVariants}
            style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}
          >
            Demonstrate all three enforcement points
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={fadeUpVariants} className="p-6 rounded-[6px]" style={{ backgroundColor: colors.neutral[0], border: `1px solid ${colors.neutral[200]}` }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Generation time</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
                Run contract-aware generation with pre-emit guardrails (e.g., block shell-owned navigation) and validate before merge.
              </p>
              <Link href="/demos/generation" style={{ fontWeight: 600, textDecoration: 'none', color: colors.structure.primary }}>Open generation demo →</Link>
            </motion.div>

            <motion.div variants={fadeUpVariants} className="p-6 rounded-[6px]" style={{ backgroundColor: colors.neutral[0], border: `1px solid ${colors.neutral[200]}` }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>CI/CD gating</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
                Block drift in pipelines (including shell-owned primitive violations) and emit artifacts for SurfaceOps visibility.
              </p>
              <Link href="/demos/ci" style={{ fontWeight: 600, textDecoration: 'none', color: colors.structure.primary }}>Open CI/CD demo →</Link>
            </motion.div>

            <motion.div variants={fadeUpVariants} className="p-6 rounded-[6px]" style={{ backgroundColor: colors.neutral[0], border: `1px solid ${colors.neutral[200]}` }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Adaptive runtime</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
                Edge/on-device middleware enforces the contract (including shell-owned primitives) before adaptive UI changes render.
              </p>
              <Link href="/adaptive/test?section=hero" style={{ fontWeight: 600, textDecoration: 'none', color: colors.structure.primary }}>Open adaptive demo →</Link>
            </motion.div>
          </div>
        </motion.section>

        {/* Section 2 - The Problem */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-32"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <div className="grid grid-cols-12 gap-6">
            <motion.div variants={fadeUpVariants} className="col-span-4">
              <h2 style={{ fontSize: '20px', fontWeight: 600, lineHeight: 1.4 }}>
                Agent-driven interfaces require bounded adaptation.
              </h2>
            </motion.div>
            <motion.div variants={fadeUpVariants} className="col-span-7 col-start-6">
              <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.6 }}>
                Agents generate and adapt interfaces. Without bounded adaptation, behavior becomes unpredictable. Drift follows. Invariants break. Accountability erodes. Contracts enforce boundaries at generation time, CI/CD time, and runtime (edge/on-device), keeping behavior aligned with intent.
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* Section 3 - The Insight */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-32"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <motion.div variants={fadeUpVariants} className="max-w-[800px]">
            <h2 style={{ fontSize: '20px', fontWeight: 600, lineHeight: 1.4, marginBottom: '24px' }}>
              Interfaces are systems, not screens.
            </h2>
            <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.6, marginBottom: '16px' }}>
              Interfaces make decisions. They determine what users see, when they see it, and how the system responds. These decisions form behavioral contracts that hold across generation cycles, runtime adaptations, and edge personalization.
            </p>
            <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.6 }}>
              Contracts define invariants and bounded adaptation. Surfaces enforces them at generation time, CI/CD time, and runtime (edge/on-device). The difference is documented intent versus operational control.
            </p>
          </motion.div>
        </motion.section>

        {/* Section 4 - The Surfaces Approach */}
        <motion.section 
          data-contract-section="landing.guidance"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-32"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <motion.h2 
            variants={fadeUpVariants}
            style={{ fontSize: '20px', fontWeight: 600, marginBottom: '48px' }}
          >
            The Surfaces Approach
          </motion.h2>
          
          <div className="grid grid-cols-3 gap-6">
            <motion.div 
              variants={fadeUpVariants}
              className="p-8 rounded-[6px]"
              style={{ 
                backgroundColor: colors.neutral[0],
                border: `1px solid ${colors.neutral[200]}`
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                Define
              </h3>
              <div className="space-y-2">
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Interface intent and invariants</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Allowed change surface</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Contextual conditions</p>
              </div>
            </motion.div>

            <motion.div 
              variants={fadeUpVariants}
              className="p-8 rounded-[6px]"
              style={{ 
                backgroundColor: colors.neutral[0],
                border: `1px solid ${colors.neutral[200]}`
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                Enforce
              </h3>
              <div className="space-y-2">
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Validation at generation time</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Runtime gates for agent-proposed changes</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Drift prevention as outcome</p>
              </div>
            </motion.div>

            <motion.div 
              variants={fadeUpVariants}
              className="p-8 rounded-[6px]"
              style={{ 
                backgroundColor: colors.neutral[0],
                border: `1px solid ${colors.neutral[200]}`
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                Operate
              </h3>
              <div className="space-y-2">
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Signals from violations and near-misses</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Contract refinement and change control</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Lifecycle control over time</p>
              </div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          data-contract-section="landing.actions"
          aria-hidden="true"
          hidden
        />

        {/* Section 5 - The Ecosystem */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-32"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <motion.h2 
            variants={fadeUpVariants}
            style={{ fontSize: '20px', fontWeight: 600, marginBottom: '48px' }}
          >
            One system. Multiple surfaces.
          </motion.h2>
          
          <motion.p 
            variants={fadeUpVariants}
            style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.6, marginBottom: '32px', maxWidth: '800px' }}
          >
            One contract model compiles once and applies everywhere.
          </motion.p>
          
          <div className="space-y-8 max-w-[800px]">
            <motion.div 
              variants={fadeUpVariants}
              className="pb-8"
              style={{ borderBottom: `1px solid ${colors.neutral[200]}` }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                surfaces.systems
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.neutral[600] }}>
                Same contracts, different enforcement surface. The canonical source of truth for interface contracts.
              </p>
            </motion.div>

            <motion.div 
              variants={fadeUpVariants}
              className="pb-8"
              style={{ borderBottom: `1px solid ${colors.neutral[200]}` }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                surfaceops.ai
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.neutral[600] }}>
                Same contracts, different enforcement surface. Operational enforcement and feedback for interface integrity across AI and traditional systems.
              </p>
            </motion.div>

            <motion.div variants={fadeUpVariants}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                interfacectl.com
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.neutral[600] }}>
                Same contracts, different enforcement surface. Literal, executable interface control through command-line precision.
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* Section 6 - Who This Is For */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-32"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <motion.h2 
            variants={fadeUpVariants}
            style={{ fontSize: '20px', fontWeight: 600, marginBottom: '48px' }}
          >
            Who This Is For
          </motion.h2>
          
          <div className="grid grid-cols-3 gap-6">
            <motion.div variants={fadeUpVariants}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                Platform and infrastructure teams
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.neutral[600] }}>
                Unbounded adaptation breaks invariants. Contracts enforce boundaries at generation time, CI/CD time, and runtime (edge/on-device), preventing agent-proposed changes that violate intent.
              </p>
            </motion.div>

            <motion.div variants={fadeUpVariants}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                Design system owners
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.neutral[600] }}>
                Interface divergence creates unclear responsibility. Contracts enforce boundaries at generation time, CI/CD time, and runtime (edge/on-device), making behavior predictable and accountable.
              </p>
            </motion.div>

            <motion.div variants={fadeUpVariants}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                AI and automation leaders
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.neutral[600] }}>
                Agent-driven generation creates inconsistent behavior. Contracts enforce boundaries at generation time, CI/CD time, and runtime (edge/on-device), keeping agent behavior aligned with intent.
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* Section 7 - Philosophy */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUpVariants}
          className="py-32"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <div 
            className="p-16 rounded-[6px]"
            style={{ 
              backgroundColor: colors.neutral[100],
              maxWidth: '800px',
              margin: '0 auto'
            }}
          >
            <p style={{ 
              fontSize: '20px', 
              fontWeight: 600, 
              lineHeight: 1.5,
              textAlign: 'center'
            }}>
              Users trust interfaces that behave<br />
              predictably and accountably.
            </p>
          </div>
        </motion.section>

        {/* Footer */}
        <motion.footer 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUpVariants}
          className="py-16"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <p style={{ fontSize: '12px', color: colors.neutral[600] }}>
            © 2025 Surfaces Systems
          </p>
        </motion.footer>

      </div>
    </div>
  );
}
