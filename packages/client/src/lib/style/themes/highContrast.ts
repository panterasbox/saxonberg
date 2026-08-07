/**
 * High-contrast theme — accessibility-driven variant. Acceptance
 * criterion #27: every treatment that sets a color also sets at
 * least one non-color cue (weight, italic, prefix, chip) so the
 * theme remains legible without color.
 */

import type { Theme } from '../types';
import { BASE_REGISTERS, BASE_FONT_ROLES } from './registers';

export const HIGH_CONTRAST_THEME: Theme = {
  name: 'high-contrast',
  palette: {
    fg: '#ffffff',
    bg: '#000000',
    fgMuted: '#cccccc',
    chanChip: '#ffff00',
    speech: '#ffffff',
    link: '#00ffff',
    inertLink: '#aaaaaa',
    mentionSelfFg: '#ffff00',
    mentionSelfBg: '#000000',
    mentionOther: '#ffffff',
    channelDefaults: {
      gossip: '#ffff00',
      trade: '#00ffff',
      newbie: '#00ff00',
    },
  },
  topic: {
    // Per-word markers (`<strong>`, `<em>`, `<code>`) are how
    // emphasis lands; topic-cascade rules must NOT claim those same
    // dimensions or the per-word markers become invisible. Tell uses
    // a prefix glyph (non-color cue) for high-contrast and a slightly
    // dimmer fg for the public/private distinction; nothing claims
    // italic or bold at the frame level.
    'speech.comms': { fg: '#cccccc', prefix: '» ' },
    // Back-compat: persisted frames pre-rename still carry the old topic.
    'world.speech.tell': { fg: '#cccccc', prefix: '» ' },
  },
  element: {
    // The renderer's hardcoded styled-components carry per-tag
    // emphasis (StrongSpan, EmSpan, CodeSpan). Theme entries reserved
    // for future divergence; empty so the renderer's defaults stand.
  },
  bucket: {
    neutral: {},
    // Friend / foe pair fg color with weight + prefix so the
    // distinction survives a monochrome render.
    friend: { fg: '#00ff00', weight: 'bold', prefix: '+' },
    foe: { fg: '#ff0000', weight: 'bold', prefix: '!' },
  },
  mention: {
    match: {
      fg: '#ffff00',
      bg: '#000000',
      weight: 'bold',
      prefix: '►',
    },
    other: { fg: '#ffffff', weight: 'bold' },
  },
  // Identical font register mapping as the default theme — typography
  // register is orthogonal to the contrast axis.
  registers: BASE_REGISTERS,
  fontRoles: BASE_FONT_ROLES,
};
