/**
 * **How often a minted item comes out cursed, ordinary, or blessed.**
 *
 * The shape mirrors stock targets exactly (`regionTarget` ←
 * `zone.stocks`): an item declares its own baseline, a Zone's
 * declaration wins over it, and a place that declares nothing leaves
 * every item on its own.
 *
 * The load-bearing claim under test is *where the roll happens*: at the
 * random mint and nowhere else. A deliberately-made item — an author's
 * clone, a crafted output, a restocked consignment — inherits intent and
 * never gets a surprise curse.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Blessing, type BlessingOdds } from '../Blessing';
import { BlessableMixin } from '../Blessable';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import Thing from '../../stuff/Thing';
import { makeStuff } from '../../security/__tests__/test-setup';

class Trinket extends BlessableMixin(Thing) {}

/** A roll that walks the [0,1) range deterministically. */
function rollAt(t: number): () => number {
  return () => t;
}

describe('Blessing.draw — weights, not percentages', () => {
  it('draws each band in proportion, and needs no total', () => {
    const odds: BlessingOdds = { cursed: 1, uncursed: 8, blessed: 1 };
    // Bands are ordered cursed → uncursed → blessed, so the cumulative
    // cuts sit at 0.1 and 0.9 of the total.
    expect(Blessing.draw(odds, rollAt(0.05)).getBand()).toBe('cursed');
    expect(Blessing.draw(odds, rollAt(0.5)).getBand()).toBe('uncursed');
    expect(Blessing.draw(odds, rollAt(0.95)).getBand()).toBe('blessed');
  });

  it('weights need not sum to anything — 3/95/2 and 6/190/4 agree', () => {
    const a: BlessingOdds = { cursed: 3, uncursed: 95, blessed: 2 };
    const b: BlessingOdds = { cursed: 6, uncursed: 190, blessed: 4 };
    for (const t of [0.01, 0.02, 0.5, 0.97, 0.99]) {
      expect(Blessing.draw(a, rollAt(t)).getBand()).toBe(
        Blessing.draw(b, rollAt(t)).getBand(),
      );
    }
  });

  it('an ABSENT band weighs nothing — no zeroes to spell out', () => {
    // "Never anything but ordinary", said the short way.
    const only: BlessingOdds = { uncursed: 1 };
    for (const t of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(Blessing.draw(only, rollAt(t)).getBand()).toBe('uncursed');
    }
    // And a table that omits `blessed` never produces one.
    const noBless: BlessingOdds = { cursed: 1, uncursed: 1 };
    for (const t of [0, 0.4, 0.6, 0.999]) {
      expect(Blessing.draw(noBless, rollAt(t)).getBand()).not.toBe('blessed');
    }
  });

  it('an empty or all-zero table is ORDINARY, never a throw', () => {
    // A content gap degrades to the overwhelming default rather than
    // taking down a spawn sweep.
    expect(Blessing.draw({}, rollAt(0.5)).getBand()).toBe('uncursed');
    expect(Blessing.draw(null, rollAt(0.5)).getBand()).toBe('uncursed');
    expect(
      Blessing.draw({ cursed: 0, uncursed: 0 }, rollAt(0.5)).getBand(),
    ).toBe('uncursed');
    // Negatives and NaN are treated as absent rather than inverting the
    // draw — an author typo must not silently curse everything.
    expect(
      Blessing.draw({ cursed: -5, uncursed: 1 }, rollAt(0.1)).getBand(),
    ).toBe('uncursed');
  });

  it('hasOdds is the "did an author say anything usable" test', () => {
    expect(Blessing.hasOdds(null)).toBe(false);
    expect(Blessing.hasOdds({})).toBe(false);
    expect(Blessing.hasOdds({ cursed: 0 })).toBe(false);
    expect(Blessing.hasOdds({ cursed: 1 })).toBe(true);
  });
});

describe('applyMintOdds — the zone wins, and silence preserves intent', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });
  afterEach(() => vi.restoreAllMocks());

  function trinket(odds?: BlessingOdds, band = 'uncursed'): Trinket {
    const t = makeStuff(() => new Trinket());
    t.setBlessingBand(band);
    if (odds) t.setBlessingOdds(odds);
    return t;
  }

  it('an item with its own odds rolls on them', () => {
    const t = trinket({ cursed: 1 });
    t.applyMintOdds(null, rollAt(0.5));
    expect(t.getBlessingBand()).toBe('cursed');
  });

  it('a ZONE table overrides the item wholesale', () => {
    // Not merged, not averaged — "this PLACE is like that" replaces the
    // kind's baseline, the same way `zone.stocks` replaces regionTarget.
    const t = trinket({ blessed: 1 });
    t.applyMintOdds({ cursed: 1 }, rollAt(0.5));
    expect(t.getBlessingBand()).toBe('cursed');
  });

  it('neither side declaring leaves the AUTHORED band alone', () => {
    // The cursed exemplar's guarantee: a template that says `cursed`
    // stays cursed rather than being re-rolled to ordinary by a sweep
    // that had nothing to say.
    const t = trinket(undefined, 'cursed');
    t.applyMintOdds(null, rollAt(0.5));
    expect(t.getBlessingBand()).toBe('cursed');
  });

  it('an unusable zone table falls THROUGH to the item, not to ordinary', () => {
    const t = trinket({ blessed: 1 }, 'uncursed');
    t.applyMintOdds({}, rollAt(0.5));
    expect(t.getBlessingBand()).toBe('blessed');
  });

  it('odds are NOT glob identity — two items differing only in them merge', () => {
    // The odds that MADE an item are not a fact about it. Splitting a
    // stack on them would leak a generation parameter as instance state.
    const meta = (Trinket as unknown as { fieldMeta: Record<string, {
      globIdentity?: boolean;
    }> }).fieldMeta;
    expect(meta.blessingOdds?.globIdentity).toBeUndefined();
    expect(meta.blessingBucket?.globIdentity).toBe(true);
  });
});

describe('the roll happens at the random mint, and NOWHERE else', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });
  afterEach(() => vi.restoreAllMocks());

  it('constructing an item does not roll — intent survives', () => {
    // The whole design line. If the roll lived in `clone`, every test,
    // every `populates:` cascade, every crafted output and every shop
    // restock would be rolling dice — and an author cloning a wand to
    // look at it could be handed a cursed one.
    const t = makeStuff(() => new Trinket());
    t.setBlessingOdds({ cursed: 1 });
    expect(t.getBlessingBand()).toBe('uncursed');
    // It takes an explicit mint-time call to move it.
    t.applyMintOdds(null, rollAt(0.5));
    expect(t.getBlessingBand()).toBe('cursed');
  });
});
