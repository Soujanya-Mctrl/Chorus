/**
 * Chorus Design Tokens
 * A premium, minimal design system inspired by Linear, Vercel, and Raycast
 */

// Spacing scale (8px grid)
export const spacing = {
  0: 0,
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
} as const;

// Typography scale
export const typography = {
  xs: { fontSize: "11px", lineHeight: "16px", letterSpacing: "0.5px" },
  sm: { fontSize: "13px", lineHeight: "20px", letterSpacing: "0.25px" },
  base: { fontSize: "14px", lineHeight: "20px", letterSpacing: "0" },
  lg: { fontSize: "16px", lineHeight: "24px", letterSpacing: "-0.25px" },
  xl: { fontSize: "18px", lineHeight: "28px", letterSpacing: "-0.375px" },
  "2xl": { fontSize: "20px", lineHeight: "28px", letterSpacing: "-0.5px" },
  "3xl": { fontSize: "24px", lineHeight: "32px", letterSpacing: "-0.5px" },
  "4xl": { fontSize: "30px", lineHeight: "36px", letterSpacing: "-0.75px" },
  "5xl": { fontSize: "36px", lineHeight: "40px", letterSpacing: "-1px" },
} as const;

// Font weights
export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  display: 750,
} as const;

// Border radius scale
export const radius = {
  none: "0",
  sm: "4px",
  md: "6px",
  lg: "8px",
  xl: "10px",
  "2xl": "12px",
  "3xl": "16px",
  full: "9999px",
} as const;

// Shadows - subtle, layered approach
export const shadows = {
  none: "none",
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
  md: "0 4px 8px -2px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)",
  lg: "0 8px 16px -4px rgba(0, 0, 0, 0.5), 0 4px 8px -4px rgba(0, 0, 0, 0.4)",
  xl: "0 16px 32px -8px rgba(0, 0, 0, 0.5), 0 8px 16px -8px rgba(0, 0, 0, 0.4)",
  glow: "0 0 20px rgba(249, 115, 22, 0.15)",
  "glow-strong": "0 0 40px rgba(249, 115, 22, 0.25)",
} as const;

// Transitions
export const transitions = {
  fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
  base: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
  slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

// Z-index scale
export const zIndex = {
  hidden: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// Container max-widths
export const containers = {
  xs: "320px",
  sm: "400px",
  md: "560px",
  lg: "768px",
  xl: "960px",
  "2xl": "1152px",
  "3xl": "1280px",
  "4xl": "1400px",
} as const;
