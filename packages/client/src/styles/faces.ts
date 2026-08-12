/**
 * The four self-hosted face stacks — the single source of truth for
 * every font choice in the client. Both the transcript register table
 * (`lib/style/themes/registers` → `Theme.fontRoles`) and the UI design
 * tokens (`components/ui/tokens` → app chrome) resolve through these, so
 * a face swap is one edit here.
 *
 * The four-voice model, from `docs/design_handoff/DESIGN-SYSTEM.md`:
 *
 * | Role        | Face          | Where                                     |
 * |-------------|---------------|-------------------------------------------|
 * | `display`   | Spectral      | Engraved capitals: section labels,        |
 * |             |               | headings, wordmark, binomials             |
 * | `chrome`    | Public Sans   | All UI and dense text                     |
 * | `narrative` | Newsreader    | World prose only — terminal prose, plate  |
 * |             |               | captions                                  |
 * | `command`   | IBM Plex Mono | Commands, measurements, ids               |
 *
 * ⚠ **Only ever two voices on screen at once** (DESIGN-SYSTEM § Type).
 *
 * `display` is chrome-only and maps to **no transcript topic**, for the
 * same reason `chrome` does not — see `themes/registers.ts`.
 *
 * Each stack ends in a generic fallback so pre-`@font-face`-load
 * (`font-display: swap`) and failsafe rendering stay sane. ⚠ The four
 * families are unrelated and do **not** share metrics, so the swap
 * reflows — see the note in `GlobalFonts.ts`.
 *
 * `serif` / `sans` / `mono` are **aliases** kept so no call site changed
 * when the three-voice model became four: `sans → chrome`,
 * `serif → narrative`, `mono → command`. New code should name the role.
 */
export const FACE_STACKS = {
  display: "'Spectral', Georgia, serif",
  chrome: "'Public Sans', system-ui, sans-serif",
  narrative: "'Newsreader', Georgia, serif",
  command: "'IBM Plex Mono', 'Courier New', monospace",
  // Aliases — the pre-civic names, retained so call sites did not move.
  serif: "'Newsreader', Georgia, serif",
  sans: "'Public Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', 'Courier New', monospace",
} as const;
