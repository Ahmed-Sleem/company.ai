/* Typed mirror of the design tokens for TypeScript consumers.
 * GENERATED FILE — do not edit. Source: design/tokens/company-os-pixel.css|json
 * Rebuild: npm run tokens:build      Verify in sync: npm run tokens:check
 */
export const cssVariableNames = [
  "colorScheme",
  "bg",
  "side",
  "surface",
  "raised",
  "hover",
  "line",
  "soft",
  "text",
  "muted",
  "dim",
  "accent",
  "accentBg",
  "onAccent",
  "danger",
  "warning",
  "blue",
  "shadow"
] as const;

export const themeTokens = {
  dark: {
    "--bg": "#111514",
    "--side": "#141817",
    "--surface": "#181d1b",
    "--raised": "#1d2320",
    "--hover": "#232c27",
    "--line": "#303b34",
    "--soft": "#252e29",
    "--text": "#e1e7e1",
    "--muted": "#a0aea4",
    "--dim": "#819388",
    "--accent": "#accab3",
    "--accent-bg": "#253c2d",
    "--on-accent": "#14271b",
    "--danger": "#efaaa3",
    "--warning": "#dfc18b",
    "--blue": "#a8c4d6",
    "--shadow": "0 24px 80px #0007",
    "--font": "ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace",
    "--sans": "Arial,Tahoma,sans-serif",
    "--xs": "11px",
    "--sm": "12px",
    "--base": "13px",
    "--body": "14px",
    "--lg": "16px",
    "--title": "28px",
    "--track-tight": "-0.7px",
    "--track-eyebrow": "1.4px",
    "--s1": "4px",
    "--s2": "8px",
    "--s3": "12px",
    "--s4": "16px",
    "--s5": "20px",
    "--s6": "24px",
    "--s8": "32px",
    "--s10": "40px",
    "--radius": "6px",
    "--control": "34px",
    "--touch": "48px",
    "--avatar": "48px",
    "--avatar-sm": "28px",
    "--avatar-lg": "84px",
    "--avatar-xl": "110px",
    "--dialog-w": "700px",
    "--dialog-gap": "32px",
    "--dialog-vgap": "48px",
    "--chip": "15px",
    "--nav": "210px",
    "--speed": "130ms",
    "--max": "1440px",
    "--ring": "2px solid var(--accent)",
  },
  light: {
    "--bg": "#f5f6f1",
    "--side": "#ecefe8",
    "--surface": "#fcfcf8",
    "--raised": "#f0f3eb",
    "--hover": "#e9eee4",
    "--line": "#c5cec1",
    "--soft": "#dfe4da",
    "--text": "#26372c",
    "--muted": "#5a6b5d",
    "--dim": "#526455",
    "--accent": "#416f4e",
    "--accent-bg": "#e2ecdd",
    "--on-accent": "#fff",
    "--danger": "#a6473d",
    "--warning": "#84612c",
    "--blue": "#3c6a88",
    "--shadow": "0 24px 80px #243b252b",
  },
} as const;

export type ThemeName = 'dark' | 'light';

/** The colour palettes Settings offers, in the owner's order. "byline" is the owner's own
 *  wording, kept for provenance; the name a person reads comes from lib/i18n.ts. */
export const palettes = [
  { id: "sage", chip: "#accab3", byline: "Original sage" },
  { id: "ocean", chip: "#a9c8ec", byline: "Ocean blue" },
  { id: "violet", chip: "#c5b6e8", byline: "Soft violet" },
  { id: "amber", chip: "#dfc18b", byline: "Warm amber" },
  { id: "rose", chip: "#e3b0bd", byline: "Dusty rose" },
] as const;

export type PaletteId = (typeof palettes)[number]['id'];

/** The palette the design source's own colours make: the default, and never an override. */
export const defaultPalette: PaletteId = 'sage';

/** Tokens that are not colours (space, type, layout), read once and frozen. */
export const pixel = {
  typography: {
  "xs": 11,
  "sm": 12,
  "base": 13,
  "body": 14,
  "lg": 16,
  "title": 28
},
  fonts: {
    pixel: "'Pixelify Sans', ui-monospace, monospace",
    mono: "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace",
    sans: "Arial, Tahoma, sans-serif",
  },
  breakpointsPx: {
  "540": "roster+board 1-up; stats 2-up; h1 24px",
  "800": "sidebar becomes a drawer with scrim; mobile nav button visible",
  "1190": "--nav 188px; roster+board 2-up; chat 200px; settings 1 column",
  "1650": "roster 4-up",
  "801_min": "desktop rail collapse available"
},
} as const;

export const pixelFontFile = 'assets/PixelifySans.woff2';
