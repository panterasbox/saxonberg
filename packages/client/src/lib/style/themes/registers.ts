/**
 * Shared font-register tables for the shipped themes.
 *
 * Both `default` and `high-contrast` use the **same** register
 * mapping and the same face stacks — typography register is orthogonal
 * to the contrast axis, so the tables are factored here to avoid drift.
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
 * Topic-prefix → register. The three-voice model — serif = the world
 * speaks, mono = you + the machine. `chrome` (sans) is the client-shell
 * frame voice and is intentionally NOT mapped to any transcript topic;
 * it lives in the role table for completeness and future use.
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
 * one-line change here (plus the matching `@font-face`). The default
 * theme ships the Source superfamily — one harmonized OFL family so the
 * registers share metrics by construction (the cheap fix for the
 * rhythm-jolt risk). Narrative may later upgrade to Literata by editing
 * only the `narrative` line.
 */
export const BASE_FONT_ROLES: Record<FontRole, string> = {
  narrative: FACE_STACKS.serif,
  chrome: FACE_STACKS.sans,
  command: FACE_STACKS.mono,
};
