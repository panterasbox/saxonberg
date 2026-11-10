/**
 * The face stacks — the civic voices from docs/design/handoff/DESIGN-SYSTEM.md
 * § Type, in step with saxonberg's packages/client/src/styles/faces.ts.
 *
 *   display = engraved capitals, wordmarks, the timer (Spectral)
 *   chrome  = chat and captions (Public Sans)
 *
 * ⚠ Only ever two voices on screen at once, so Rodney ships only these two.
 * The woff2 are self-hosted under public/fonts/ and declared in
 * public/fonts.css.
 */
export const FACE_STACKS = {
  display: "'Spectral', Georgia, serif",
  chrome: "'Public Sans', system-ui, sans-serif",
} as const;
