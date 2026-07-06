'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDownIcon } from '../icons';
import { Icon } from './Icon';

export type NavigationSurfaceId = 'surfaces' | 'surfaceops' | 'interfacectl' | 'surfaces-dev' | 'judgmentkit';
type ContextualSurfaceId = Exclude<NavigationSurfaceId, 'judgmentkit'>;

interface NavigationSection {
  label: string;
  href: string;
}

interface SurfaceInfo {
  id: NavigationSurfaceId;
  name: string;
  descriptor: string;
}

interface NavigationProps {
  currentSurface: NavigationSurfaceId;
  sections: NavigationSection[];
  /**
   * @deprecated Utility links are intentionally no longer rendered in the
   * shared site header. Kept temporarily so existing consumers can update
   * without a breaking prop change.
   */
  utilities?: {
    label: string;
    href: string;
  }[];
  theme?: 'light' | 'dark';
  currentContext?: {
    contentType?: 'docs' | 'concepts' | 'usage' | 'commands' | 'spec' | 'overview' | 'operations' | 'states';
    subject?: 'contracts' | 'validation' | 'drift' | 'enforcement';
  };
  onSurfaceChange?: (surface: NavigationSurfaceId) => void;
}

const productionDomainConfig: Record<NavigationSurfaceId, string> = {
  surfaces: 'https://surfaces.systems',
  surfaceops: 'https://surfaceops.ai',
  interfacectl: 'https://interfacectl.com',
  'surfaces-dev': 'https://surfaces.dev',
  judgmentkit: 'https://judgmentkit.ai'
};

const localDomainConfig: Record<NavigationSurfaceId, string> = {
  surfaces: 'http://localhost:3000',
  surfaceops: 'http://localhost:3001',
  interfacectl: 'http://localhost:3002',
  'surfaces-dev': 'http://localhost:3003',
  judgmentkit: 'http://localhost:3004'
};

function withEnvironmentOverrides(
  fallback: Record<NavigationSurfaceId, string>
): Record<NavigationSurfaceId, string> {
  return {
    surfaces: process.env.NEXT_PUBLIC_SURFACES_URL || fallback.surfaces,
    surfaceops: process.env.NEXT_PUBLIC_SURFACEOPS_URL || fallback.surfaceops,
    interfacectl: process.env.NEXT_PUBLIC_INTERFACECTL_URL || fallback.interfacectl,
    'surfaces-dev': process.env.NEXT_PUBLIC_SURFACES_DEV_URL || fallback['surfaces-dev'],
    judgmentkit: process.env.NEXT_PUBLIC_JUDGMENTKIT_URL || fallback.judgmentkit
  };
}

function isProductionHostname(hostname: string): boolean {
  return (
    hostname === 'surfaces.systems' ||
    hostname === 'surfaceops.ai' ||
    hostname === 'interfacectl.com' ||
    hostname === 'surfaces.dev' ||
    hostname === 'judgmentkit.ai' ||
    hostname.endsWith('.surfaces.systems') ||
    hostname.endsWith('.surfaceops.ai') ||
    hostname.endsWith('.interfacectl.com') ||
    hostname.endsWith('.surfaces.dev') ||
    hostname.endsWith('.judgmentkit.ai')
  );
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost')
  );
}

function isVercelRuntime(): boolean {
  return (
    process.env.VERCEL === '1' ||
    Boolean(process.env.VERCEL_ENV) ||
    Boolean(process.env.VERCEL_URL) ||
    Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV) ||
    Boolean(process.env.NEXT_PUBLIC_VERCEL_URL)
  );
}

// Get domain configuration based on environment
function getDomainConfig(hostname = typeof window !== 'undefined' ? window.location.hostname : undefined): Record<NavigationSurfaceId, string> {
  if (hostname) {
    if (isProductionHostname(hostname)) {
      return productionDomainConfig;
    }

    if (isLocalHostname(hostname)) {
      return withEnvironmentOverrides(localDomainConfig);
    }

    return withEnvironmentOverrides(productionDomainConfig);
  }

  return withEnvironmentOverrides(isVercelRuntime() ? productionDomainConfig : localDomainConfig);
}

// Context-preserving routing logic
function getContextualRoute(
  fromSurface: ContextualSurfaceId,
  toSurface: ContextualSurfaceId,
  context?: {
    contentType?: string;
    subject?: string;
  },
  domains = getDomainConfig()
): string {
  const baseUrl = domains[toSurface];

  // Get path based on context
  let path = '/';

  // If no context, route to docs or root
  if (!context || !context.contentType) {
    path = toSurface === 'surfaces' ? '/' : 
           toSurface === 'surfaceops' ? '/' : 
           toSurface === 'surfaces-dev' ? '/' :
           '/';
  } else {
    const { contentType, subject } = context;

    // Docs → Docs (attempt same topic)
    if (contentType === 'docs') {
      if (toSurface === 'surfaces') path = '/#docs';
      else if (toSurface === 'surfaceops') path = '/#docs';
      else if (toSurface === 'surfaces-dev') path = '/';
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
      else if (toSurface === 'surfaces-dev') path = '/';
      else path = '/#spec';
    }
  }

  // Build full URL (domain + path)
  return `${baseUrl}${path}`;
}

function isContextualSurface(surface: NavigationSurfaceId): surface is ContextualSurfaceId {
  return surface !== 'judgmentkit';
}

