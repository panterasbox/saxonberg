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
import { INK_THEME } from '../themes/ink';
import { HIGH_CONTRAST_THEME } from '../themes/highContrast';
import { NEUTRAL_BUCKET_RESOLVER } from '../BucketResolver';
import { BASE_REGISTERS, BASE_FONT_ROLES } from '../themes/registers';
import type { StyleOverlay, Theme, FontRole } from '../types';

function sheet(theme: Theme, overlay: StyleOverlay = {}): Stylesheet {
  return new Stylesheet(theme, overlay, {
    resolver: NEUTRAL_BUCKET_RESOLVER,
    viewerStuffId: null,
  });
}

const SERIF = 'Newsreader';
const MONO = 'IBM Plex Mono';

describe('register classification — explicit topic→register table', () => {
  const ss = sheet(INK_THEME);

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

describe('the four voices — one face source, no topic for chrome/display', () => {
  it('all four roles resolve to a non-empty, pairwise-distinct stack', () => {
    const roles: FontRole[] = [
      'narrative',
      'chrome',
      'command',
      'display',
    ];
    const stacks = roles.map((r) => BASE_FONT_ROLES[r]);
    for (const stack of stacks) expect(stack.length).toBeGreaterThan(0);
    expect(new Set(stacks).size).toBe(roles.length);
    expect(Object.keys(BASE_FONT_ROLES).sort()).toEqual([...roles].sort());
  });

  it('display maps to no transcript topic, exactly as chrome does', () => {
    // Chrome and display are the client-shell frame voices. A topic can
    // only acquire a voice by appearing in the register table, which is
    // what keeps an unclassified future topic on `command`.
    const mapped = Object.values(BASE_REGISTERS);
    expect(mapped).not.toContain('display');
    expect(mapped).not.toContain('chrome');
  });

  it('an unmapped topic still resolves to the display-free default', () => {
    const ss = sheet(INK_THEME);
    expect(ss.fontFamilyForTopic('some.new.root')).toBe(
      BASE_FONT_ROLES.command,
    );
  });
});

describe('register classification — longest-prefix cascade', () => {
  it('a deeper explicit entry overrides a shallower one', () => {
    // Synthetic theme: shallow prefix is narrative, deeper is command.
    const theme: Theme = {
      ...INK_THEME,
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
    const normal = sheet(INK_THEME);
    const plain = sheet(INK_THEME, { plain: true });
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
      ...INK_THEME,
      fontRoles: { ...INK_THEME.fontRoles, narrative: SENTINEL },
    };
    const ss = sheet(reskinned);

    // Narrative resolves to the swapped face...
    expect(ss.fontFamilyForTopic('speech.vocal')).toBe(SENTINEL);
    // ...command is untouched...
    expect(ss.fontFamilyForTopic('shell.result')).toContain(MONO);
    // ...and the register (topic→role) table is byte-identical: the
    // faces are not load-bearing, only the role tokens changed.
    expect(reskinned.registers).toEqual(INK_THEME.registers);
  });
});
