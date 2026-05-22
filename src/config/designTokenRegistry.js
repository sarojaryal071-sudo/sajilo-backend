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
    layout: {
      pagePadding:        { cssVar: '--layout-page-padding',         fallback: '28px' },
      pagePaddingMobile:  { cssVar: '--layout-page-padding-mobile',  fallback: '16px' },
      bottomSafe:         { cssVar: '--layout-bottom-safe',          fallback: '80px' },
      navGap:             { cssVar: '--layout-nav-gap',              fallback: '8px' },
      navBrandSize:       { cssVar: '--layout-nav-brand-size',       fallback: '30px' },
      navBrandRadius:     { cssVar: '--layout-nav-brand-radius',     fallback: '8px' },
      navBrandFont:       { cssVar: '--layout-nav-brand-font',       fallback: '14px' },
      navBrandMargin:     { cssVar: '--layout-nav-brand-margin',     fallback: '24px' },
      navTabPadding:      { cssVar: '--layout-nav-tab-padding',      fallback: '6px 14px' },
      navTabRadius:       { cssVar: '--layout-nav-tab-radius',       fallback: '6px' },
      navTabFont:         { cssVar: '--layout-nav-tab-font',         fallback: '13px' },
      navSosPadding:      { cssVar: '--layout-nav-sos-padding',      fallback: '7px 14px' },
      navSosBg:           { cssVar: '--layout-nav-sos-bg',           fallback: '#D92B2B' },
      navSosRadius:       { cssVar: '--layout-nav-sos-radius',       fallback: '7px' },
      navSosFont:         { cssVar: '--layout-nav-sos-font',         fallback: '12px' },
      navLangPadding:     { cssVar: '--layout-nav-lang-padding',     fallback: '5px 8px' },
      navLangRadius:      { cssVar: '--layout-nav-lang-radius',      fallback: '6px' },
      navLangFont:        { cssVar: '--layout-nav-lang-font',        fallback: '12px' },
      navIconSize:        { cssVar: '--layout-nav-icon-size',        fallback: '34px' },
      navIconRadius:      { cssVar: '--layout-nav-icon-radius',      fallback: '7px' },
      navIconFont:        { cssVar: '--layout-nav-icon-font',        fallback: '16px' },
      navLogoutPadding:   { cssVar: '--layout-nav-logout-padding',   fallback: '6px 12px' },
      navLogoutRadius:    { cssVar: '--layout-nav-logout-radius',    fallback: '6px' },
      navLogoutFont:      { cssVar: '--layout-nav-logout-font',      fallback: '12px' },
      sidebarWidth:       { cssVar: '--layout-sidebar-width',        fallback: '248px' },
      sidebarPadding:     { cssVar: '--layout-sidebar-padding',      fallback: '20px 14px' },
      sidebarGap:         { cssVar: '--layout-sidebar-gap',          fallback: '18px' },
      sidebarInputPadding:{ cssVar: '--layout-sidebar-input-padding',fallback: '8px 10px' },
      sidebarInputRadius: { cssVar: '--layout-sidebar-input-radius', fallback: '6px' },
      sidebarInputFont:   { cssVar: '--layout-sidebar-input-font',   fallback: '13px' },
      sidebarInputWidth:  { cssVar: '--layout-sidebar-input-width',  fallback: '70px' },
      sidebarStarSize:    { cssVar: '--layout-sidebar-star-size',    fallback: '20px' },
      sidebarStarActive:  { cssVar: '--layout-sidebar-star-active',  fallback: '#f59e0b' },
      sidebarPillPadding: { cssVar: '--layout-sidebar-pill-padding', fallback: '5px 10px' },
      sidebarPillRadius:  { cssVar: '--layout-sidebar-pill-radius',  fallback: '20px' },
      sidebarPillFont:    { cssVar: '--layout-sidebar-pill-font',    fallback: '11px' },
      sidebarTimePadding: { cssVar: '--layout-sidebar-time-padding', fallback: '8px 4px' },
      sidebarAmpmPadding: { cssVar: '--layout-sidebar-ampm-padding', fallback: '8px 6px' },
      sidebarAmpmFont:    { cssVar: '--layout-sidebar-ampm-font',    fallback: '12px' },
      sidebarBtnPadding:  { cssVar: '--layout-sidebar-btn-padding',  fallback: '10px' },
      sidebarBtnRadius:   { cssVar: '--layout-sidebar-btn-radius',   fallback: '6px' },
      sidebarBtnFont:     { cssVar: '--layout-sidebar-btn-font',     fallback: '13px' },
      sidebarResetPadding:{ cssVar: '--layout-sidebar-reset-padding',fallback: '9px' },
      rightpanelWidth:       { cssVar: '--layout-rightpanel-width',        fallback: '280px' },
      rightpanelPadding:     { cssVar: '--layout-rightpanel-padding',      fallback: '20px 16px' },
      rightpanelGap:         { cssVar: '--layout-rightpanel-gap',          fallback: '20px' },
      rightpanelStatRadius:  { cssVar: '--layout-rightpanel-stat-radius',  fallback: '8px' },
      rightpanelStatPadding: { cssVar: '--layout-rightpanel-stat-padding', fallback: '12px' },
      rightpanelStatValue:   { cssVar: '--layout-rightpanel-stat-value-size', fallback: '20px' },
      rightpanelStatLabel:   { cssVar: '--layout-rightpanel-stat-label-size', fallback: '10px' },
      workerMobilePadding:   { cssVar: '--layout-worker-mobile-padding',     fallback: '8px 20px' },
      workerNavbarHeight:    { cssVar: '--layout-worker-navbar-height',      fallback: '56px' },
      workerNavbarPadding:   { cssVar: '--layout-worker-navbar-padding',     fallback: '0 24px' },
      workerNavbarGap:       { cssVar: '--layout-worker-navbar-gap',         fallback: '12px' },
      workerControlSize:     { cssVar: '--layout-worker-control-size',       fallback: '36px' },
      workerControlRadius:   { cssVar: '--layout-worker-control-radius',     fallback: '8px' },
      workerControlFont:     { cssVar: '--layout-worker-control-font',       fallback: '16px' },
      workerLangFont:        { cssVar: '--layout-worker-lang-font',          fallback: '12px' },
      workerLangPadding:     { cssVar: '--layout-worker-lang-padding',       fallback: '0 6px' },
      workerSidebarWidth:    { cssVar: '--layout-worker-sidebar-width',      fallback: '240px' },
      workerSidebarPadding:  { cssVar: '--layout-worker-sidebar-padding',    fallback: '20px 0' },
      workerBrandFont:       { cssVar: '--layout-worker-brand-font',         fallback: '20px' },
      workerBrandPadding:    { cssVar: '--layout-worker-brand-padding',      fallback: '0 20px 20px' },
      workerBrandMargin:     { cssVar: '--layout-worker-brand-margin',       fallback: '20px' },
      workerLinkGap:         { cssVar: '--layout-worker-link-gap',           fallback: '12px' },
      workerLinkPadding:     { cssVar: '--layout-worker-link-padding',       fallback: '12px 20px' },
      workerIconFont:        { cssVar: '--layout-worker-icon-font',          fallback: '18px' },
      workerIconWidth:       { cssVar: '--layout-worker-icon-width',         fallback: '24px' },
      workerContentPadding:  { cssVar: '--layout-worker-content-padding',    fallback: '24px' },
      workerBottomnavHeight: { cssVar: '--layout-worker-bottomnav-height',   fallback: '60px' },
      workerBottomnavZ:      { cssVar: '--layout-worker-bottomnav-z',        fallback: '9999' },
      workerBottomnavPadding:{ cssVar: '--layout-worker-bottomnav-padding',  fallback: '8px 4px' },
      workerBottomnavIcon:   { cssVar: '--layout-worker-bottomnav-icon',     fallback: '18px' },
      workerBottomnavLabel:  { cssVar: '--layout-worker-bottomnav-label',    fallback: '10px' },
      drawerItemPadding:     { cssVar: '--layout-drawer-item-padding',       fallback: '12px 0' },
      drawerItemFont:        { cssVar: '--layout-drawer-item-font',          fallback: '14px' },
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