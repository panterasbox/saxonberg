/**
 * Shared font-register tables for the shipped themes.
 *
 * All three themes (`ink`, `marble`, `high-contrast`) use the **same**
 * register mapping and the same face stacks — typography register is
 * orthogonal to both the ground and the contrast axis, so the tables are
 * factored here to avoid drift. `themes/__tests__/themes.test.ts`
 * asserts the identity across all three.
 *
 * - `BASE_REGISTERS` — the explicit topic-prefix → register map
 *   (the requirements' classification table). Resolved by the same
 *   longest-prefix cascade as topic treatments; unmapped topics default
 *   to `command` (mono) in `Stylesheet.fontFamilyForTopic`.
 * - `BASE_FONT_ROLES` — register role → CSS font-family stack. The
 *   swappable-faces layer: each stack ends in a generic fallback so
 *   pre-`font-display:swap` and failsafe rendering stay sane.
 */

import type { FontRole } from '../types';
import { FACE_STACKS } from '../../../styles/faces';

/**
 * Topic-prefix → register. The four-voice model — `narrative` = the
 * world speaks, `command` = you + the machine. `chrome` and `display`
 * are the client-shell frame voices and are intentionally NOT mapped to
 * any transcript topic; they live in the role table because that table
 * is the single face source. A topic can only ever acquire a voice by
 * appearing here, which is what keeps an unclassified future topic
 * falling back to `command` rather than silently picking one up.
 *
 * ⭐ Keyed on **roots**, which is the whole payoff of a tree that
 * carries subject matter. The voice a frame speaks in is a property of
 * what it is about — the world, or the machine — so one entry per root
 * replaces the per-leaf table this used to need.
 *
 * `shell` / `session` map to `command` explicitly even though `command`
 * is the default-on-miss: an explicit table is the requirement, and it
 * keeps the echoed prompt and its answer mono.
 */
export const BASE_REGISTERS: Record<string, FontRole> = {
  // command / mono — you + the machine
  shell: 'command',
  session: 'command',
  // narrative / serif — the world speaks
  speech: 'narrative',
  act: 'narrative',
  sense: 'narrative',
  self: 'narrative',
  publication: 'narrative',
};

/**
 * Register role → CSS font-family stack. Re-skinning a register is a
 * one-line change here (plus the matching `@font-face`). All four roles
 * resolve through the single face source in `styles/faces`, so no theme
 * can diverge on a voice.
 *
 * ⚠ The civic four are unrelated families and do **not** share metrics
 * the way the retired Source superfamily did — see `GlobalFonts.ts` for
 * why `font-display: swap` is kept anyway.
 */
export const BASE_FONT_ROLES: Record<FontRole, string> = {
  narrative: FACE_STACKS.narrative,
  chrome: FACE_STACKS.chrome,
  command: FACE_STACKS.command,
  display: FACE_STACKS.display,
};
