/**
 * check-untitled-paths' pure decision core: a shipped path under a title
 * root with no claim as a prefix is untitled; a covered one is not; a
 * path outside the eight roots (a pack's own document root) is nobody's
 * business.
 */

import { describe, it, expect } from 'vitest';
import { classify, TITLE_ROOTS } from '../check-untitled-paths';

describe('check-untitled-paths.classify', () => {
  it('a covered path passes, an uncovered one under a title root is reported, one outside the roots is ignored', () => {
    const shipped = [
      { pack: 'platform', path: '/obj/EventRegistry' },
      { pack: 'stray', path: '/obj/gear/hat' },
      { pack: 'expression', path: '/expression/emotes/wave' },
      { pack: 'world', path: '/studio/x' },
    ];
    expect(classify(shipped, ['/obj/EventRegistry', '/studio'])).toEqual([{ path: '/obj/gear/hat', pack: 'stray' }]);
    expect(classify(shipped, ['/obj', '/studio'])).toEqual([]);
  });

  it('the eight title roots are the installer\'s', () => {
    expect(TITLE_ROOTS).toEqual(['/obj', '/domain', '/cmd', '/compact', '/studio', '/wiki', '/home', '/corpo']);
  });
});