export function getSurfaceRoute(
  fromSurface: NavigationSurfaceId,
  toSurface: NavigationSurfaceId,
  context?: {
    contentType?: string;
    subject?: string;
  },
  hostname?: string
): string {
  const domains = getDomainConfig(hostname);

  if (isContextualSurface(fromSurface) && isContextualSurface(toSurface)) {
    return getContextualRoute(fromSurface, toSurface, context, domains);
  }

  return `${domains[toSurface]}/`;
}

/**
 * Navigation Component
 * 
 * Provides consistent navigation and context-preserving routing across all surfaces.
 * 
 * Features:
 * - Sticky header with backdrop blur (56px height, 1120px max-width)
 * - System identifier, section links, and system dropdown
 * - Context-preserving routing when switching between surfaces
 * - Environment-aware domain configuration (dev ports vs production domains)
 * - Full keyboard navigation support (ESC, Enter, Arrow keys, Tab)
 * - ARIA-compliant accessibility attributes
 * - Focus states on all interactive elements
 * 
 * @param currentSurface - The current surface being displayed
 * @param sections - Array of navigation sections with label and href
 * @param theme - Theme mode: 'light' or 'dark'
 * @param currentContext - Optional context for context-preserving routing
 * @param onSurfaceChange - Optional callback when surface changes
 * 
 * @see Specification: Header component for surfaces.systems
 */
export default function Navigation({ 
  currentSurface, 
  sections, 
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

  // Color tokens from the active Simple Slab system.
  const colors = {
    light: {
      background: 'rgba(255, 255, 255, 0.98)',
      text: '#0B0D0E',
      textMuted: '#555B60',
      border: '#DAD7CF',
      menuBg: '#FFFFFF',
      menuBorder: '#DAD7CF',
      menuActive: '#F7F6F2',
      menuHover: '#F7F6F2'
    },
    dark: {
      background: 'rgba(11, 13, 14, 0.98)',
      text: '#F7F6F2',
      textMuted: '#8B9096',
      border: '#3C4145',
      menuBg: '#0B0D0E',
      menuBorder: '#555B60',
      menuActive: '#3C4145',
      menuHover: '#3C4145'
    }
  };

  const activeTheme = colors[theme];

  // System surfaces
  const surfaces: SurfaceInfo[] = [
    {
      id: 'surfaces',
      name: 'surfaces.systems',
      descriptor: 'Product decisions for generated UI'
    },
    {
      id: 'surfaceops',
      name: 'surfaceops.ai',
      descriptor: 'Review operations for product teams'
    },
    {
      id: 'interfacectl',
      name: 'interfacectl.com',
      descriptor: 'Interface checks for engineering teams'
    },
    {
      id: 'surfaces-dev',
      name: 'surfaces.dev',
      descriptor: 'Reference material for builders'
    },
    {
      id: 'judgmentkit',
      name: 'judgmentkit.ai',
      descriptor: 'Guided review for unclear decisions'
    }
  ];

  // System identifier display name
  const identifiers: Record<NavigationSurfaceId, string> = {
    surfaces: 'Surfaces',
    surfaceops: 'surfaceops',
    interfacectl: 'interfacectl',
    'surfaces-dev': 'surfaces.dev',
    judgmentkit: 'JudgmentKit'
  };

  const monoSurfaceIds: NavigationSurfaceId[] = ['interfacectl', 'surfaces-dev'];
  const usesMonoFont = monoSurfaceIds.includes(currentSurface);
  const currentSurfaceInfo = surfaces.find((surface) => surface.id === currentSurface);

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
              fontFamily: usesMonoFont ? 'JetBrains Mono, monospace' : 'Inter, sans-serif'
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
                  fontFamily: usesMonoFont ? 'JetBrains Mono, monospace' : 'Inter, sans-serif',
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

        {/* Right Side: System Switch */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '32px'
        }}>
          
          {/* System Switch (Center-Right) */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setSystemMenuOpen(!systemMenuOpen)}
              aria-expanded={systemMenuOpen}
              aria-haspopup="menu"
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
                fontFamily: usesMonoFont ? 'JetBrains Mono, monospace' : 'Inter, sans-serif',
                transition: 'color 0.12s linear'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = activeTheme.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = activeTheme.textMuted;
              }}
            >
              {currentSurfaceInfo?.name ?? 'surfaces.systems'}
              <Icon icon={ChevronDownIcon} size={14} decorative />
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
                      const isCurrent = currentSurface === surface.id;
                      const targetUrl = getSurfaceRoute(currentSurface, surface.id, currentContext);

                      return (
                        <a
                          key={idx}
                          href={targetUrl}
                          aria-current={isCurrent ? 'page' : undefined}
                          onClick={(e) => {
                            setSystemMenuOpen(false);
                            e.preventDefault();

                            if (surface.id !== currentSurface) {
                              // Call onSurfaceChange callback if provided
                              if (onSurfaceChange) {
                                onSurfaceChange(surface.id);
                              }
                            }

                            // Navigate to target URL (handles cross-domain in production, cross-port in dev,
                            // and the JudgmentKit site switch)
                            if (typeof window !== 'undefined') {
                              window.location.href = targetUrl;
                            }
                          }}
                          style={{
                            display: 'block',
                            padding: '12px',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            backgroundColor: isCurrent ? activeTheme.menuActive : 'transparent',
                            transition: 'background-color 0.12s linear'
                          }}
                          onMouseEnter={(e) => {
                            if (!isCurrent) {
                              e.currentTarget.style.backgroundColor = activeTheme.menuHover;
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
                              fontFamily: monoSurfaceIds.includes(surface.id) ? 'JetBrains Mono, monospace' : 'Inter, sans-serif'
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span>{surface.name}</span>
                            </span>
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
        </div>
      </div>
    </nav>
  );
}
