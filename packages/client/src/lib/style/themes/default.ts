/**
 * Default theme — the existing cockpit palette lifted into stylesheet
 * form. Earlier MmlRenderer styling (`#4ec9b0` clickable, dotted
 * underline, italic `<speech>`, etc.) maps to per-element treatments
 * here; the renderer reads them through the engine rather than
 * baking them in.
 */

import type { Theme } from '../types';

export const DEFAULT_THEME: Theme = {
  name: 'default',
  palette: {
    fg: '#d4d4d4',
    bg: '#1e1e1e',
    fgMuted: '#888',
    chanChip: '#c8b76a',
    speech: '#d4d4d4',
    link: '#4ec9b0',
    inertLink: '#88a',
    mentionSelfFg: '#ffd966',
    mentionSelfBg: 'rgba(255, 217, 102, 0.12)',
    mentionOther: '#a89bd8',
    channelDefaults: {
      gossip: '#c8b76a',
      trade: '#7fa8c8',
      newbie: '#9bc880',
    },
  },
  topic: {
    // Frame-level rules stay EMPTY for content topics. Per-word
    // markers (`<strong>`, `<em>`, `<code>`) live at the element
    // level — if the topic rule claims the same dimension (bold,
    // italic), the per-word marker becomes invisible. Speech is
    // already marked by the quote characters in the body and the
    // "You say," / "X says," framing; no extra typographic claim
    // needed at the frame level.
  },
  element: {
    // Per-word markers via the renderer's hardcoded styled-components
    // (StrongSpan = bold, EmSpan = italic, CodeSpan = monospace + bg).
    // Theme entries reserved for future per-element divergence;
    // empty here so the renderer's defaults stand uncontested.
  },
  bucket: {
    neutral: {},
    friend: { fg: '#9bc880', weight: 'bold' },
    foe: { fg: '#e07a8a', weight: 'bold' },
  },
  mention: {
    match: {
      fg: '#ffd966',
      bg: 'rgba(255, 217, 102, 0.12)',
      weight: 'bold',
    },
    other: { fg: '#a89bd8' },
  },
};
