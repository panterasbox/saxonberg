/**
 * The three-voice font stacks — kept in lockstep with saxonberg's
 * packages/client/src/styles/faces.ts so the stream chrome and the game
 * share one typographic system.
 *
 *   serif = the world speaks · sans = the app chrome · mono = you + the machine
 *
 * The woff2 are self-hosted under public/fonts/ (copied from saxonberg) and
 * declared in public/fonts.css. Each stack ends in a metric-matched fallback
 * so pre-load and failsafe rendering stay sane.
 */
export const FACE_STACKS = {
  serif: "'Source Serif 4', Georgia, serif",
  sans: "'Source Sans 3', system-ui, sans-serif",
  mono: "'Source Code Pro', 'Courier New', monospace",
} as const;
