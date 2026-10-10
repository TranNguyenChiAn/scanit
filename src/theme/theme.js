// Design tokens for ScanIt.
// Palette: deep "ink" navy for structure/text, warm off-white surface,
// a single electric-teal accent reserved for the scan/active state,
// and amber reserved only for warnings / not-found states.

export const colors = {
  ink: '#0B1220',        // primary text, dark surfaces
  inkSoft: '#3A4356',    // secondary text
  surface: '#FFFFFF',    // cards
  background: '#F4F5F7', // app background
  border: '#E3E6EC',
  accent: '#1FB6A6',     // teal — scanning / primary action
  accentDark: '#128577',
  warn: '#C7761F',       // amber — not-found / caution
  warnSoft: '#FBEBDA',
  danger: '#C0392B',
  white: '#FFFFFF',
};

export const type = {
  display: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.inkSoft,
    lineHeight: 21,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.accentDark,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};
