'use client';

import { motion } from 'motion/react';
import Navigation from '@surfaces/ui/components/Navigation';
import { colors } from '@surfaces/ui/tokens/colors';
import { fadeUpVariants, staggerContainer } from '@surfaces/ui/utils/motion';

export default function Home() {
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
      
      <div className="contract-container" data-contract="page-container">
        
        {/* Section 1 - Header / Hero */}
        <motion.section 
          data-contract-section="landing.hero"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="pt-32 pb-32"
        >
          <motion.h1 
            variants={fadeUpVariants}
            style={{ 
              fontSize: '32px', 
              fontWeight: 600, 
              lineHeight: 1.2, 
              marginBottom: '24px',
              maxWidth: '720px'
            }}
          >
            Agent behavior,<br />
            contract-enforced.
          </motion.h1>
          
          <motion.p 
            variants={fadeUpVariants}
            style={{ 
              fontSize: '14px', 
              fontWeight: 400, 
              lineHeight: 1.6,
              marginBottom: '32px',
              maxWidth: '600px'
            }}
          >
            Interface contracts enforced at generation time and runtime. Behavior stays predictable and accountable.
          </motion.p>
          
          <motion.div 
            variants={fadeUpVariants}
            className="flex gap-6"
          >
            <a
              href="#demos"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                padding: '12px 24px',
                backgroundColor: colors.structure.primary,
                color: colors.neutral[0],
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'all var(--contract-motion-duration) var(--contract-motion-timing)'
              }}
            >
              See the demos
            </a>
            <a
              href="#docs"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: colors.neutral[900],
                border: `1px solid ${colors.neutral[200]}`,
                borderRadius: '6px',
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'all var(--contract-motion-duration) var(--contract-motion-timing)'
              }}
            >
              Read the philosophy
            </a>
          </motion.div>
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
                Run the contract validator against code and generated UI before merge.
              </p>
              <a href="/demos/generation" style={{ fontWeight: 600, textDecoration: 'none', color: colors.structure.primary }}>Open generation demo →</a>
            </motion.div>

            <motion.div variants={fadeUpVariants} className="p-6 rounded-[6px]" style={{ backgroundColor: colors.neutral[0], border: `1px solid ${colors.neutral[200]}` }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>CI/CD gating</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
                Block drift in pipelines and emit artifacts for SurfaceOps visibility.
              </p>
              <a href="/demos/ci" style={{ fontWeight: 600, textDecoration: 'none', color: colors.structure.primary }}>Open CI/CD demo →</a>
            </motion.div>

            <motion.div variants={fadeUpVariants} className="p-6 rounded-[6px]" style={{ backgroundColor: colors.neutral[0], border: `1px solid ${colors.neutral[200]}` }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Adaptive runtime</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
                Edge middleware enforces the contract before adaptive UI changes render.
              </p>
              <a href="/adaptive/test?section=hero" style={{ fontWeight: 600, textDecoration: 'none', color: colors.structure.primary }}>Open adaptive demo →</a>
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
                Agents generate and adapt interfaces. Without bounded adaptation, behavior becomes unpredictable. Drift follows. Invariants break. Accountability erodes. Contracts enforce boundaries at generation time and runtime, keeping behavior aligned with intent.
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
              Contracts define invariants and bounded adaptation. Surfaces enforces them at generation time and runtime. The difference is documented intent versus operational control.
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
                Unbounded adaptation breaks invariants. Contracts enforce boundaries at generation time and runtime, preventing agent-proposed changes that violate intent.
              </p>
            </motion.div>

            <motion.div variants={fadeUpVariants}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                Design system owners
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.neutral[600] }}>
                Interface divergence creates unclear responsibility. Contracts enforce boundaries at generation time and runtime, making behavior predictable and accountable.
              </p>
            </motion.div>

            <motion.div variants={fadeUpVariants}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                AI and automation leaders
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.neutral[600] }}>
                Agent-driven generation creates inconsistent behavior. Contracts enforce boundaries at generation time and runtime, keeping agent behavior aligned with intent.
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

        {/* Section 8 - Closing CTA */}
        <motion.section 
          data-contract-section="landing.actions"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-32"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <motion.h2 
            variants={fadeUpVariants}
            style={{ 
              fontSize: '32px', 
              fontWeight: 600, 
              lineHeight: 1.2, 
              marginBottom: '32px',
              maxWidth: '720px'
            }}
          >
            Build systems that stay coherent.
          </motion.h2>
          
          <motion.div 
            variants={fadeUpVariants}
            className="flex gap-6"
          >
            <button
              style={{
                fontSize: '14px',
                fontWeight: 600,
                padding: '12px 24px',
                backgroundColor: colors.structure.primary,
                color: colors.neutral[0],
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all var(--contract-motion-duration) var(--contract-motion-timing)'
              }}
            >
              Start with Surfaces
            </button>
            <button
              style={{
                fontSize: '14px',
                fontWeight: 600,
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: colors.neutral[900],
                border: `1px solid ${colors.neutral[200]}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all var(--contract-motion-duration) var(--contract-motion-timing)'
              }}
            >
              View documentation
            </button>
          </motion.div>
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
