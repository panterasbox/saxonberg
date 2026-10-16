/**
 * ⭐⭐⭐ **The cask matters** — `imparts`, `productAtFraction`, and the age
 * statement.
 *
 * Three decisions under test, and each one answers a question the
 * predecessor build could not:
 *
 *   1. **`imparts` is on the VESSEL**, written by the clock. Two casks
 *      of the same wood holding the same spirit yield two different
 *      whiskies, and a second cask is a ROW. (Not the profile: it keys
 *      on the liquid, so two profiles would be two rows claiming one
 *      tag. Not the wood material: a charred first-fill and a plain
 *      third-fill are both oak.)
 *   2. **`productAtFraction` makes *when to bottle* a decision.** There
 *      is drawable product before the batch finishes, graded by how far
 *      along it is — so impatience costs quality, and the Lounge's sour
 *      (`minGrade: fair`) is the consumer that prices it.
 *   3. **The age statement is the MINIMUM across a blend**, never the
 *      average, because that is what an age statement means.
 *
 * ⚠ The idempotence test is the one that would catch the real bug: the
 * write is reconcile-on-read, so without the `impartedFraction` marker
 * the oak would climb every time anybody looked at the cask.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Vat from '../../../platform/thing/Vat';
import MaturationProfile from '../../../platform/idea/maturation/MaturationProfile';
import Material from '../../material/Material';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { Grade } from '../../craft/Grade';
import { CraftedMixin } from '../../craft/Crafted';
import { BulkableMixin } from '../../bulk/Bulkable';
import Good from '../../stuff/Good';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { TemplatePaths } from '../../paths';

const SPIRIT = '/stuff/idea/material/_test/cask-spirit';
const WHISKY = '/stuff/idea/material/_test/cask-whisky';
const SCALE = 12;
let real = 0;

class Pail extends CraftedMixin(BulkableMixin(Good)) {
  static _mixinName = 'CaskCharacterPail';
}

function material(path: string, tags: string[]): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setTags(tags);
    return m;
  }, path);
}

/** The aging profile. `p` is `productAtFraction`. */
function profile(p = 1): void {
  makeStuffAtPath(() => {
    const prof = new MaturationProfile();
    prof.setKey('cask-test');
    prof.setMechanism('chemical');
    prof.setInputCategory('cask-spirit');
    prof.setStallBelowK(270);
    prof.setHappyK(290);
    prof.setDamageAboveK(320);
    // A tenth of the batch per game-day — ten days end to end, so a
    // single `age()` step lands on a known fraction.
    prof.setRatePerDay(0.1);
    prof.setProductMaterial(WHISKY);
    prof.productAtFraction = p;
    return prof;
  }, '/stuff/idea/maturation/_test/cask-test');
}

/** A cask. `imparts` is what this barrel gives its contents. */
function cask(imparts: { type: string; amount: number }[] = []): Vat {
  const v = makeStuff(() => new Vat());
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(25, 'L'));
  v.lastAmbientK = 290;
  v.stampedTemperatureK = 290;
  v.setOpen(true);
  v.imparts = imparts;
  return v;
}

function pail(band: string, litres: number): Pail {
  const p = makeStuff(() => new Pail());
  (p as unknown as { interiorBulk: boolean }).interiorBulk = true;
  p.setInteriorCapacity(Quantity.of(50, 'L'));
  (p as unknown as { interiorMaterial: string }).interiorMaterial = SPIRIT;
  p.setInteriorAmount(Quantity.of(litres, 'L'));
  graded(p).setGrade(Grade.of(band));
  return p;
}

function graded(v: unknown): {
  setGrade(g: Grade): void;
  getGradeBand(): string;
} {
  return v as { setGrade(g: Grade): void; getGradeBand(): string };
}

function slotOf(v: unknown) {
  return BulkableApi.slotFor(v as never, undefined)!;
}

function fill(from: unknown, to: unknown, litres: number): void {
  BulkableApi.transfer(slotOf(from), slotOf(to), {
    kind: 'measure',
    litres,
    mode: 'strict',
  });
}

/** Advance `gameDays` of cellar time, reading as the world would. */
function age(v: Vat, gameDays: number): void {
  let remaining = gameDays * 86_400;
  while (remaining > 0) {
    const step = Math.min(3600, remaining);
    real += (step / SCALE) * 1000;
    v.getMaturationPhase();
    remaining -= step;
  }
}

function aromaOf(v: unknown, type: string): number {
  return (
    slotOf(v)
      .getPayload()
      ?.dissolvedAromatics?.find((t) => t.type === type)?.amount ?? 0
  );
}

beforeEach(() => {
  installV1QuantityMarshallers();
  // ⚠⚠ Without the registry Stuff the cask's clock reads `null` —
  // *nothing is happening* — and every assertion below passes
  // vacuously against an idle batch.
  stampTemplatePathForTest(
    makeStuff(() => new WorldClockRegistry()),
    TemplatePaths.worldClockRegistry,
  );
  WorldClockApi._resetForTesting();
  real = 100_000;
  WorldClockApi._setNowProviderForTesting(() => real);
  material(SPIRIT, ['liquid', 'spirit', 'cask-spirit']);
  material(WHISKY, ['liquid', 'spirit', 'whiskey']);
});

