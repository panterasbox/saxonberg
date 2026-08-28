/**
 * check-untitled-paths' pure decision core: a shipped path under a
 * claimed root with no claim as a prefix is untitled; a covered one is
 * not; a path under a root nobody claims (a pack's own document root)
 * is nobody's business. The roots are DERIVED from the claims.
 */

import { describe, it, expect } from 'vitest';
import { classify, titleRootsOf } from '../check-untitled-paths';

describe('check-untitled-paths.classify', () => {
  it('a covered path passes, an uncovered one under a title root is reported, one outside the roots is ignored', () => {
    const shipped = [
      { pack: 'platform', path: '/platform/idea/EventRegistry' },
      { pack: 'stray', path: '/stuff/thing/gear/hat' },
      { pack: 'expression', path: '/expression/emotes/wave' },
      { pack: 'world', path: '/studio/x' },
    ];
    expect(classify(shipped, ['/platform/idea/EventRegistry', '/stuff/thing/items', '/studio'])).toEqual([{ path: '/stuff/thing/gear/hat', pack: 'stray' }]);
    expect(classify(shipped, ['/platform', '/stuff', '/studio'])).toEqual([]);
  });

  it('the title roots are derived from the claims; a template row is a place regardless, a document only under a claimed root', () => {
    expect(titleRootsOf(['/platform', '/stuff/thing/gear', '/trade/x', '/arcana'])).toEqual(['/platform', '/stuff', '/trade', '/arcana']);
    // A document under a root NO pack claims is a place no title reaches: not reported.
    expect(classify([{ pack: 'x', path: '/nowhere/emotes/y' }], ['/platform'])).toEqual([]);
    // A TEMPLATE row anywhere is a place: reported wherever nobody claims it.
    expect(classify([{ pack: 'x', path: '/nowhere/thing/y', template: true }], ['/platform'])).toEqual([{ path: '/nowhere/thing/y', pack: 'x' }]);
  });

  it('/trade/ is a title root: an unclaimed industry row is reported, a claimed one passes', () => {
    const shipped = [{ pack: 'trade-x', path: '/trade/x/thing/anvil' }];
    expect(classify(shipped, ['/trade/y'])).toEqual([{ path: '/trade/x/thing/anvil', pack: 'trade-x' }]);
    expect(classify(shipped, ['/trade/x'])).toEqual([]);
  });
});
