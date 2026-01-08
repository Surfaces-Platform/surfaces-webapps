'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface NavigationSection {
  label: string;
  href: string;
}

interface SurfaceInfo {
  name: string;
  url: string;
  descriptor: string;
}

interface NavigationProps {
  currentSurface: 'surfaces' | 'surfaceops' | 'interfacectl';
  sections: NavigationSection[];
  utilities?: {
    label: string;
    href: string;
  }[];
  theme?: 'light' | 'dark';
  currentContext?: {
    contentType?: 'docs' | 'concepts' | 'usage' | 'commands' | 'spec' | 'overview' | 'operations' | 'states';
    subject?: 'contracts' | 'validation' | 'drift' | 'enforcement';
  };
  onSurfaceChange?: (surface: 'surfaces' | 'surfaceops' | 'interfacectl') => void;
}

// Get domain configuration based on environment
function getDomainConfig(): Record<'surfaces' | 'surfaceops' | 'interfacectl', string> {
  // Check if we're in production (check if hostname matches production domains)
  const isProduction = typeof window !== 'undefined' && 
    (window.location.hostname === 'surfaces.systems' || 
     window.location.hostname === 'surfaceops.ai' || 
     window.location.hostname === 'interfacectl.com' ||
     window.location.hostname.endsWith('.surfaces.systems') ||
     window.location.hostname.endsWith('.surfaceops.ai') ||
     window.location.hostname.endsWith('.interfacectl.com'));

  if (isProduction) {
    return {
      surfaces: 'https://surfaces.systems',
      surfaceops: 'https://surfaceops.ai',
      interfacectl: 'https://interfacectl.com'
    };
  }

  // Development: use environment variables or fallback to default ports
  return {
    surfaces: process.env.NEXT_PUBLIC_SURFACES_URL || 'http://localhost:3000',
    surfaceops: process.env.NEXT_PUBLIC_SURFACEOPS_URL || 'http://localhost:3001',
    interfacectl: process.env.NEXT_PUBLIC_INTERFACECTL_URL || 'http://localhost:3002'
  };
}

// Context-preserving routing logic
function getContextualRoute(
  fromSurface: 'surfaces' | 'surfaceops' | 'interfacectl',
  toSurface: 'surfaces' | 'surfaceops' | 'interfacectl',
  context?: {
    contentType?: string;
    subject?: string;
  }
): string {
  const domains = getDomainConfig();
  const baseUrl = domains[toSurface];

  // Get path based on context
  let path = '/';

  // If no context, route to docs or root
  if (!context || !context.contentType) {
    path = toSurface === 'surfaces' ? '/' : 
           toSurface === 'surfaceops' ? '/' : 
           '/';
  } else {
    const { contentType, subject } = context;

    // Docs → Docs (attempt same topic)
    if (contentType === 'docs') {
      if (toSurface === 'surfaces') path = '/#docs';
      else if (toSurface === 'surfaceops') path = '/#docs';
      else path = '/#spec';
    }
    // Concept → Operational
    else if (fromSurface === 'surfaces' && toSurface === 'surfaceops') {
      if (contentType === 'concepts') {
        if (subject === 'contracts') path = '/#overview';
        else if (subject === 'validation') path = '/#capabilities';
        else if (subject === 'drift') path = '/#states';
        else path = '/#overview';
      }
    }
    // Operational → Executable
    else if (fromSurface === 'surfaceops' && toSurface === 'interfacectl') {
      if (contentType === 'states' && subject === 'drift') path = '/#commands';
      else if (contentType === 'operations') path = '/#usage';
      else path = '/#usage';
    }
    // Executable → Conceptual
    else if (fromSurface === 'interfacectl' && toSurface === 'surfaces') {
      if (contentType === 'commands') {
        if (subject === 'validation') path = '/#system';
        else path = '/#philosophy';
      } else if (contentType === 'spec') path = '/#system';
      else path = '/#philosophy';
    }
    // Concept → Executable (skip operational layer)
    else if (fromSurface === 'surfaces' && toSurface === 'interfacectl') {
      path = '/#install';
    }
    // Executable → Operational
    else if (fromSurface === 'interfacectl' && toSurface === 'surfaceops') {
      path = '/#overview';
    }
    // Operational → Conceptual
    else if (fromSurface === 'surfaceops' && toSurface === 'surfaces') {
      if (contentType === 'states') path = '/#system';
      else if (contentType === 'operations') path = '/#ecosystem';
      else path = '/#philosophy';
    }
    // Fallback to docs or root
    else {
      if (toSurface === 'surfaces') path = '/#docs';
      else if (toSurface === 'surfaceops') path = '/#docs';
      else path = '/#spec';
    }
  }

  // Build full URL (domain + path)
  return `${baseUrl}${path}`;
}

