'use client';

import { motion } from 'motion/react';
import Navigation from '@surfaces/ui/components/Navigation';
import { colors } from '@surfaces/ui/tokens/colors';
import { fadeVariants, staggerContainerFast } from '@surfaces/ui/utils/motion';

export default function Home() {
  const handleSurfaceChange = (surface: 'surfaces' | 'surfaceops' | 'interfacectl' | 'surfaces-dev') => {
    console.log('Surface change:', surface);
  };

  // 4-layer stack
  const stack = [
    {
      name: 'surfaces.systems',
      description: 'System authority (vision, model)'
    },
    {
      name: 'surfaces.dev',
      description: 'Developer interface (docs/specs/examples)'
    },
    {
      name: 'surfaceops.ai',
      description: 'Hosted ops platform (monitoring/enforcement)'
    },
    {
      name: 'interfacectl',
      description: 'CLI execution (validate/diff/enforce)'
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
        currentSurface="surfaces-dev"
        sections={[
          { label: 'Get started', href: '/get-started' },
          { label: 'Contracts', href: '/contracts' },
          { label: 'interfacectl', href: '/interfacectl' },
          { label: 'Guides', href: '/guides' },
          { label: 'Reference', href: '/reference/validation-boundaries' },
          { label: 'Shell boundary', href: '/reference/shell-boundary' }
        ]}
        utilities={[
          { label: 'GitHub', href: '#github' }
        ]}
        theme="dark"
        onSurfaceChange={handleSurfaceChange}
      />
      
      <div className="contract-container">
        
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
            surfaces.dev
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
            Developer documentation for Surfaces.
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
            surfaces.dev is the developer interface for Surfaces: docs, specs, schemas, examples, and CLI semantics.
          </motion.p>
        </motion.section>

        {/* Section 2 - Boundary Note */}
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
            <p style={{ 
              fontSize: '14px', 
              fontWeight: 400,
              margin: 0,
              color: colors.neutral[0],
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              surfaces.dev is for people; surfaceops.ai is for systems.
            </p>
          </motion.div>
        </motion.section>

        {/* Section 3 - 4-Layer Stack */}
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
            The Surfaces Stack
          </motion.h2>
          
          <div 
            className="space-y-4 max-w-[680px]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {stack.map((layer, idx) => (
              <motion.div 
                key={idx}
                variants={fadeVariants}
                className="pb-4"
                style={{ borderBottom: idx < stack.length - 1 ? `1px solid ${colors.neutral[800]}` : 'none' }}
              >
                <h3 style={{ 
                  fontSize: '13px', 
                  fontWeight: 400,
                  color: colors.neutral[0],
                  marginBottom: '4px'
                }}>
                  {layer.name}
                </h3>
                <p style={{ 
                  fontSize: '12px', 
                  fontWeight: 400,
                  color: colors.neutral[400],
                  fontFamily: 'Inter, sans-serif',
                  lineHeight: 1.5
                }}>
                  {layer.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Section 4 - CTAs */}
        <motion.section 
          data-contract-section="landing.actions"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainerFast}
          className="py-28"
          style={{ borderTop: `1px solid ${colors.neutral[800]}` }}
        >
          <motion.div 
            variants={fadeVariants}
            className="space-y-6"
          >
            <motion.a
              href="/get-started"
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
                textDecoration: 'none',
                transition: 'all var(--contract-motion-duration) var(--contract-motion-timing)'
              }}
            >
              Get started with interfacectl →
            </motion.a>
            <motion.a
              href="/contracts"
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
                textDecoration: 'none',
                transition: 'all var(--contract-motion-duration) var(--contract-motion-timing)'
              }}
            >
              Read the contract spec →
            </motion.a>
          </motion.div>
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
