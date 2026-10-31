/**
 * Ground roles that are **the same in every theme**, factored here for
 * the same reason `registers.ts` factors the font tables: a shared
 * table across all three themes is the only shape that makes divergence
 * impossible rather than merely unlikely.
 *
 * Two kinds of value qualify, and nothing else does:
 *
 * - **The official colours.** Old Glory Blue, Old Glory Red and White
 *   are exact and non-negotiable (`DESIGN-SYSTEM.md` § Colour). The flag
 *   is the flag; high-contrast does not repaint the seal. ⚠ This is why
 *   `red` and `bad` are separate roles — `bad` is a *semantic* role that
 *   happens to equal Old Glory Red in Ink and Marble, and high-contrast
 *   is free to give it a legible value while `red` stays `#BF0A30`.
 * - **Third-party platform marks.** Twitch purple, YouTube red and Kick
 *   green are somebody else's trademarks. They are not theme colours and
 *   no ground may re-tint them; they live in the vocabulary only because
 *   the alternative is a hex literal loose in `relayTemplate`, and an
 *   evasion is worse than a home.
 *
 * - **The terminal's ground.** A near-black neutral gray in every theme,
 *   by the owner's call (2026-10-31): a player who colours their text
 *   blue should not find it fighting a blue ground. A neutral reads the
 *   same under any colour; pure black was judged too stark.
 *
 * Each theme spreads this record into its own `ground`, so a theme
 * *could* override an entry — but doing so is a visible line in a diff
 * that says "this theme repaints the flag", which is the point.
 */

/** The official colours + the platform marks. Identical in all grounds. */
export const INVARIANT_GROUND = {
  /** Old Glory Blue, PMS 281 C. A canton, not the whole cloth. */
  field: "#002868",
  /** Old Glory Red, PMS 193 C. Never touches blue without white. */
  red: "#BF0A30",
  white: "#FFFFFF",
  /** The terminal's ground — a neutral near-black in every theme. */
  "terminal-ground": "#121212",
  /**
   * ⚠ And so its text is light in every theme: marble's dark ink on a
   * near-black ground is unreadable (the contrast gate caught it).
   */
  "terminal-fg": "#f2f5fa",
  /**
   * ⚠ Google's mark is multicolour; this is its blue, used for the
   * glyph's dominant stroke. The others are single-colour brands.
   */
  "brand-google": "#4285f4",
  "brand-twitch": "#9146ff",
  "brand-youtube": "#ff0000",
  "brand-kick": "#53fc18",
} as const;
