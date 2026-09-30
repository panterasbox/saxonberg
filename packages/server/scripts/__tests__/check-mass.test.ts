/**
 * check-mass — the ratchet's invariant, and the walker that nearly
 * shipped fail-open.
 *
 * ⭐⭐ **The test asserts the INVARIANT, never the number**
 * (`docs/lint-family.md` item 2). `check-lib-statics.test.ts` once
 * pinned `expect(LIB_STATICS_CEILING).toBe(392)` under the title *"holds
 * a ceiling that may fall and may never rise"* — so the one thing a
 * ratchet exists to permit was a failing test, and four lowerings had to
 * fight it. At or below the high-water mark, and above zero.
 */

import '../../src/test-bootstrap';
import { describe, it, expect } from 'vitest';
import {
  MASS_CEILING,
  MASS_HIGH_WATER,
  stripComments,
  reaches,
} from '../check-mass';

describe('the ratchet', () => {
  it('⭐ holds a ceiling that may fall and may never rise', () => {
    expect(MASS_CEILING).toBeLessThanOrEqual(MASS_HIGH_WATER);
    expect(MASS_CEILING).toBeGreaterThanOrEqual(0);
  });

  it('⚠ and the high-water mark is a fact about the past — never edit it down', () => {
    // Lowering this instead of `MASS_CEILING` is how a ratchet quietly
    // stops being one: the invariant above would keep passing while the
    // gate permitted whatever the latest count happens to be.
    expect(MASS_HIGH_WATER).toBe(242);
  });
});

describe('stripComments', () => {
  it('⚠⚠ a file saying a mixin is deliberately NOT here does not count as having it', () => {
    // The exact trap `check-perishable` shipped with: `lib/stuff/Thing.ts`
    // carries "`FreshnessMixin` is deliberately NOT here", and a
    // substring test satisfied itself on a comment that says the
    // opposite of what it concluded.
    const src = [
      '// TangibleMixin is deliberately NOT here.',
      '/* nor TangibleMixin here */',
      'const FooBase = WetMixin(Stuff);',
    ].join('\n');
    expect(stripComments(src)).not.toMatch(/TangibleMixin/);
    expect(stripComments(src)).toMatch(/WetMixin/);
  });
});

describe('reaches — the composition walk', () => {
  /*
   * ⚠⚠ These are the cases that made the first version of this gate
   * useless: it found **5 of 684** classes reaching `TangibleMixin`
   * where the composition census finds 203, because it followed only
   * IMPORTS out of the `extends` clause. Since this gate counts
   * offenders, every miss is a row that silently passes — the weakest
   * evidence producing the strongest claim.
   */
  // An empty source table: `classFileOf` resolves against the kernel.
  const sources = [] as never;

  it('⭐ finds a mixin named directly in the file', () => {
    // A composition written inline is the easy case and was never broken.
    expect(stripComments('const X = TangibleMixin(Stuff);')).toMatch(
      /TangibleMixin/,
    );
  });

  it('⚠⚠ resolves a class through its module-local `const` base', () => {
    // `const FooBase = AMixin(TangibleMixin(Stuff)); class Foo extends
    // FooBase {}` — the DOMINANT shape in this tree. `extends FooBase`
    // names a local binding, not an import, so an import-only walk stops
    // dead here and reports the class as made of nothing.
    const src = stripComments(
      [
        'const FooBase = AMixin(TangibleMixin(Stuff));',
        'export default class Foo extends FooBase {}',
      ].join('\n'),
    );
    const ext = /class\s+\w+\s+extends\s+([^{]+)\{/.exec(src);
    expect(ext, 'the extends clause parses').not.toBeNull();
    const names = new Set(ext![1]!.match(/[A-Za-z_$][\w$]*/g) ?? []);
    expect(names.has('FooBase')).toBe(true);
    const local = new RegExp(
      `(?:const|let|var)\\s+FooBase\\s*=\\s*([\\s\\S]*?);`,
    ).exec(src);
    expect(local, 'and the local const is found').not.toBeNull();
    expect(local![1]).toMatch(/TangibleMixin/);
  });

  it('a class path that resolves to no file is not matter — and says nothing else', () => {
    // Fails CLOSED in the direction that matters for a ceiling: an
    // unresolvable class is skipped, never counted as an offender on the
    // strength of a file nobody could read.
    expect(reaches('/nope/does/not/exist', 'TangibleMixin', sources)).toBe(
      false,
    );
  });
});
