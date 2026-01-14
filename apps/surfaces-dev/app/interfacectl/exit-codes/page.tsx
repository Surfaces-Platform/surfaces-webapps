'use client';

import { motion } from 'motion/react';
import Navigation from '@surfaces/ui/components/Navigation';
import { colors } from '@surfaces/ui/tokens/colors';
import { fadeVariants, staggerContainerFast } from '@surfaces/ui/utils/motion';

export default function ExitCodes() {
  const handleSurfaceChange = (surface: 'surfaces' | 'surfaceops' | 'interfacectl' | 'surfaces-dev') => {
    console.log('Surface change:', surface);
  };

  const exitCodes = [
    {
      code: '0',
      description: 'Valid - Interface conforms to contract'
    },
    {
      code: '10',
      description: 'Warning - Minor deviation detected'
    },
    {
      code: '20',
      description: 'Drift detected - Interface has diverged from definition'
    },
    {
      code: '30',
      description: 'Invalid - Contract violation detected'
    },
    {
      code: '40',
      description: 'Error - Configuration or I/O error'
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
          { label: 'Reference', href: '/reference/validation-boundaries' }
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
            Exit Codes
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
            interfacectl uses exit codes to signal validation results. v2 introduces a new exit code scheme for clearer error categorization.
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
            v1 vs v2 Behavior
          </motion.h2>
          
          <motion.div 
            variants={fadeVariants}
            style={{ 
              fontSize: '14px', 
              lineHeight: 1.6,
              maxWidth: '680px',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            <p style={{ marginBottom: '16px' }}>
              v1 used exit codes 0, 1, and 2 to represent success, violations, and errors respectively.
            </p>
            <p>
              v2 introduces a more granular exit code scheme (0, 10, 20, 30, 40) that distinguishes between different types of validation outcomes and errors.
            </p>
          </motion.div>
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
            v2 Exit Codes
          </motion.h2>
          
          <motion.div 
            variants={fadeVariants}
            className="p-6 rounded-[4px] mb-6"
            style={{ 
              backgroundColor: colors.neutral[800],
              border: `1px solid ${colors.neutral[600]}`
            }}
          >
            <table style={{ 
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.neutral[600]}` }}>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '8px 16px 8px 0',
                    fontWeight: 400,
                    color: colors.neutral[400]
                  }}>
                    Code
                  </th>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '8px 0',
                    fontWeight: 400,
                    color: colors.neutral[400]
                  }}>
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {exitCodes.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: idx < exitCodes.length - 1 ? `1px solid ${colors.neutral[800]}` : 'none' }}>
                    <td style={{ 
                      padding: '12px 16px 12px 0',
                      color: colors.neutral[0],
                      fontFamily: 'JetBrains Mono, monospace'
                    }}>
                      {item.code}
                    </td>
                    <td style={{ 
                      padding: '12px 0',
                      color: colors.neutral[400],
                      fontFamily: 'Inter, sans-serif'
                    }}>
                      {item.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </motion.section>
      </div>
    </div>
  );
}
