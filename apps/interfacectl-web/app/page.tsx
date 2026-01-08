'use client';

import { motion } from 'motion/react';
import Navigation from '@surfaces/ui/components/Navigation';
import { colors } from '@surfaces/ui/tokens/colors';
import { fadeVariants, staggerContainerFast } from '@surfaces/ui/utils/motion';

export default function Home() {
  const handleSurfaceChange = (surface: 'surfaces' | 'surfaceops' | 'interfacectl') => {
    console.log('Surface change:', surface);
  };

  // Command examples
  const commands = [
    {
      command: 'interfacectl validate interface.json',
      description: 'Validates an interface against its contract.'
    },
    {
      command: 'interfacectl diff previous.json current.json',
      description: 'Shows structural and language drift.'
    },
    {
      command: 'interfacectl enforce interface.json --strict',
      description: 'Fails on any contract violation.'
    }
  ];

  // Exit states
  const exitStates = [
    {
      code: '0',
      label: 'Valid',
      description: 'Interface conforms to contract.',
      color: colors.contract.valid
    },
    {
      code: '1',
      label: 'Warning',
      description: 'Minor deviation detected.',
      color: colors.signal.warning
    },
    {
      code: '2',
      label: 'Drift detected',
      description: 'Interface has diverged from definition.',
      color: colors.signal.active
    },
    {
      code: '3',
      label: 'Invalid',
      description: 'Contract violation. Change blocked.',
      color: colors.contract.invalid
    }
  ];

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
          contentType: 'commands',
          subject: 'validation'
        }}
        sections={[
          { label: 'Install', href: '#install' },
          { label: 'Usage', href: '#usage' },
          { label: 'Commands', href: '#commands' },
          { label: 'Specification', href: '#spec' }
        ]}
        utilities={[
          { label: 'GitHub', href: '#github' },
          { label: 'v1.0.0', href: '#version' }
        ]}
        theme="dark"
        onSurfaceChange={handleSurfaceChange}
      />
      
      <div className="contract-container max-w-[1040px]">
        
        {/* Section 1 - Header */}
        <motion.section 
          data-contract-section="landing.hero"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="pt-32 pb-28"
        >
          <motion.h1 
            variants={fadeVariants}
            style={{ 
              fontSize: '20px', 
              fontWeight: 600, 
              lineHeight: 1.4, 
              marginBottom: '8px'
            }}
          >
            interfacectl
          </motion.h1>
          
          <motion.p 
            variants={fadeVariants}
            style={{ 
              fontSize: '12px', 
              fontWeight: 400,
              color: colors.neutral[400],
              marginBottom: '24px'
            }}
          >
            Command-line control for interface contracts.
          </motion.p>
          
          <motion.p 
            variants={fadeVariants}
            style={{ 
              fontSize: '14px', 
              fontWeight: 400, 
              lineHeight: 1.6,
              maxWidth: '680px'
            }}
          >
            interfacectl validates, enforces, and inspects interface contracts as executable truth.
          </motion.p>
        </motion.section>

        {/* Section 2 - Installation */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="py-28"
          style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
        >
          <motion.div 
            variants={fadeVariants}
            className="p-6 rounded-[4px]"
            style={{ 
              backgroundColor: colors.neutral[800],
              border: `1px solid ${colors.neutral[600]}`
            }}
          >
            <pre style={{ 
              fontSize: '13px', 
              fontWeight: 400,
              margin: 0,
              color: colors.neutral[0],
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              brew install interfacectl
            </pre>
          </motion.div>
          
          <motion.p 
            variants={fadeVariants}
            style={{ 
              fontSize: '12px', 
              fontWeight: 400,
              color: colors.neutral[400],
              marginTop: '12px'
            }}
          >
            Supports macOS, Linux, CI environments.
          </motion.p>
        </motion.section>

        {/* Section 3 - What It Does */}
        <motion.section 
          data-contract-section="landing.guidance"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="py-28"
          style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
        >
          <div className="grid grid-cols-12 gap-6">
            <motion.div variants={fadeVariants} className="col-span-4">
              <h2 style={{ fontSize: '20px', fontWeight: 600, lineHeight: 1.4 }}>
                What this tool is
              </h2>
            </motion.div>
            <motion.div 
              variants={fadeVariants} 
              className="col-span-7 col-start-6"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <ul className="space-y-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ fontSize: '14px', lineHeight: 1.6 }}>Reads interface contracts</li>
                <li style={{ fontSize: '14px', lineHeight: 1.6 }}>Validates implementations</li>
                <li style={{ fontSize: '14px', lineHeight: 1.6 }}>Detects drift</li>
                <li style={{ fontSize: '14px', lineHeight: 1.6 }}>Exits with explicit status codes</li>
              </ul>
            </motion.div>
          </div>
        </motion.section>

        {/* Section 4 - Example Usage */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="py-28"
          style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
        >
          <motion.h2 
            variants={fadeVariants}
            style={{ fontSize: '20px', fontWeight: 600, marginBottom: '32px' }}
          >
            Example Usage
          </motion.h2>
          
          <div className="space-y-6">
            {commands.map((cmd, idx) => (
              <motion.div key={idx} variants={fadeVariants}>
                <div 
                  className="p-4 rounded-[4px] mb-2"
                  style={{ 
                    backgroundColor: colors.neutral[800],
                    border: `1px solid ${colors.neutral[600]}`
                  }}
                >
                  <pre style={{ 
                    fontSize: '13px', 
                    fontWeight: 400,
                    margin: 0,
                    color: colors.neutral[0],
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>
                    {cmd.command}
                  </pre>
                </div>
                <p 
                  style={{ 
                    fontSize: '12px', 
                    fontWeight: 400,
                    color: colors.neutral[400],
                    fontFamily: 'Inter, sans-serif',
                    lineHeight: 1.5
                  }}
                >
                  {cmd.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Section 5 - Exit States */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="py-28"
          style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
        >
          <motion.h2 
            variants={fadeVariants}
            style={{ fontSize: '20px', fontWeight: 600, marginBottom: '32px' }}
          >
            Exit States
          </motion.h2>
          
          <div className="space-y-3">
            {exitStates.map((state, idx) => (
              <motion.div 
                key={idx}
                variants={fadeVariants}
                className="flex items-baseline gap-6"
              >
                <div className="flex items-baseline gap-3 w-48">
                  <span style={{ 
                    fontSize: '13px', 
                    fontWeight: 400,
                    color: colors.neutral[400]
                  }}>
                    {state.code}
                  </span>
                  <span style={{ 
                    fontSize: '13px', 
                    fontWeight: 400,
                    color: state.color
                  }}>
                    {state.label}
                  </span>
                </div>
                <p style={{ 
                  fontSize: '12px', 
                  fontWeight: 400,
                  color: colors.neutral[400],
                  fontFamily: 'Inter, sans-serif',
                  lineHeight: 1.5
                }}>
                  {state.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Section 6 - When to Use This */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="py-28"
          style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
        >
          <motion.h2 
            variants={fadeVariants}
            style={{ fontSize: '20px', fontWeight: 600, marginBottom: '32px' }}
          >
            When to Use This
          </motion.h2>
          
          <div 
            className="space-y-4 max-w-[680px]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <motion.p 
              variants={fadeVariants}
              style={{ fontSize: '14px', lineHeight: 1.6 }}
            >
              In CI pipelines to validate interface changes before merge.
            </motion.p>
            <motion.p 
              variants={fadeVariants}
              style={{ fontSize: '14px', lineHeight: 1.6 }}
            >
              During design system changes to ensure token adherence.
            </motion.p>
            <motion.p 
              variants={fadeVariants}
              style={{ fontSize: '14px', lineHeight: 1.6 }}
            >
              Before AI-generated interfaces ship to production.
            </motion.p>
          </div>
        </motion.section>

        {/* Section 7 - Relationship to the System */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeVariants}
          className="py-28"
          style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
        >
          <div className="max-w-[680px]">
            <p style={{ 
              fontSize: '14px', 
              fontWeight: 400, 
              lineHeight: 1.8
            }}>
              interfacectl is the executable surface of the Surfaces system.<br />
              It does not interpret intent.<br />
              It evaluates truth.
            </p>
          </div>
        </motion.section>

        {/* Section 8 - Closing */}
        <motion.section 
          data-contract-section="landing.actions"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="py-28"
          style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
        >
          <motion.p 
            variants={fadeVariants}
            style={{ 
              fontSize: '14px', 
              fontWeight: 400, 
              lineHeight: 1.6,
              marginBottom: '24px'
            }}
          >
            If it passes interfacectl, it passes the contract.
          </motion.p>
          
          <motion.button
            variants={fadeVariants}
            style={{
              fontSize: '12px',
              fontWeight: 400,
              padding: '8px 0',
              backgroundColor: 'transparent',
              color: colors.neutral[400],
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all var(--contract-motion-duration) var(--contract-motion-timing)'
            }}
          >
            Read the specification →
          </motion.button>
        </motion.section>

        {/* Footer */}
        <motion.footer 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeVariants}
          className="py-16"
          style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
        >
          <p style={{ fontSize: '12px', color: colors.neutral[600] }}>
            © 2025 Surfaces Systems
          </p>
        </motion.footer>

      </div>
    </div>
  );
}
