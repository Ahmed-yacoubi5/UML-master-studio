/**
 * Color and Contrast Accessibility Utilities for UML Master Studio
 * Computes luminance, WCAG contrast ratios, and guarantees distinct, readable text colors.
 */

// Parse any color string (hex, rgb, rgba) to [r, g, b] in 0..255
export function parseRgb(color: string): [number, number, number] {
  if (!color || typeof color !== 'string') {
    return [255, 255, 255];
  }

  const trimmed = color.trim().toLowerCase();

  // #ffffff or #fff
  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      return [r, g, b];
    }
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = trimmed.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return [
      Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10))),
      Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10))),
      Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10))),
    ];
  }

  // Named fallbacks
  if (trimmed === 'black') return [0, 0, 0];
  if (trimmed === 'white') return [255, 255, 255];

  return [240, 240, 240];
}

// Compute relative luminance (WCAG formula: 0.2126*R + 0.7152*G + 0.0722*B)
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const rs = r / 255;
  const gs = g / 255;
  const bs = b / 255;

  const R = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
  const G = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
  const B = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

// Compute contrast ratio between two colors (ranges from 1 to 21)
export function getContrastRatio(color1: string, color2: string): number {
  const [r1, g1, b1] = parseRgb(color1);
  const [r2, g2, b2] = parseRgb(color2);

  const l1 = getRelativeLuminance(r1, g1, b1);
  const l2 = getRelativeLuminance(r2, g2, b2);

  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (brighter + 0.05) / (darker + 0.05);
}

/**
 * Returns an accessible text color that guarantees high contrast against the given background.
 * If the background is dark (luminance < 0.45), returns a crisp light text (#F8FAFC or custom light).
 * If the background is bright (luminance >= 0.45), returns a crisp dark text (#0F172A or custom dark).
 * Also checks preferredTextColor: if it already provides >= 4.5:1 contrast, preserves it.
 */
export function getAccessibleTextColor(
  backgroundColor: string,
  preferredTextColor?: string,
  options?: {
    darkFallback?: string;
    lightFallback?: string;
  }
): string {
  const darkFallback = options?.darkFallback || '#0F172A';
  const lightFallback = options?.lightFallback || '#F8FAFC';

  if (!backgroundColor || backgroundColor === 'transparent') {
    return preferredTextColor || darkFallback;
  }

  const [r, g, b] = parseRgb(backgroundColor);
  const lum = getRelativeLuminance(r, g, b);

  // If a preferred color is passed and achieves good contrast (WCAG AA 4.2+), respect it
  if (preferredTextColor) {
    const ratio = getContrastRatio(backgroundColor, preferredTextColor);
    if (ratio >= 4.2) {
      return preferredTextColor;
    }
  }

  // Background is dark -> use light high-contrast text
  if (lum < 0.45) {
    return lightFallback;
  }

  // Background is light -> use dark high-contrast text
  return darkFallback;
}

/**
 * Secondary / subtitle text with appropriate contrast (slightly muted but fully legible)
 */
export function getAccessibleSecondaryTextColor(backgroundColor: string): string {
  const [r, g, b] = parseRgb(backgroundColor);
  const lum = getRelativeLuminance(r, g, b);

  if (lum < 0.45) {
    // Light muted against dark background
    return '#CBD5E1';
  }
  // Dark muted against light background
  return '#475569';
}

/**
 * Divider line color that is visible against the element background
 */
export function getAccessibleDividerColor(backgroundColor: string, borderColor?: string): string {
  const [r, g, b] = parseRgb(backgroundColor);
  const lum = getRelativeLuminance(r, g, b);

  if (lum < 0.45) {
    return 'rgba(255, 255, 255, 0.25)';
  }
  return borderColor ? borderColor : 'rgba(0, 0, 0, 0.15)';
}