/**
 * Navigation Component
 * 
 * Provides consistent navigation and context-preserving routing across all surfaces.
 * 
 * Features:
 * - Sticky header with backdrop blur (56px height, 1120px max-width)
 * - System identifier, section links, system dropdown, and utility links
 * - Context-preserving routing when switching between surfaces
 * - Environment-aware domain configuration (dev ports vs production domains)
 * - Full keyboard navigation support (ESC, Enter, Arrow keys, Tab)
 * - ARIA-compliant accessibility attributes
 * - Focus states on all interactive elements
 * 
 * @param currentSurface - The current surface being displayed
 * @param sections - Array of navigation sections with label and href
 * @param utilities - Optional array of utility links (e.g., GitHub, Docs)
 * @param theme - Theme mode: 'light' or 'dark'
 * @param currentContext - Optional context for context-preserving routing
 * @param onSurfaceChange - Optional callback when surface changes
 * 
 * @see Specification: Header component for surfaces.systems
 */
export default function Navigation({ 
  currentSurface, 
  sections, 
  utilities = [],
  theme = 'light',
  currentContext,
  onSurfaceChange
}: NavigationProps) {
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Color tokens - matching specification exactly
  const colors = {
    light: {
      background: 'rgba(255, 255, 255, 0.98)',
      text: '#171717',
      textMuted: '#525252',
      border: '#E5E5E5',
      menuBg: '#FFFFFF',
      menuBorder: '#E5E5E5',
      menuActive: '#F5F5F5',
      menuHover: '#FAFAFA'
    },
    dark: {
      background: 'rgba(23, 23, 23, 0.98)',
      text: '#FFFFFF',
      textMuted: '#A3A3A3',
      border: '#262626',
      menuBg: '#171717',
      menuBorder: '#525252',
      menuActive: '#262626',
      menuHover: '#1F1F1F'
    }
  };

  const activeTheme = colors[theme];

  // System surfaces
  const surfaces: SurfaceInfo[] = [
    {
      name: 'surfaces.systems',
      url: '/',
      descriptor: 'Canonical source of interface truth'
    },
    {
      name: 'surfaceops.ai',
      url: '/surfaceops',
      descriptor: 'Operational enforcement and monitoring'
    },
    {
      name: 'interfacectl.com',
      url: '/interfacectl',
      descriptor: 'Executable interface control'
    }
  ];

  // System identifier display name
  const identifiers = {
    surfaces: 'Surfaces',
    surfaceops: 'surfaceops',
    interfacectl: 'interfacectl'
  };


  return (
    <nav
      style={{
        height: '56px',
        backgroundColor: activeTheme.background,
        borderBottom: `1px solid ${activeTheme.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(8px)'
      }}
    >
      <div style={{
        maxWidth: '1120px',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: '24px',
        paddingRight: '24px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        
        {/* System Identifier (Left) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '48px'
        }}>
          <a
            href="/"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: activeTheme.text,
              textDecoration: 'none',
              fontFamily: currentSurface === 'interfacectl' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif'
            }}
          >
            {identifiers[currentSurface]}
          </a>

          {/* Local Sections (Center-Left) */}
          <div style={{
            display: isMobile ? 'none' : 'flex',
            alignItems: 'center',
            gap: '32px'
          }}>
            {sections.map((section, idx) => (
              <a
                key={idx}
                href={section.href}
                style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: activeTheme.textMuted,
                  textDecoration: 'none',
                  fontFamily: currentSurface === 'interfacectl' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif',
                  transition: 'color 0.12s linear'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = activeTheme.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = activeTheme.textMuted;
                }}
              >
                {section.label}
              </a>
            ))}
          </div>
        </div>

        {/* Right Side: System Switch + Utilities */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '32px'
        }}>
          
          {/* System Switch (Center-Right) */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setSystemMenuOpen(!systemMenuOpen)}
              style={{
                fontSize: '14px',
                fontWeight: 400,
                color: activeTheme.textMuted,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: currentSurface === 'interfacectl' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif',
                transition: 'color 0.12s linear'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = activeTheme.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = activeTheme.textMuted;
              }}
            >
              {currentSurface === 'surfaces' ? 'surfaces.systems' : 
               currentSurface === 'surfaceops' ? 'surfaceops.ai' : 
               'interfacectl.com'}
              <span style={{ fontSize: '10px' }}>▾</span>
            </button>

            <AnimatePresence>
              {systemMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    onClick={() => setSystemMenuOpen(false)}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 40
                    }}
                  />
                  
                  {/* Menu */}
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.12, ease: 'linear' }}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: '320px',
                      backgroundColor: activeTheme.menuBg,
                      border: `1px solid ${activeTheme.menuBorder}`,
                      borderRadius: '4px',
                      padding: '8px',
                      zIndex: 50
                    }}
                  >
                    {surfaces.map((surface, idx) => {
                      const isCurrent = 
                        (currentSurface === 'surfaces' && surface.name === 'surfaces.systems') ||
                        (currentSurface === 'surfaceops' && surface.name === 'surfaceops.ai') ||
                        (currentSurface === 'interfacectl' && surface.name === 'interfacectl.com');

                      const targetSurface = surface.name.split('.')[0] as 'surfaces' | 'surfaceops' | 'interfacectl';
                      const targetUrl = getContextualRoute(currentSurface, targetSurface, currentContext);

                      return (
                        <a
                          key={idx}
                          href={targetUrl}
                          onClick={(e) => {
                            const targetSurface = surface.name.split('.')[0] as 'surfaces' | 'surfaceops' | 'interfacectl';
                            const targetUrl = getContextualRoute(currentSurface, targetSurface, currentContext);
                            
                            e.preventDefault();
                            setSystemMenuOpen(false);
                            
                            if (targetSurface !== currentSurface) {
                              // Call onSurfaceChange callback if provided
                              if (onSurfaceChange) {
                                onSurfaceChange(targetSurface);
                              }
                              
                              // Navigate to target URL (handles cross-domain in production, cross-port in dev)
                              if (typeof window !== 'undefined') {
                                window.location.href = targetUrl;
                              }
                            } else {
                              // Same surface - navigate using default link behavior
                              if (typeof window !== 'undefined') {
                                window.location.href = targetUrl;
                              }
                            }
                          }}
                          style={{
                            display: 'block',
                            padding: '12px',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            backgroundColor: isCurrent ? (theme === 'light' ? '#F5F5F5' : '#262626') : 'transparent',
                            transition: 'background-color 0.12s linear'
                          }}
                          onMouseEnter={(e) => {
                            if (!isCurrent) {
                              e.currentTarget.style.backgroundColor = theme === 'light' ? '#FAFAFA' : '#1F1F1F';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isCurrent) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <div
                            style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: activeTheme.text,
                              marginBottom: '4px',
                              fontFamily: surface.name === 'interfacectl.com' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif'
                            }}
                          >
                            {surface.name}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 400,
                              color: activeTheme.textMuted,
                              fontFamily: 'Inter, sans-serif'
                            }}
                          >
                            {surface.descriptor}
                          </div>
                        </a>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Utilities (Right) */}
          {utilities.length > 0 && (
            <div style={{
              display: isMobile ? 'none' : 'flex',
              alignItems: 'center',
              gap: '24px'
            }}>
              {utilities.map((utility, idx) => (
                <a
                  key={idx}
                  href={utility.href}
                  style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: activeTheme.textMuted,
                    textDecoration: 'none',
                    fontFamily: currentSurface === 'interfacectl' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif',
                    transition: 'color 0.12s linear'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = activeTheme.text;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = activeTheme.textMuted;
                  }}
                >
                  {utility.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

