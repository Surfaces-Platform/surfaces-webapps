'use client';

import { motion } from 'motion/react';
import Navigation from '@surfaces/ui/components/Navigation';
import { colors } from '@surfaces/ui/tokens/colors';
import { fadeUpVariants, staggerContainer } from '@surfaces/ui/utils/motion';
import { SurfacesLogo } from '../../components/SurfacesLogo';

export default function BrandLogoPage() {
  const handleSurfaceChange = (surface: 'surfaces' | 'surfaceops' | 'interfacectl') => {
    console.log('Surface change:', surface);
  };

  return (
    <div 
      className="min-h-screen w-full"
      style={{ 
        backgroundColor: colors.neutral[50],
        fontFamily: 'var(--font-inter), Inter, sans-serif',
        color: colors.neutral[900]
      }}
    >
      <Navigation
        currentSurface="surfaces"
        currentContext={{
          contentType: 'docs',
          subject: undefined
        }}
        sections={[
          { label: 'Logo', href: '#logo' },
          { label: 'Sizes', href: '#sizes' },
          { label: 'Contexts', href: '#contexts' },
          { label: 'Intent', href: '#intent' }
        ]}
        utilities={[
          { label: 'GitHub', href: '#github' },
          { label: 'Docs', href: '#docs' }
        ]}
        theme="light"
        onSurfaceChange={handleSurfaceChange}
      />

      <div className="contract-container">
        {/* Hero Section - Interface Contract Required */}
        <motion.section 
          data-contract-section="landing.hero"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="pt-32 pb-16"
          id="logo"
        >
          <motion.div 
            variants={fadeUpVariants}
            className="mb-8 inline-flex p-3"
            style={{ 
              backgroundColor: colors.neutral[0],
              border: `1px solid ${colors.neutral[200]}`
            }}
          >
            <SurfacesLogo size={24} />
          </motion.div>

          <motion.h1 
            variants={fadeUpVariants}
            style={{ 
              fontSize: '32px', 
              fontWeight: 600, 
              lineHeight: 1.2, 
              marginBottom: '16px',
              maxWidth: '720px'
            }}
          >
            Surfaces Platform Logo Usage
          </motion.h1>
          
          <motion.p 
            variants={fadeUpVariants}
            style={{ 
              fontSize: '14px', 
              fontWeight: 400, 
              lineHeight: 1.6,
              marginBottom: '32px',
              maxWidth: '600px',
              color: colors.neutral[600]
            }}
          >
            Governance documentation for logo integrity, technical specifications, and prohibited modifications
          </motion.p>
        </motion.section>

        {/* Canonical Logo */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-16"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <motion.h2 
            variants={fadeUpVariants}
            style={{ 
              fontSize: '12px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '24px',
              color: colors.neutral[900]
            }}
          >
            Canonical Logo
          </motion.h2>
          
          <motion.div 
            variants={fadeUpVariants}
            className="inline-flex p-8"
            style={{ 
              backgroundColor: colors.neutral[0],
              border: `1px solid ${colors.neutral[200]}`
            }}
          >
            <SurfacesLogo size={24} />
          </motion.div>
          
          <motion.div 
            variants={fadeUpVariants}
            className="mt-6"
            style={{ 
              fontSize: '12px',
              lineHeight: 1.6,
              maxWidth: '800px',
              color: colors.neutral[600]
            }}
          >
            This is the Surfaces Platform logo at minimum approved size (24×24 pixels). 
            The logo is a <strong>fixed invariant</strong>—it does not adapt to context. 
            Context adapts around it.
          </motion.div>
        </motion.section>

        {/* Global Invariant Statement */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUpVariants}
          className="py-16"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <div 
            className="p-6"
            style={{ 
              backgroundColor: colors.neutral[900],
              color: colors.neutral[0],
              maxWidth: '800px'
            }}
          >
            <div style={{ 
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: 1.75
            }}>
              The Surfaces logo is a fixed geometric invariant. It does not adapt to context, theme, or background.
            </div>
          </div>
        </motion.section>

        {/* Guidance Section - Interface Contract Required */}
        <motion.section 
          data-contract-section="landing.guidance"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-16"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
          id="sizes"
        >
          <motion.h2 
            variants={fadeUpVariants}
            style={{ 
              fontSize: '12px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '24px',
              color: colors.neutral[900]
            }}
          >
            Approved Sizes
          </motion.h2>
          
          <motion.div 
            variants={fadeUpVariants}
            className="mb-6"
            style={{ 
              fontSize: '12px',
              lineHeight: 1.6,
              maxWidth: '800px',
              color: colors.neutral[600]
            }}
          >
            The logo may be scaled uniformly. Minimum size is 16×16 pixels. Below this threshold, the logo <strong>must not appear in any form</strong>. 
            Do not introduce substitutes, simplified marks, or collapsed versions.
          </motion.div>

          <motion.div 
            variants={fadeUpVariants}
            className="flex items-end gap-8 flex-wrap"
          >
            {[
              { size: 16, label: '16×16 (minimum)', padding: '16px' },
              { size: 24, label: '24×24 (preferred min)', padding: '16px' },
              { size: 32, label: '32×32', padding: '24px' },
              { size: 48, label: '48×48', padding: '32px' },
              { size: 64, label: '64×64', padding: '40px' },
              { size: 96, label: '96×96', padding: '48px' }
            ].map((item) => (
              <div key={item.size}>
                <div 
                  className="mb-3 inline-flex"
                  style={{ 
                    padding: item.padding,
                    backgroundColor: colors.neutral[0],
                    border: `1px solid ${colors.neutral[200]}`
                  }}
                >
                  <SurfacesLogo size={item.size} />
                </div>
                <div style={{ fontSize: '12px', color: colors.neutral[500] }}>
                  {item.label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.section>

        {/* Background Contexts */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-16"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
          id="contexts"
        >
          <motion.h2 
            variants={fadeUpVariants}
            style={{ 
              fontSize: '12px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '24px',
              color: colors.neutral[900]
            }}
          >
            Background Contexts
          </motion.h2>
          
          <motion.div 
            variants={fadeUpVariants}
            className="mb-6"
            style={{ 
              fontSize: '12px',
              lineHeight: 1.6,
              maxWidth: '800px',
              color: colors.neutral[600]
            }}
          >
            The logo appears <strong>identically</strong> on all backgrounds. It is not inverted, recolored, or modified for dark mode. 
            If contrast is insufficient, adjust the background or add a contrasting container—never alter the logo.
          </motion.div>

          <motion.div variants={fadeUpVariants} className="space-y-8">
            {/* Light backgrounds */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px', color: colors.neutral[900] }}>
                Light Backgrounds
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { bg: colors.neutral[0], label: 'White' },
                  { bg: colors.neutral[50], label: 'Gray 50' },
                  { bg: colors.neutral[100], label: 'Gray 100' },
                  { bg: '#EFF6FF', label: 'Blue 50' }
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div 
                      className="p-6 inline-flex mb-2"
                      style={{ 
                        backgroundColor: item.bg,
                        border: `1px solid ${colors.neutral[200]}`
                      }}
                    >
                      <SurfacesLogo size={48} />
                    </div>
                    <div style={{ fontSize: '12px', color: colors.neutral[500] }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dark backgrounds */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px', color: colors.neutral[900] }}>
                Dark Backgrounds
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { bg: colors.neutral[800], label: 'Gray 800' },
                  { bg: colors.neutral[900], label: 'Gray 900' },
                  { bg: '#000000', label: 'Black' },
                  { bg: '#172554', label: 'Blue 950' }
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div 
                      className="p-6 inline-flex mb-2"
                      style={{ 
                        backgroundColor: item.bg,
                        border: `1px solid ${colors.neutral[600] || colors.neutral[800]}`
                      }}
                    >
                      <SurfacesLogo size={48} />
                    </div>
                    <div style={{ fontSize: '12px', color: colors.neutral[500] }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div 
            variants={fadeUpVariants}
            className="mt-6 p-4"
            style={{ 
              backgroundColor: '#FFFBEB',
              border: `1px solid #FCD34D`,
              maxWidth: '800px'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: '#92400E' }}>
              Note on dark backgrounds:
            </div>
            <div style={{ fontSize: '12px', color: '#78350F' }}>
              The logo maintains a fixed black-and-white construction and does not adapt for dark mode. Reduced contrast on dark backgrounds is expected and acceptable. If visibility is critical, adjust the background or introduce a contrasting container—never alter the logo.
            </div>
          </motion.div>

          <motion.div 
            variants={fadeUpVariants}
            className="mt-6 p-4"
            style={{ 
              borderLeft: `4px solid ${colors.neutral[900]}`,
              backgroundColor: colors.neutral[50],
              maxWidth: '800px'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: colors.neutral[900] }}>
              Do not:
            </div>
            <ul style={{ fontSize: '12px', color: colors.neutral[600], listStyle: 'none', padding: 0, margin: 0 }}>
              <li>– Invert the logo</li>
              <li>– Recolor the logo</li>
              <li>– Outline or inline the logo</li>
              <li>– Mask, crop, or place the logo inside another shape</li>
              <li>– Restyle the logo to improve contrast</li>
            </ul>
          </motion.div>
        </motion.section>

        {/* Usage Examples */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-16"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
        >
          <motion.h2 
            variants={fadeUpVariants}
            style={{ 
              fontSize: '12px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '24px',
              color: colors.neutral[900]
            }}
          >
            Contextual Examples
          </motion.h2>
          
          <motion.div variants={fadeUpVariants} className="space-y-6">
            {/* Website header */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: colors.neutral[900] }}>
                Website Header (Light)
              </div>
              <div 
                className="p-4 flex items-center gap-3"
                style={{ 
                  backgroundColor: colors.neutral[0],
                  border: `1px solid ${colors.neutral[200]}`
                }}
              >
                <SurfacesLogo size={32} />
                <div style={{ fontSize: '14px', fontWeight: 600 }}>Surfaces Platform</div>
                <div className="ml-auto" style={{ fontSize: '12px', color: colors.neutral[600] }}>Documentation</div>
              </div>
            </div>

            {/* Dashboard header */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: colors.neutral[900] }}>
                Dashboard Header (Dark)
              </div>
              <div 
                className="p-4 flex items-center gap-3"
                style={{ 
                  backgroundColor: colors.neutral[900],
                  border: `1px solid ${colors.neutral[600] || colors.neutral[800]}`
                }}
              >
                <SurfacesLogo size={32} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: colors.neutral[0] }}>Surfaces Platform</div>
                <div className="ml-auto" style={{ fontSize: '12px', color: colors.neutral[400] }}>Admin Panel</div>
              </div>
            </div>

            {/* GitHub profile */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: colors.neutral[900] }}>
                GitHub Repository Profile
              </div>
              <div 
                className="p-6 inline-flex flex-col items-center gap-2"
                style={{ 
                  backgroundColor: colors.neutral[0],
                  border: `1px solid ${colors.neutral[200]}`
                }}
              >
                <SurfacesLogo size={64} />
                <div style={{ fontSize: '14px', fontWeight: 600 }}>surfaces-platform</div>
                <div style={{ fontSize: '12px', color: colors.neutral[600] }}>Design system enforcement</div>
              </div>
            </div>

            {/* Favicon sizes */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: colors.neutral[900] }}>
                Favicon / App Icon Sizes
              </div>
              <div className="flex items-end gap-6">
                {[16, 32, 48].map((size) => (
                  <div key={size} className="text-center">
                    <div 
                      className="mb-2 inline-flex"
                      style={{ 
                        padding: size === 48 ? '12px' : '8px',
                        backgroundColor: colors.neutral[0],
                        border: `1px solid ${colors.neutral[200]}`
                      }}
                    >
                      <SurfacesLogo size={size} />
                    </div>
                    <div style={{ fontSize: '12px', color: colors.neutral[500] }}>{size}×{size}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Marketing card */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: colors.neutral[900] }}>
                Marketing Card
              </div>
              <div 
                className="p-8"
                style={{ 
                  background: `linear-gradient(to bottom right, ${colors.neutral[50]}, ${colors.neutral[100]})`,
                  border: `1px solid ${colors.neutral[200]}`,
                  maxWidth: '384px'
                }}
              >
                <SurfacesLogo size={48} className="mb-4" />
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>Surfaces Platform</div>
                <div style={{ fontSize: '12px', color: colors.neutral[600] }}>
                  Infrastructure-grade design system enforcement. One logo, all contexts.
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Intent & Enforcement */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-16"
          style={{ borderTop: `1px solid ${colors.neutral[200]}` }}
          id="intent"
        >
          <motion.h2 
            variants={fadeUpVariants}
            style={{ 
              fontSize: '12px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '24px',
              color: colors.neutral[900]
            }}
          >
            Intent & Enforcement
          </motion.h2>
          
          <motion.div 
            variants={fadeUpVariants}
            className="space-y-4"
            style={{ fontSize: '12px', lineHeight: 1.6, maxWidth: '800px', color: colors.neutral[600] }}
          >
            <div>
              <div style={{ fontWeight: 500, marginBottom: '8px', color: colors.neutral[900] }}>
                Design Intent
              </div>
              <div style={{ color: colors.neutral[600] }}>
                The Surfaces Platform logo is a <strong>fixed invariant</strong>. It does not adapt to context—context 
                adapts around it. This constraint is deliberate and essential to the brand identity. 
                The logo represents infrastructure-grade stability: unchanging, predictable, and authoritative.
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 500, marginBottom: '8px', color: colors.neutral[900] }}>
                Why These Rules Exist
              </div>
              <div style={{ color: colors.neutral[600] }}>
                Surfaces Platform enforces design system constraints. The logo itself must embody this principle 
                by remaining visually consistent across all contexts. Allowing modifications would undermine the 
                platform's core value proposition: strict, predictable enforcement.
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 500, marginBottom: '8px', color: colors.neutral[900] }}>
                Governance, Not Flexibility
              </div>
              <div style={{ color: colors.neutral[600] }}>
                These rules prioritize <strong>recognition and consistency</strong> over aesthetic flexibility. 
                The logo's opacity-based depth and grayscale palette are structural, not stylistic. 
                They communicate layered enforcement of design rules—a concept that cannot be preserved 
                through recoloring or simplification.
              </div>
            </div>

            <div 
              className="mt-6 p-4"
              style={{ 
                backgroundColor: colors.neutral[900],
                color: colors.neutral[0]
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>One-sentence summary:</div>
              <div style={{ fontStyle: 'italic' }}>
                "The Surfaces logo is immutable geometry in immutable color—it appears identically in all contexts, 
                and all modifications except uniform scaling are prohibited."
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Actions Section - Interface Contract Required */}
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