afterEach(() => {
  StuffApi.clearAll();
});

describe('⭐⭐ imparts — the cask writes its character', () => {
  it('a cask authoring NOTHING leaves the payload untouched', () => {
    // ⭐ The host-placement claim, proved: every Vat composes this, and
    // for a row that authors none it is vacuous. No guard re-narrows the
    // host set because none is needed.
    profile();
    const v = cask();
    fill(pail('fine', 25), v, 20);
    age(v, 12);
    expect(slotOf(v).getPayload()?.dissolvedAromatics).toBeUndefined();
  });

  it('writes its figures into the contents as the batch converts', () => {
    profile();
    const v = cask([{ type: 'oak', amount: 25 }]);
    fill(pail('fine', 25), v, 20);
    // Half the batch at 0.1/day is five game-days.
    age(v, 5);
    const half = aromaOf(v, 'oak');
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(25);
    age(v, 6);
    expect(aromaOf(v, 'oak')).toBeCloseTo(25, 4);
  });

  it('⚠ is IDEMPOTENT across repeated reads — the reconcile-on-read trap', () => {
    // Without the `impartedFraction` marker the oak would climb every
    // time anybody so much as looked at the cask, and nothing would say
    // so: a `look` would make the whisky woodier.
    profile();
    const v = cask([{ type: 'oak', amount: 25 }]);
    fill(pail('fine', 25), v, 20);
    age(v, 12);
    const settled = aromaOf(v, 'oak');
    for (let i = 0; i < 20; i++) v.getMaturationPhase();
    expect(aromaOf(v, 'oak')).toBeCloseTo(settled, 9);
  });

  it('⭐⭐ two casks of the SAME WOOD make two different whiskies', () => {
    // The argument for `imparts` living on the vessel. Both are oak;
    // what differs is this barrel's own history.
    profile();
    const plain = cask([
      { type: 'oak', amount: 25 },
      { type: 'vanilla', amount: 3 },
    ]);
    const charred = cask([
      { type: 'vanilla', amount: 40 },
      { type: 'char', amount: 120 },
      { type: 'oak', amount: 15 },
    ]);
    fill(pail('fine', 25), plain, 20);
    fill(pail('fine', 25), charred, 20);
    age(plain, 12);
    age(charred, 12);
    expect(aromaOf(plain, 'oak')).toBeGreaterThan(aromaOf(charred, 'oak'));
    expect(aromaOf(charred, 'vanilla')).toBeGreaterThan(
      aromaOf(plain, 'vanilla'),
    );
    expect(aromaOf(charred, 'char')).toBeGreaterThan(0);
    expect(aromaOf(plain, 'char')).toBe(0);
  });

  it('adds to what the spirit already carried, never replacing it', () => {
    // A peated spirit in a charred cask is both things. Nothing the cask
    // does erases what the still gave up.
    profile();
    const v = cask([{ type: 'char', amount: 120 }]);
    const p = pail('fine', 25);
    slotOf(p).setPayload({
      ...(slotOf(p).getPayload() ?? {}),
      dissolvedAromatics: [{ type: 'smoke', amount: 75 }],
    });
    fill(p, v, 20);
    age(v, 12);
    expect(aromaOf(v, 'smoke')).toBeCloseTo(75, 4);
    expect(aromaOf(v, 'char')).toBeCloseTo(120, 4);
  });

  it('starts over for a new batch — a refilled cask does not double up', () => {
    profile();
    const v = cask([{ type: 'oak', amount: 25 }]);
    fill(pail('fine', 25), v, 20);
    age(v, 12);
    // Empty it and refill: a fresh batch, a fresh extraction.
    slotOf(v).setAmount(Quantity.of(0, 'L'));
    v.getMaturationPhase();
    fill(pail('fine', 25), v, 20);
    age(v, 12);
    // A fresh extraction, not a doubled one — at the second fill's
    // strength, because a cask spends a third of its character per fill
    // (assembly D9; the refill used to give the whole of it again).
    expect(aromaOf(v, 'oak')).toBeCloseTo(25 * 0.66, 4);
  });
});

