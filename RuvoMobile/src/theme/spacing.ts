/**
 * Spacing scale — a 4px grid.
 *
 * The abstract steps are unchanged. The semantic aliases below name the four
 * measurements that actually decide whether a screen feels calm: the screen
 * gutter, the gap between sections, the padding inside a card, and the gap
 * between cards in a list. Screens that hardcode these are the reason spacing
 * used to drift between them.
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,

  // ── Semantic aliases ─────────────────────────────────────────────────────
  /** Horizontal page margin. Every screen's content starts here. */
  gutter: 18,
  /** Vertical gap between two major sections. Generous on purpose. */
  section: 28,
  /** Padding inside a card. */
  cardPad: 16,
  /** Gap between sibling cards in a list or grid. */
  cardGap: 12,
  /**
   * Bottom padding a scroll view needs to clear the floating navigation.
   * Callers add the safe-area inset on top of this.
   */
  navClearance: 96,
};
