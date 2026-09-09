export const RUVO_BRAND_COLORS = {
  primary: '#F4B400',       // RuVo Gold
  primarySoft: '#FFF2C2',   // Soft Gold Accent
  primaryDark: '#D99B00',   // Deep Gold
  ink: '#171A1F',           // Dark Ink (Typography & Monogram)
  deepNavy: '#202A3A',      // Secondary Charcoal
  background: '#FAF7F0',    // RuVo Cream
  surface: '#FFFFFF',       // Pure White
  border: '#E7E0D5',        // Subtle Outline
  mutedText: '#77736B',     // Secondary Typography
  hintText: '#A39D93',      // Subtle Labels
  success: '#18A957',       // Live / Active
  warning: '#E99A16',       // Pending
  error: '#D94A4A',         // Alert
  info: '#3478C8',          // Informational
} as const;

export type RuvoBrandColors = typeof RUVO_BRAND_COLORS;
