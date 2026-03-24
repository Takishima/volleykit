/**
 * VolleyKit Color Tokens (JS)
 *
 * JavaScript export of the design token colors for platforms that
 * cannot consume CSS custom properties directly (e.g. React Native
 * with NativeWind / Tailwind 3).
 *
 * These values MUST stay in sync with design-tokens.css.
 * When changing colors, update BOTH files.
 */

const primary = {
  50: '#fdffe4',
  100: '#f9ffc4',
  200: '#f1ff90',
  300: '#e2ff50',
  400: '#d7ff37',
  500: '#b2e600',
  600: '#8ab800',
  700: '#688b00',
  800: '#526d07',
  900: '#455c0b',
  950: '#233400',
}

const success = {
  50: '#f0fdfa',
  100: '#ccfbf1',
  200: '#99f6e4',
  400: '#2dd4bf',
  500: '#14b8a6',
  600: '#0d9488',
  800: '#115e59',
  900: '#134e4a',
  950: '#042f2e',
}

const warning = {
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  400: '#fb923c',
  500: '#f97316',
  600: '#ea580c',
  800: '#9a3412',
  900: '#7c2d12',
  950: '#431407',
}

const danger = {
  50: '#fef2f2',
  100: '#fee2e2',
  200: '#fecaca',
  400: '#f87171',
  500: '#ef4444',
  600: '#dc2626',
  800: '#991b1b',
  900: '#7f1d1d',
}

module.exports = { primary, success, warning, danger }