describe('⭐⭐ productAtFraction — when to bottle is a decision', () => {
  it('⚠ a profile at 1 behaves EXACTLY as before', () => {
    // The whole shipped roster. Nothing below full conversion is product.
    profile(1);
    const v = cask();
    fill(pail('fine', 25), v, 20);
    age(v, 5);
    expect(slotOf(v).getMaterialPath()).toBe(SPIRIT);
    age(v, 6);
    expect(slotOf(v).getMaterialPath()).toBe(WHISKY);
  });

  it('holds drawable product from the authored fraction', () => {
    profile(0.25);
    const v = cask();
    fill(pail('fine', 25), v, 20);
    age(v, 1); // 10% — not yet
    expect(slotOf(v).getMaterialPath()).toBe(SPIRIT);
    age(v, 2); // 30% — whisky, and young
    expect(slotOf(v).getMaterialPath()).toBe(WHISKY);
  });

  it('⭐⭐ grades it by how far along it is — impatience costs quality', () => {
    profile(0.25);
    const v = cask();
    fill(pail('masterful', 25), v, 20);
    age(v, 3); // just past the product edge
    const young = graded(v).getGradeBand();
    expect(young).toBe('poor');
    age(v, 8); // to the end
    // ⭐ And at full conversion the maturity term stops binding, so the
    // band is the FILL's again — the cut's grade, not the cask's.
    expect(graded(v).getGradeBand()).toBe('masterful');
  });

  it('⚠ never RAISES a band — the input cap still rules', () => {
    // Weakest-link all the way down: a `fair` cut left in oak for a
    // year is still fair whisky. Time improves whiskey; it does not
    // absolve a distiller.
    profile(0.25);
    const v = cask();
    fill(pail('fair', 25), v, 20);
    age(v, 12);
    expect(graded(v).getGradeBand()).toBe('fair');
  });
});

describe('⭐⭐ the age statement', () => {
  it('stamps game-days on anything drawn out of the cask', () => {
    profile(0.25);
    const v = cask();
    fill(pail('fine', 25), v, 20);
    age(v, 6);
    const drawn = v.getBulkPayloadForDraw('interior', 1);
    expect(drawn?.maturedDays).toBeGreaterThan(5);
    expect(drawn?.maturedDays).toBeLessThan(7);
  });

  it('stamps nothing on a cask that has not started', () => {
    profile(0.25);
    const v = cask();
    expect(v.getBulkPayloadForDraw('interior', 1)?.maturedDays).toBeUndefined();
  });

  it('⭐⭐⭐ a blend reads the YOUNGEST half, not the average', () => {
    // The load-bearing decision, and what an age statement legally
    // means. 90 and 20 read TWENTY; averaging to 55 would be the one
    // way to ship this as a lie.
    const blended = BulkableApi.blendPayloads(
      { maturedDays: 90 },
      0.3,
      { maturedDays: 20 },
      0.45,
    );
    expect(blended.maturedDays).toBe(20);
    // ⚠ And volume does not sway it: an age statement is not a weighted
    // mean, so a drop of young spirit in a vat of old tells the truth.
    expect(
      BulkableApi.blendPayloads({ maturedDays: 20 }, 0.01, { maturedDays: 90 }, 10)
        .maturedDays,
    ).toBe(20);
  });

  it('⚠ an unaged parcel does not drag the statement to zero', () => {
    // Water, or new spirit, has nothing to SAY about age — it is not a
    // zero-day whisky. Only two aged parcels can make a blend younger
    // than its older half.
    expect(
      BulkableApi.blendPayloads({ maturedDays: 90 }, 1, {}, 1).maturedDays,
    ).toBe(90);
    expect(
      BulkableApi.blendPayloads({}, 1, {}, 1).maturedDays,
    ).toBeUndefined();
  });
});

describe('⭐⭐ the cask SPENDS its character fill by fill, and a re-fire restores it (assembly D9)', () => {
  /** Empty the cask into a waiting pail — the batch is done with. */
  function rack(v: Vat): void {
    const sink = pail('fine', 0);
    BulkableApi.transfer(slotOf(v), slotOf(sink), { kind: 'all', mode: 'strict' } as never);
  }
  function oneFill(v: Vat): number {
    fill(pail('fine', 25), v, 20);
    age(v, 12);
    const got = aromaOf(v, 'oak');
    rack(v);
    return got;
  }

  it('the first fill gives all of it; each after gives a third less; the fourth nothing', () => {
    profile();
    const v = cask([{ type: 'oak', amount: 30 }]);
    const first = oneFill(v);
    const second = oneFill(v);
    const third = oneFill(v);
    const fourth = oneFill(v);
    expect(first).toBeCloseTo(30, 3);
    expect(second).toBeCloseTo(30 * 0.66, 3);
    expect(third).toBeLessThan(second);
    expect(fourth).toBeCloseTo(0, 6);
    expect(v.getFillCount()).toBe(4);
    expect(v.isSpent()).toBe(true);
  });

  it('⭐ a re-fire restores it — and a plain cask comes back CHARRED', () => {
    profile();
    const v = cask([{ type: 'oak', amount: 30 }]);
    v.charredImparts = [{ type: 'char', amount: 100 }];
    for (let i = 0; i < 4; i++) oneFill(v);
    expect(v.isSpent()).toBe(true);
    v.refire();
    expect(v.getCharLevel()).toBe(1);
    expect(v.isSpent()).toBe(false);
    fill(pail('fine', 25), v, 20);
    age(v, 12);
    expect(aromaOf(v, 'char')).toBeCloseTo(100, 3);
    expect(aromaOf(v, 'oak')).toBe(0);
  });
});
