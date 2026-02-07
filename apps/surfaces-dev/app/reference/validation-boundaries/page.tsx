'use client';

import { motion } from 'motion/react';
import Navigation from '@surfaces/ui/components/Navigation';
import { colors } from '@surfaces/ui/tokens/colors';
import { fadeVariants, staggerContainerFast } from '@surfaces/ui/utils/motion';

export default function ValidationBoundaries() {
  const handleSurfaceChange = (surface: 'surfaces' | 'surfaceops' | 'interfacectl' | 'surfaces-dev') => {
    console.log('Surface change:', surface);
  };

  const layers = [
    {
      level: 'L0',
      name: 'Artifact Validity',
      description: 'Syntax and structure validation'
    },
    {
      level: 'L1',
      name: 'Contract Compliance',
      description: 'Conformance to defined contract'
    },
    {
      level: 'L2',
      name: 'Semantic Consistency',
      description: 'Language and meaning validation'
    },
    {
      level: 'L3',
      name: 'Behavioral Integrity',
      description: 'Runtime behavior verification'
    }
  ];

  const errors = [
    {
      code: 'E0',
      name: 'Artifact Error',
      description: 'Invalid syntax or structure'
    },
    {
      code: 'E1',
      name: 'Contract Violation',
      description: 'Failure to conform to contract'
    },
    {
      code: 'E2',
      name: 'Semantic Drift',
      description: 'Language or meaning inconsistency'
    },
    {
      code: 'E3',
      name: 'Behavioral Mismatch',
      description: 'Runtime behavior deviation'
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
        <motion.section 
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
              marginBottom: '24px'
            }}
          >
            Validation Boundaries
          </motion.h1>
          
          <motion.p 
            variants={fadeVariants}
            style={{ 
              fontSize: '14px', 
              fontWeight: 400, 
              lineHeight: 1.6,
              maxWidth: '680px',
              marginBottom: '32px'
            }}
          >
            The validation model uses a layered approach to validate interfaces, with clear boundaries between artifact validity and contract compliance.
          </motion.p>
        </motion.section>

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
            Layered Validation Model (L0–L3)
          </motion.h2>
          
          <div className="space-y-4">
            {layers.map((layer, idx) => (
              <motion.div 
                key={idx}
                variants={fadeVariants}
                className="pb-4"
                style={{ borderBottom: `1px solid ${colors.neutral[800]}` }}
              >
                <h3 style={{ 
                  fontSize: '13px', 
                  fontWeight: 400,
                  color: colors.neutral[0],
                  marginBottom: '4px'
                }}>
                  {layer.level} - {layer.name}
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
            E0–E3 Taxonomy
          </motion.h2>
          
          <div className="space-y-4">
            {errors.map((error, idx) => (
              <motion.div 
                key={idx}
                variants={fadeVariants}
                className="pb-4"
                style={{ borderBottom: `1px solid ${colors.neutral[800]}` }}
              >
                <h3 style={{ 
                  fontSize: '13px', 
                  fontWeight: 400,
                  color: colors.neutral[0],
                  marginBottom: '4px'
                }}>
                  {error.code} - {error.name}
                </h3>
                <p style={{ 
                  fontSize: '12px', 
                  fontWeight: 400,
                  color: colors.neutral[400],
                  fontFamily: 'Inter, sans-serif',
                  lineHeight: 1.5
                }}>
                  {error.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

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
            <h3 style={{ 
              fontSize: '13px', 
              fontWeight: 400,
              color: colors.neutral[0],
              marginBottom: '12px'
            }}>
              Boundary Rule
            </h3>
            <p style={{ 
              fontSize: '12px', 
              fontWeight: 400,
              color: colors.neutral[400],
              fontFamily: 'Inter, sans-serif',
              lineHeight: 1.5,
              margin: 0
            }}>
              Never report contract violations if artifact validity fails.
            </p>
          </motion.div>
        </motion.section>
      </div>
    </div>
  );
}
