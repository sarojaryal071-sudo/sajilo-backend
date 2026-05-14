/**
 * Design Token Registry
 * Phase 19A — UI Configuration Engine Foundation
 * 
 * Frontend-safe mapping of design tokens to CSS variables.
 * Mirrors uiConfigRegistry but with CSS variable names and fallbacks.
 * 
 * This is the bridge between backend config and actual CSS.
 */

export const designTokenRegistry = {
  // ─── CSS VARIABLE MAPPINGS ────────────────────────────────────
  mappings: {
    spacing: {
      xs: { cssVar: '--spacing-xs', fallback: '4px' },
      sm: { cssVar: '--spacing-sm', fallback: '8px' },
      md: { cssVar: '--spacing-md', fallback: '16px' },
      lg: { cssVar: '--spacing-lg', fallback: '24px' },
      xl: { cssVar: '--spacing-xl', fallback: '32px' },
    },
    radius: {
      none: { cssVar: '--radius-none', fallback: '0px' },
      soft: { cssVar: '--radius-soft', fallback: '6px' },
      rounded: { cssVar: '--radius-rounded', fallback: '12px' },
      pill: { cssVar: '--radius-pill', fallback: '999px' },
    },
    density: {
      compact: { cssVar: '--density-compact', fallback: '0.85' },
      comfortable: { cssVar: '--density-comfortable', fallback: '1.0' },
      spacious: { cssVar: '--density-spacious', fallback: '1.2' },
    },
    motion: {
      none: { cssVar: '--motion-none', fallback: '0ms' },
      subtle: { cssVar: '--motion-subtle', fallback: '150ms' },
      smooth: { cssVar: '--motion-smooth', fallback: '250ms' },
    },
    shadows: {
      low: { cssVar: '--shadow-low', fallback: '0 1px 3px rgba(0,0,0,0.08)' },
      medium: { cssVar: '--shadow-medium', fallback: '0 2px 8px rgba(0,0,0,0.10)' },
      high: { cssVar: '--shadow-high', fallback: '0 4px 16px rgba(0,0,0,0.12)' },
    },
    typography: {
      scale: { cssVar: '--font-scale', fallback: '1.0' },
      weightLight: { cssVar: '--font-weight-light', fallback: '300' },
      weightRegular: { cssVar: '--font-weight-regular', fallback: '400' },
      weightBold: { cssVar: '--font-weight-bold', fallback: '700' },
    },
    colors: {
      primary: { cssVar: '--color-primary', fallback: '#1A6FD4' },
      surface: { cssVar: '--color-surface', fallback: '#ffffff' },
      background: { cssVar: '--color-background', fallback: '#f0f2f6' },
      textPrimary: { cssVar: '--color-text-primary', fallback: '#1a1d23' },
      textSecondary: { cssVar: '--color-text-secondary', fallback: '#6b7280' },
      accent: { cssVar: '--color-accent', fallback: '#1A6FD4' },
    },
  },

  // ─── CATEGORY LABELS ──────────────────────────────────────────
  categories: {
    spacing: { label: 'Spacing', icon: '↔️' },
    radius: { label: 'Border Radius', icon: '⭕' },
    density: { label: 'Density', icon: '📐' },
    motion: { label: 'Motion', icon: '🎬' },
    shadows: { label: 'Shadows', icon: '🕶️' },
    typography: { label: 'Typography', icon: '🔤' },
    colors: { label: 'Colors', icon: '🎨' },
  },
};

/**
 * Get all CSS variable names for a category.
 * @param {string} category
 * @returns {string[]}
 */
export function getCSSVarsForCategory(category) {
  const cat = designTokenRegistry.mappings[category];
  if (!cat) return [];
  return Object.values(cat).map(t => t.cssVar);
}

/**
 * Get fallback value for a token.
 * @param {string} category
 * @param {string} tokenKey
 * @returns {string}
 */
export function getFallback(category, tokenKey) {
  return designTokenRegistry.mappings[category]?.[tokenKey]?.fallback || '';
}