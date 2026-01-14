'use client';

import { motion } from 'motion/react';
import Navigation from '@surfaces/ui/components/Navigation';
import { colors } from '@surfaces/ui/tokens/colors';
import { fadeVariants, staggerContainerFast } from '@surfaces/ui/utils/motion';

export default function Interfacectl() {
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
            interfacectl
          </motion.h1>
          
          <motion.p 
            variants={fadeVariants}
            style={{ 
              fontSize: '14px', 
              fontWeight: 400, 
              lineHeight: 1.6,
              maxWidth: '680px'
            }}
          >
            interfacectl is the command-line tool for validating, enforcing, and inspecting interface contracts.
          </motion.p>
        </motion.section>
      </div>
    </div>
  );
}
