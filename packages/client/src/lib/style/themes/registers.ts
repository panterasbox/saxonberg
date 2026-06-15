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

/**
 * Topic-prefix → register. The three-voice model — serif = the world
 * speaks, mono = you + the machine. `chrome` (sans) is the client-shell
 * frame voice and is intentionally NOT mapped to any transcript topic;
 * it lives in the role table for completeness and future use.
 *
 * `system` maps to `command` explicitly even though `command` is also
 * the default-on-miss: the requirements call for an explicit
 * topic-keyed table, and command echo lands as `system.log.command.*`,
 * so the `system` prefix keeps the echoed prompt + command mono.
 */
export const BASE_REGISTERS: Record<string, FontRole> = {
  // command / mono — you + the machine
  system: 'command',
  // narrative / serif — the world speaks
  'world.speech': 'narrative',
  'world.expression': 'narrative',
  'world.narration': 'narrative',
  'world.perception': 'narrative',
  // Chat is social world prose; map it narrative for voice coherence
  // with the other `world.*` social registers. (Inference beyond the
  // requirements' table — reversible: drop this one line to send chat
  // back to the mono default.)
  'world.chat': 'narrative',
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
  narrative: "'Source Serif 4', Georgia, serif",
  chrome: "'Source Sans 3', system-ui, sans-serif",
  command: "'Source Code Pro', 'Courier New', monospace",
};
