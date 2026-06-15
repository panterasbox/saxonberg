/**
 * The three self-hosted face stacks — the single source of truth for
 * every font choice in the client. Both the transcript register table
 * (`lib/style/themes/registers` → `Theme.fontRoles`) and the UI design
 * tokens (`components/ui/tokens` → app chrome) resolve through these, so
 * a face swap is one edit here.
 *
 * The three-voice model: **serif = the world speaks · sans = the app
 * chrome · mono = you + the machine.** Each stack ends in a generic
 * fallback so pre-`@font-face`-load (`font-display: swap`) and failsafe
 * rendering stay sane.
 */
export const FACE_STACKS = {
  serif: "'Source Serif 4', Georgia, serif",
  sans: "'Source Sans 3', system-ui, sans-serif",
  mono: "'Source Code Pro', 'Courier New', monospace",
} as const;
