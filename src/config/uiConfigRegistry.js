/**
 * UI Configuration Registry
 * Phase 19A — UI Configuration Engine Foundation
 * 
 * THE SINGLE SOURCE OF TRUTH for all editable UI values.
 * 
 * Defines:
 * - Token categories (spacing, colors, radius, typography, motion, density, shadows)
 * - Allowed keys per category
 * - Validation rules (min, max, allowed values)
 * - Default values
 * - Panel scopes (global, worker, client, admin, auth, chat)
 */

const UI_CONFIG_REGISTRY = {
  // ─── VERSION ──────────────────────────────────────────────────
  version: '19.0',
  
  // ─── PANEL SCOPES ─────────────────────────────────────────────
  scopes: ['global', 'worker', 'client', 'admin', 'auth', 'chat'],

  // ─── TOKEN CATEGORIES ─────────────────────────────────────────
  tokenCategories: {
    spacing: {
      label: 'Spacing',
      description: 'Padding, margin, and gap values',
      cssVariablePrefix: '--spacing',
      tokens: {
        xs: {
          label: 'Extra Small',
          defaultValue: '4px',
          type: 'px',
          min: 0,
          max: 12,
          step: 1,
        },
        sm: {
          label: 'Small',
          defaultValue: '8px',
          type: 'px',
          min: 4,
          max: 16,
          step: 1,
        },
        md: {
          label: 'Medium',
          defaultValue: '16px',
          type: 'px',
          min: 8,
          max: 32,
          step: 2,
        },
        lg: {
          label: 'Large',
          defaultValue: '24px',
          type: 'px',
          min: 16,
          max: 48,
          step: 4,
        },
        xl: {
          label: 'Extra Large',
          defaultValue: '32px',
          type: 'px',
          min: 24,
          max: 64,
          step: 4,
        },
      },
    },

    radius: {
      label: 'Border Radius',
      description: 'Corner rounding for cards, buttons, inputs',
      cssVariablePrefix: '--radius',
      tokens: {
        none: {
          label: 'None',
          defaultValue: '0px',
          type: 'px',
          min: 0,
          max: 0,
          step: 0,
        },
        soft: {
          label: 'Soft',
          defaultValue: '6px',
          type: 'px',
          min: 2,
          max: 10,
          step: 1,
        },
        rounded: {
          label: 'Rounded',
          defaultValue: '12px',
          type: 'px',
          min: 8,
          max: 20,
          step: 2,
        },
        pill: {
          label: 'Pill',
          defaultValue: '999px',
          type: 'px',
          min: 20,
          max: 999,
          step: 1,
        },
      },
    },

    density: {
      label: 'Density',
      description: 'Overall UI compactness',
      cssVariablePrefix: '--density',
      tokens: {
        compact: {
          label: 'Compact',
          defaultValue: '0.85',
          type: 'scale',
          min: 0.7,
          max: 0.9,
          step: 0.05,
        },
        comfortable: {
          label: 'Comfortable',
          defaultValue: '1.0',
          type: 'scale',
          min: 0.9,
          max: 1.1,
          step: 0.05,
        },
        spacious: {
          label: 'Spacious',
          defaultValue: '1.2',
          type: 'scale',
          min: 1.1,
          max: 1.5,
          step: 0.05,
        },
      },
    },

    motion: {
      label: 'Motion',
      description: 'Animation speed and easing',
      cssVariablePrefix: '--motion',
      tokens: {
        none: {
          label: 'None',
          defaultValue: '0ms',
          type: 'ms',
          min: 0,
          max: 0,
          step: 0,
        },
        subtle: {
          label: 'Subtle',
          defaultValue: '150ms',
          type: 'ms',
          min: 50,
          max: 250,
          step: 25,
        },
        smooth: {
          label: 'Smooth',
          defaultValue: '250ms',
          type: 'ms',
          min: 150,
          max: 500,
          step: 50,
        },
      },
    },

    shadows: {
      label: 'Shadows',
      description: 'Card and element elevation',
      cssVariablePrefix: '--shadow',
      tokens: {
        low: {
          label: 'Low',
          defaultValue: '0 1px 3px rgba(0,0,0,0.08)',
          type: 'shadow',
        },
        medium: {
          label: 'Medium',
          defaultValue: '0 2px 8px rgba(0,0,0,0.10)',
          type: 'shadow',
        },
        high: {
          label: 'High',
          defaultValue: '0 4px 16px rgba(0,0,0,0.12)',
          type: 'shadow',
        },
      },
    },

    typography: {
      label: 'Typography',
      description: 'Font scale and weight',
      cssVariablePrefix: '--font',
      tokens: {
        scale: {
          label: 'Font Scale',
          defaultValue: '1.0',
          type: 'scale',
          min: 0.8,
          max: 1.3,
          step: 0.05,
        },
        weightLight: {
          label: 'Light Weight',
          defaultValue: '300',
          type: 'weight',
          allowedValues: ['300', '400'],
        },
        weightRegular: {
          label: 'Regular Weight',
          defaultValue: '400',
          type: 'weight',
          allowedValues: ['400', '500'],
        },
        weightBold: {
          label: 'Bold Weight',
          defaultValue: '700',
          type: 'weight',
          allowedValues: ['600', '700', '800'],
        },
      },
    },

    colors: {
      label: 'Colors',
      description: 'Theme color overrides',
      cssVariablePrefix: '--color',
      tokens: {
        primary: {
          label: 'Primary',
          defaultValue: '#1A6FD4',
          type: 'color',
        },
        surface: {
          label: 'Surface',
          defaultValue: '#ffffff',
          type: 'color',
        },
        background: {
          label: 'Background',
          defaultValue: '#f0f2f6',
          type: 'color',
        },
        textPrimary: {
          label: 'Text Primary',
          defaultValue: '#1a1d23',
          type: 'color',
        },
        textSecondary: {
          label: 'Text Secondary',
          defaultValue: '#6b7280',
          type: 'color',
        },
        accent: {
          label: 'Accent',
          defaultValue: '#1A6FD4',
          type: 'color',
        },
      },
    },
    branding: {
      label: 'Branding',
      description: 'Ecosystem identity (logos, names, favicon)',
      tokens: {}
    },
    features: {
      label: 'Features',
      description: 'Feature flags and module toggles',
      tokens: {}
    },
    navigation: {
      label: 'Navigation',
      description: 'Sidebar and navigation visibility',
      tokens: {}
    },
    content: {
      label: 'Content',
      description: 'Dynamic text content (auth, onboarding, home, banners, etc.)',
      tokens: {}
    },
    variants: {
      label: 'Variants',
      description: 'UI component variant configurations',
      tokens: {}
    },
    colorsGrading: {
      label: 'Color Grading',
      description: 'Saturation, brightness, warmth, opacity adjustments per color',
      tokens: {}
    },
    layouts: {
      label: 'Layouts',
      description: 'Page block configurations (homepage, etc.)',
      tokens: {}
    },
  },

  // ─── DEFAULT CONFIGURATIONS PER SCOPE ─────────────────────────
  defaults: {
    global: {
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
      radius: { none: '0px', soft: '6px', rounded: '12px', pill: '999px' },
      density: { compact: '0.85', comfortable: '1.0', spacious: '1.2' },
      motion: { none: '0ms', subtle: '150ms', smooth: '250ms' },
      shadows: { low: '0 1px 3px rgba(0,0,0,0.08)', medium: '0 2px 8px rgba(0,0,0,0.10)', high: '0 4px 16px rgba(0,0,0,0.12)' },
    },
    worker: {},
    client: {},
    admin: {},
    auth: {
      motion: { none: '0ms', subtle: '200ms', smooth: '350ms' },
    },
    chat: {
      motion: { none: '0ms', subtle: '0ms', smooth: '100ms' },
    },
  },

  // ─── VALIDATION RULES ─────────────────────────────────────────
  validation: {
    // Maximum number of tokens per scope
    maxTokensPerScope: 50,
    // Disallowed CSS properties (security)
    disallowedKeys: ['position', 'display', 'z-index', 'transform', 'content'],
    // Token value max length
    maxValueLength: 100,
  },
};

module.exports = UI_CONFIG_REGISTRY;