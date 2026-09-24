/**
 * The provenance stamp: what survives a split, what a merge destroys,
 * and what nothing can edit.
 *
 * ⭐⭐ The claim under test is that **provenance is a historical claim
 * and nothing resolves it**. `sampledAt` is a path STRING, so a face
 * that is worked out, a gallery that collapses and a source that is
 * destructed all leave the sample truthfully saying where it was taken.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { SampledMixin } from '../Sampled';
import { StackableMixin } from '../../stuff/Stackable';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

/** A stackable sample-bearing thing — `Ore`'s composition order. */
class Lot extends SampledMixin(StackableMixin(Idea)) {
  static override _mixinName: string = 'Lot';
}

/** An unstackable one — `Provision`'s shape. */
class Portion extends SampledMixin(Idea) {
  static override _mixinName: string = 'Portion';
}

// ⚠ Synthetic paths under `/test/**`: a kernel test proves the KERNEL,
// and naming a shipped locality here would make this test a test of
// somebody's content (`lint:test-content`). The mixin has never heard of
// a mine — it holds three strings and never resolves one, which is
// exactly what these cases assert.
const FACE = '/test/mine/north-face';
const OTHER = '/test/mine/south-face';
const TAKER = '/platform/agent/Avatar/p1';

/**
 * ⚠ Fixtures are stamped through `stampCopy` — the ungated split-side
 * copy — because `stampSampling` is gated to the `sample` VERB and a
 * direct call is denied. That gate is itself under test below; what
 * these cases are about is what a stamp does once it exists.
 */
function stamped<T extends { stampCopy(a: string, b: string, c: number): void }>(
  thing: T,
  at: string,
): T {
  thing.stampCopy(at, TAKER, 1000);
  return thing;
}

describe('SampledMixin', () => {
  afterEach(() => StuffApi.clearAll());

  it('a plain lump is not a sample, and says so', () => {
    const lot = makeStuff(() => new Lot());
    expect(lot.isSample()).toBe(false);
    expect(lot.getSampling()).toBeNull();
  });

  it('⭐ a stamp says where, by whom and when', () => {
    const lot = stamped(makeStuff(() => new Lot()), FACE);
    expect(lot.isSample()).toBe(true);
    expect(lot.getSampling()).toEqual({ at: FACE, by: TAKER, on: 1000 });
  });

  it('⭐ a piece of a sample is a sample of the same place', () => {
    const lot = stamped(makeStuff(() => new Lot()), FACE);
    const piece = makeStuff(() => new Lot());
    lot.onSplit(piece as never);
    expect(piece.getSampling()).toEqual({ at: FACE, by: TAKER, on: 1000 });
  });

  it('⭐⭐ merging two origins NULLS the stamp — a pooled lot has none', () => {
    const mine = stamped(makeStuff(() => new Lot()), FACE);
    const theirs = stamped(makeStuff(() => new Lot()), OTHER);
    mine.onMerged(theirs as never);
    // ⚠ Not "keeps mine", not "keeps theirs". A lot from two faces is a
    // lot from nowhere, and saying otherwise is the one lie this
    // substrate must not tell — it is also why merging cannot launder
    // provenance.
    expect(mine.isSample()).toBe(false);
  });

  it('merging the SAME origin keeps it — two chips off one face', () => {
    const mine = stamped(makeStuff(() => new Lot()), FACE);
    const theirs = stamped(makeStuff(() => new Lot()), FACE);
    mine.onMerged(theirs as never);
    expect(mine.getSampling()?.at).toBe(FACE);
  });

  it('⭐ an unstackable host stamps in place, and splits into nothing', () => {
    const portion = stamped(makeStuff(() => new Portion()), FACE);
    expect(portion.getSampling()?.at).toBe(FACE);
    // ⚠ The split hook is `StackableMixin`'s, and this host has none.
    // Calling it must not throw — the guard is what lets one mixin
    // compose over a stackable ore and an unstackable loaf.
    expect(() => portion.onSplit(makeStuff(() => new Portion()) as never)).not.toThrow();
  });

  it('⭐⭐ the stamp is a STRING and is never resolved', () => {
    // The whole design: a worked-out face is gone and the claim stands.
    const lot = stamped(makeStuff(() => new Lot()), '/test/mine/collapsed');
    expect(typeof lot.getSampling()!.at).toBe('string');
    expect(lot.getSampling()!.at).toBe('/test/mine/collapsed');
  });

  it('⚠⚠ nothing but the `sample` verb may stamp — the record is unforgeable', () => {
    const lot = makeStuff(() => new Lot());
    // ⭐ The fraud in salting is in what you HANDED OVER, never in a
    // forged record. If a stamp could be written from anywhere, the
    // whole provenance story collapses into an editable field.
    expect(() => lot.stampSampling(FACE, TAKER, 1)).toThrow(/denied/i);
    expect(lot.isSample()).toBe(false);
  });
});
