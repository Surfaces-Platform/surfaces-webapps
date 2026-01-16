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
            Interfaces drift. Systems break.<br />
            Surfaces keeps them aligned.
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
            Surfaces is the system layer that defines, enforces, and operates interface contracts across modern software and AI systems.
          </motion.p>
          
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
              Explore the system
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
              Read the philosophy
            </button>
          </motion.div>
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
                As teams scale, interfaces lose integrity.
              </h2>
            </motion.div>
            <motion.div variants={fadeUpVariants} className="col-span-7 col-start-6">
              <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.6 }}>
                Design systems drift from implementation. UI copy diverges across platforms. AI-generated interfaces introduce inconsistency at scale. No enforceable contract exists between design intent and shipped product. The result is fragmentation, user confusion, and mounting technical debt.
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
              Every interface is composed of interconnected elements: visual structure, language, behavior, and state. These elements form contracts that must hold across platforms, teams, and time.
            </p>
            <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.6 }}>
              Documentation describes intent. Surfaces enforces it. The difference is the distance between aspiration and operational reality.
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
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Visual tokens</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Language rules</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Structural intent</p>
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
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Contracts</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Validation</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Drift detection</p>
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
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Monitoring</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Change management</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>System evolution</p>
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
                The canonical source of truth for interface contracts and design system enforcement.
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
                Operational enforcement and monitoring for interface integrity across AI and traditional systems.
              </p>
            </motion.div>

            <motion.div variants={fadeUpVariants}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                interfacectl.com
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.neutral[600] }}>
                Literal, executable interface control through command-line precision.
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
                Enforce interface contracts as infrastructure, not aspiration.
              </p>
            </motion.div>

            <motion.div variants={fadeUpVariants}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                Design system owners
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.neutral[600] }}>
                Close the gap between design intent and production reality.
              </p>
            </motion.div>

            <motion.div variants={fadeUpVariants}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                AI and automation leaders
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.neutral[600] }}>
                Ensure generated interfaces maintain systematic coherence.
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
              Consistency is not aesthetic preference.<br />
              It is operational integrity.
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
