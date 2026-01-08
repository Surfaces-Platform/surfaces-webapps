'use client';

import { motion } from 'motion/react';
import Navigation from '@surfaces/ui/components/Navigation';
import { colors } from '@surfaces/ui/tokens/colors';
import { fadeRightVariants, fadeDownVariants, staggerContainer } from '@surfaces/ui/utils/motion';

export default function Home() {
  const handleSurfaceChange = (surface: 'surfaces' | 'surfaceops' | 'interfacectl') => {
    console.log('Surface change:', surface);
  };

  // State definitions for operational signals
  const states = [
    {
      name: 'valid',
      label: 'Valid',
      color: colors.contract.valid,
      description: 'Interface conforms to defined contract. No action required.'
    },
    {
      name: 'warning',
      label: 'Warning',
      color: colors.signal.warning,
      description: 'Minor deviation detected. Review recommended before promotion.'
    },
    {
      name: 'drift',
      label: 'Drift detected',
      color: colors.signal.active,
      description: 'Interface has diverged from canonical definition. Reconciliation needed.'
    },
    {
      name: 'invalid',
      label: 'Invalid',
      color: colors.contract.invalid,
      description: 'Contract violation. Change blocked until resolved.'
    }
  ];

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
        currentSurface="surfaceops"
        currentContext={{
          contentType: 'states',
          subject: 'drift'
        }}
        sections={[
          { label: 'Overview', href: '#overview' },
          { label: 'Capabilities', href: '#capabilities' },
          { label: 'States', href: '#states' },
          { label: 'Operations', href: '#operations' },
          { label: 'Docs', href: '#docs' }
        ]}
        utilities={[
          { label: 'GitHub', href: '#github' },
          { label: 'Status', href: '#status' }
        ]}
        theme="light"
        onSurfaceChange={handleSurfaceChange}
      />
      
      <div className="contract-container">
        
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
            variants={fadeRightVariants}
            style={{ 
              fontSize: '32px', 
              fontWeight: 600, 
              lineHeight: 1.2, 
              marginBottom: '24px',
              maxWidth: '720px'
            }}
          >
            Operate interface contracts in production.
          </motion.h1>
          
          <motion.p 
            variants={fadeRightVariants}
            style={{ 
              fontSize: '14px', 
              fontWeight: 400, 
              lineHeight: 1.6,
              marginBottom: '32px',
              maxWidth: '600px'
            }}
          >
            surfaceops.ai monitors, enforces, and manages interface integrity across evolving systems and AI workflows.
          </motion.p>
          
          <motion.div 
            variants={fadeRightVariants}
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
              View how it works
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
              See example workflows
            </button>
          </motion.div>
        </motion.section>

        {/* Section 2 - The Operational Problem */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-32"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <div className="grid grid-cols-12 gap-6">
            <motion.div variants={fadeRightVariants} className="col-span-4">
              <h2 style={{ fontSize: '20px', fontWeight: 600, lineHeight: 1.4 }}>
                Documentation does not survive production.
              </h2>
            </motion.div>
            <motion.div variants={fadeRightVariants} className="col-span-7 col-start-6">
              <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.6 }}>
                Interfaces change silently. Tokens drift from their definitions. Copy diverges across surfaces. AI introduces variance at generation time. Breakage is detected too late—after users encounter it, after trust erodes. Operational reality requires continuous validation, not periodic audits.
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* Section 3 - What surfaceops Does */}
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
            variants={fadeRightVariants}
            style={{ fontSize: '20px', fontWeight: 600, marginBottom: '48px' }}
          >
            What surfaceops Does
          </motion.h2>
          
          <div className="grid grid-cols-3 gap-6">
            <motion.div 
              variants={fadeDownVariants}
              className="p-8 rounded-[6px]"
              style={{ 
                backgroundColor: colors.neutral[0],
                border: `1px solid ${colors.neutral[200]}`
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                Monitor
              </h3>
              <div className="space-y-2">
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Track interface state over time</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Detect visual, language, and structural drift</p>
              </div>
            </motion.div>

            <motion.div 
              variants={fadeDownVariants}
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
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Validate against contracts</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Block invalid changes</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Surface violations early</p>
              </div>
            </motion.div>

            <motion.div 
              variants={fadeDownVariants}
              className="p-8 rounded-[6px]"
              style={{ 
                backgroundColor: colors.neutral[0],
                border: `1px solid ${colors.neutral[200]}`
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                Govern
              </h3>
              <div className="space-y-2">
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Define allowed evolution</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Maintain auditability</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Support safe iteration</p>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Section 4 - Signals & State */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-32"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <motion.h2 
            variants={fadeRightVariants}
            style={{ fontSize: '20px', fontWeight: 600, marginBottom: '48px' }}
          >
            Signals & State
          </motion.h2>
          
          <div className="space-y-3">
            {states.map((state) => (
              <motion.div 
                key={state.name}
                variants={fadeRightVariants}
                className="flex items-center gap-6 p-6 rounded-[6px]"
                style={{ 
                  backgroundColor: colors.neutral[0],
                  border: `1px solid ${colors.neutral[200]}`,
                  borderLeftWidth: '4px',
                  borderLeftColor: state.color
                }}
              >
                <div className="w-32">
                  <p style={{ 
                    fontSize: '13px', 
                    fontWeight: 400,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: state.color
                  }}>
                    {state.label}
                  </p>
                </div>
                <div className="flex-1">
                  <p style={{ fontSize: '14px', lineHeight: 1.6 }}>
                    {state.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Section 5 - Where It Fits */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-32"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <div className="grid grid-cols-12 gap-6">
            <motion.div variants={fadeRightVariants} className="col-span-4">
              <h2 style={{ fontSize: '20px', fontWeight: 600, lineHeight: 1.4 }}>
                Fits into existing workflows
              </h2>
            </motion.div>
            <motion.div variants={fadeRightVariants} className="col-span-7 col-start-6">
              <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.6, marginBottom: '16px' }}>
                surfaceops.ai integrates with CI pipelines to validate interface changes before merge. It connects to design systems to ensure token adherence. It monitors AI orchestration layers to detect generated variance. It provides governance hooks for platform teams to enforce organizational standards.
              </p>
              <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.6 }}>
                No vendor lock-in. No proprietary formats. It operates on contracts you define.
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* Section 6 - Designed for Operators */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-32"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <motion.h2 
            variants={fadeRightVariants}
            style={{ fontSize: '20px', fontWeight: 600, marginBottom: '48px' }}
          >
            Designed for Operators
          </motion.h2>
          
          <div className="grid grid-cols-3 gap-6">
            <motion.div variants={fadeDownVariants}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                Platform engineers
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.neutral[600] }}>
                Interface integrity becomes infrastructure policy, not team negotiation.
              </p>
            </motion.div>

            <motion.div variants={fadeDownVariants}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                Design system owners
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.neutral[600] }}>
                Enforcement moves from documentation to operational validation.
              </p>
            </motion.div>

            <motion.div variants={fadeDownVariants}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                AI infrastructure teams
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.neutral[600] }}>
                Generated interfaces stay within defined boundaries at scale.
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* Section 7 - Relationship to the System */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeRightVariants}
          className="py-32"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <div 
            className="p-12 rounded-[6px] max-w-[800px] mx-auto"
            style={{ 
              backgroundColor: colors.neutral[100]
            }}
          >
            <p style={{ 
              fontSize: '14px', 
              fontWeight: 400, 
              lineHeight: 1.7,
              textAlign: 'center'
            }}>
              surfaceops.ai is the operational surface of the Surfaces system.<br />
              It does not define contracts.<br />
              It ensures they remain true over time.
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
            variants={fadeRightVariants}
            style={{ 
              fontSize: '32px', 
              fontWeight: 600, 
              lineHeight: 1.2, 
              marginBottom: '32px',
              maxWidth: '720px'
            }}
          >
            Operate what you define.
          </motion.h2>
          
          <motion.div 
            variants={fadeRightVariants}
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
              Explore surfaceops.ai
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
              Read the operational model
            </button>
          </motion.div>
        </motion.section>

        {/* Footer */}
        <motion.footer 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeRightVariants}
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
