/**
 * Font-by-register classification + swappability.
 *
 * Covers the acceptance criteria:
 *  - register classification is an explicit topic-keyed table; each
 *    register's representative topic resolves to the expected face
 *    (8a);
 *  - a face is swappable by changing one role→family mapping with the
 *    register table untouched (8b);
 *  - unmapped topics default to `command` (mono);
 *  - longest-prefix cascade — deepest explicit entry wins;
 *  - plain mode does NOT strip the font register (reader sovereignty:
 *    the message string is complete; font is structural legibility).
 */

import { describe, it, expect } from 'vitest';
import { Stylesheet } from '../Stylesheet';
import { DEFAULT_THEME } from '../themes/default';
import { HIGH_CONTRAST_THEME } from '../themes/highContrast';
import { NEUTRAL_BUCKET_RESOLVER } from '../BucketResolver';
import type { StyleOverlay, Theme } from '../types';

function sheet(theme: Theme, overlay: StyleOverlay = {}): Stylesheet {
  return new Stylesheet(theme, overlay, {
    resolver: NEUTRAL_BUCKET_RESOLVER,
    viewerStuffId: null,
  });
}

const SERIF = 'Source Serif 4';
const MONO = 'Source Code Pro';

describe('register classification — explicit topic→register table', () => {
  const ss = sheet(DEFAULT_THEME);

  it('speech.vocal → narrative serif [AC: say renders serif]', () => {
    expect(ss.fontFamilyForTopic('speech.vocal')).toContain(SERIF);
  });

  it('shell.result → command mono [AC: help renders mono]', () => {
    expect(ss.fontFamilyForTopic('shell.result')).toContain(MONO);
  });

  it('sense.survey → narrative serif [AC: look is proportional]', () => {
    expect(ss.fontFamilyForTopic('sense.survey')).toContain(SERIF);
  });

  it('speech.*, act.* and sense.* → narrative serif', () => {
    expect(ss.fontFamilyForTopic('act.emote')).toContain(SERIF);
    expect(ss.fontFamilyForTopic('act.ambient')).toContain(SERIF);
  });

  it('command echo (shell.diagnostic) → command mono', () => {
    expect(ss.fontFamilyForTopic('shell.diagnostic.echo')).toContain(MONO);
  });

  it('unmapped topic → command (mono) default-on-miss', () => {
    expect(ss.fontFamilyForTopic('totally.unknown.topic')).toContain(MONO);
  });

  it('the high-contrast theme uses the identical register mapping', () => {
    const hc = sheet(HIGH_CONTRAST_THEME);
    expect(hc.fontFamilyForTopic('speech.vocal')).toContain(SERIF);
    expect(hc.fontFamilyForTopic('shell.result')).toContain(MONO);
  });
});

describe('register classification — longest-prefix cascade', () => {
  it('a deeper explicit entry overrides a shallower one', () => {
    // Synthetic theme: shallow prefix is narrative, deeper is command.
    const theme: Theme = {
      ...DEFAULT_THEME,
      registers: { a: 'narrative', 'a.b.c': 'command' },
    };
    const ss = sheet(theme);
    // Shallow match → narrative.
    expect(ss.fontFamilyForTopic('a.b')).toContain(SERIF);
    // Deeper explicit entry wins over the shallow narrative prefix.
    expect(ss.fontFamilyForTopic('a.b.c.d')).toContain(MONO);
  });
});

describe('register is not stripped by plain mode [reader sovereignty]', () => {
  it('plain mode leaves the font register unchanged', () => {
    const normal = sheet(DEFAULT_THEME);
    const plain = sheet(DEFAULT_THEME, { plain: true });
    expect(plain.fontFamilyForTopic('speech.vocal')).toBe(
      normal.fontFamilyForTopic('speech.vocal'),
    );
    expect(plain.fontFamilyForTopic('speech.vocal')).toContain(SERIF);
  });
});

describe('faces are swappable — one role→family change [8b]', () => {
  it('overriding fontRoles.narrative re-skins narrative frames only', () => {
    const SENTINEL = "'Literata', Georgia, serif";
    const reskinned: Theme = {
      ...DEFAULT_THEME,
      fontRoles: { ...DEFAULT_THEME.fontRoles, narrative: SENTINEL },
    };
    const ss = sheet(reskinned);

    // Narrative resolves to the swapped face...
    expect(ss.fontFamilyForTopic('speech.vocal')).toBe(SENTINEL);
    // ...command is untouched...
    expect(ss.fontFamilyForTopic('shell.result')).toContain(MONO);
    // ...and the register (topic→role) table is byte-identical: the
    // faces are not load-bearing, only the role tokens changed.
    expect(reskinned.registers).toEqual(DEFAULT_THEME.registers);
  });
});
