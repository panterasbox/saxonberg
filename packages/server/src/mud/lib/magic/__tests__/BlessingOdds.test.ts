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

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Blessing, type BlessingOdds } from '../Blessing';
import { MagicEffects } from '../Effect';
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

describe('band-varying effects — the item owns the function, not the engine', () => {
  it('a scalar field resolves per band, in order', () => {
    const raw = { kind: 'inject-channel', channel: 'heat', energy: [1, 2, 4] };
    const cursed = MagicEffects.validateForBand(raw, 'cursed');
    const ordinary = MagicEffects.validate(raw);
    const blessed = MagicEffects.validateForBand(raw, 'blessed');
    expect((cursed as { energy: number }).energy).toBe(1);
    expect((ordinary as { energy: number }).energy).toBe(2);
    expect((blessed as { energy: number }).energy).toBe(4);
  });

  it('`validate` IS the uncursed case — so a cast is unchanged', () => {
    // A caster has no BUC. Casting must fire exactly what it always
    // fired, which is only true if the plain validate path picks the
    // middle step.
    const raw = { kind: 'adjust-reserve', reserveKey: 'mana', delta: [-5, 0, 5] };
    expect((MagicEffects.validate(raw) as { delta: number }).delta).toBe(0);
  });

  it('⭐ a SIGN INVERSION — the case a multiplier cannot express', () => {
    // The whole reason the engine must not own the function. There is no
    // scalar that turns "lift a curse" into "lay one"; it is the low end
    // of remove-curse's OWN axis, and only the working can say so.
    const raw = {
      kind: 'adjust-blessing',
      steps: [-1, 1, 1],
      limit: ['cursed', 'uncursed', 'blessed'],
    };
    const cursed = MagicEffects.validateForBand(raw, 'cursed') as {
      steps: number; limit: string;
    };
    const blessed = MagicEffects.validateForBand(raw, 'blessed') as {
      steps: number; limit: string;
    };
    expect(cursed.steps).toBe(-1); // it CURSES what you read it on
    expect(cursed.limit).toBe('cursed');
    expect(blessed.steps).toBe(1);
    expect(blessed.limit).toBe('blessed'); // consecrates past ordinary
  });

  it('a working with no band-varying field is band-INDIFFERENT', () => {
    // Honest, and the common case: most workings do not care about
    // potency, and saying nothing means exactly that.
    const raw = { kind: 'emit-field', field: 'light', locus: '/stuff/thing/magic/glowlight-mote' };
    expect(MagicEffects.validateForBand(raw, 'cursed')).toEqual(
      MagicEffects.validateForBand(raw, 'blessed'),
    );
  });

  it('`bands` is MEMBERSHIP — the piece field-variation cannot express', () => {
    // "A cursed wand also burns your hand" is an EXTRA effect, not a
    // different number, so field variation alone cannot say it. The
    // directive is consumed at catalogue build and never reaches an
    // executor.
    const bolt = { kind: 'inject-channel', channel: 'heat', energy: [1, 2, 4] };
    const backfire = {
      kind: 'inject-channel',
      bands: ['cursed'],
      self: true,
      channel: 'heat',
      energy: 3,
    };
    const authored = [bolt, backfire];
    const at = (band: string) =>
      authored.filter((e) => {
        const b = (e as { bands?: string[] }).bands;
        return !Array.isArray(b) || b.includes(band);
      });
    expect(at('cursed')).toHaveLength(2); // bolt + backfire
    expect(at('uncursed')).toHaveLength(1); // bolt only
    expect(at('blessed')).toHaveLength(1);
  });

  it('`self` redirects to the ACTOR — deliberately, not as a fallback', () => {
    // Distinct from the shipped `target ?? ctx.actor`, which only fires
    // when nothing was aimed at. Backfire redirects WITH a target in
    // hand, which is the whole point.
    const e = MagicEffects.validate({
      kind: 'inject-channel',
      channel: 'heat',
      energy: 3,
      self: true,
    });
    expect((e as { self?: boolean }).self).toBe(true);
    const plain = MagicEffects.validate({
      kind: 'inject-channel',
      channel: 'heat',
      energy: 3,
    });
    expect((plain as { self?: boolean }).self).toBeUndefined();
  });

  it('the ENGINE owns only the ordering — an author cannot invert it', () => {
    // `Blessing.pick` indexes the list; there is no way to author
    // "cursed is the good one" except by writing it in the good slot,
    // which is the point of the primitive being engine-side.
    const raw = { kind: 'inject-channel', channel: 'heat', energy: [9, 5, 1] };
    // Authored backwards, it faithfully produces a backwards item —
    // monotonicity is a SEMANTIC contract on the author, not a lint.
    expect(
      (MagicEffects.validateForBand(raw, 'cursed') as { energy: number }).energy,
    ).toBe(9);
  });
});
