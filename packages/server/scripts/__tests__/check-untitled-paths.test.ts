/**
 * check-untitled-paths' pure decision core: a shipped path under a title
 * root with no claim as a prefix is untitled; a covered one is not; a
 * path outside the nine roots (a pack's own document root) is nobody's
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

  it('the nine title roots are the installer\'s (one list, lib/paths.ts)', () => {
    expect(TITLE_ROOTS).toEqual(['/obj', '/world', '/cmd', '/compact', '/studio', '/wiki', '/home', '/corpo', '/trade']);
  });

  it('/trade/ is a title root: an unclaimed industry row is reported, a claimed one passes', () => {
    const shipped = [{ pack: 'trade-x', path: '/trade/x/obj/anvil' }];
    expect(classify(shipped, ['/obj'])).toEqual([{ path: '/trade/x/obj/anvil', pack: 'trade-x' }]);
    expect(classify(shipped, ['/trade/x'])).toEqual([]);
  });
});
