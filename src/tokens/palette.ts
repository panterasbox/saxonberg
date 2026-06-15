/**
 * Pantera's Box brand palette — the single source of truth for color across
 * every stream overlay. Mirrors the intent of saxonberg's faces.ts but for
 * the PB *parent* brand (the livestream chrome), NOT saxonberg's content style.
 *
 * Old Glory Blue #002147 · white · Old Glory Red #BB133E (sparingly).
 * Red is reserved for attention/state/urgency only — never decorative fill.
 */
export const palette = {
  bg: {
    deep: '#00152C',   // deepest layer
    base: '#002147',   // Old Glory Blue — the brand field
    raised: '#0A2F5C', // panels, cards
  },
  border: 'rgba(255, 255, 255, 0.12)',
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.72)',
    muted: 'rgba(255, 255, 255, 0.45)',
  },
  accent: {
    red: '#BB133E',    // sparingly: live dot, urgency, errors, @mentions
    blue: '#4D9FFF',   // emphasis/interactive on the dark navy ground
  },
} as const;
