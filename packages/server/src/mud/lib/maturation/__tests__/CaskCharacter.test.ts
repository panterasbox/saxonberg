/**
 * ⭐⭐⭐ **The cask matters** — the wall's give, `productAtFraction`, the age
 * statement, and the wall's memory.
 *
 * The decisions under test:
 *
 *   1. ⭐ **What a cask gives is its WALL's** (matter-model-overlaps D11,
 *      re-baselined from the vessel's `imparts`): the giving layer — a
 *      char coat inside, else the oak body — gives its material's
 *      `imparts` toward full over `faces.wallGiveDays` of contact, spent a
 *      third a fill after the first. Two casks of the same wood holding the
 *      same spirit still yield two different whiskies: one has a coat.
 *      Here the give days are pinned to the test profile's ten-day length,
 *      as the shipped dial is to the whiskey profile's ninety.
 *   2. **`productAtFraction` makes *when to bottle* a decision.** There
 *      is drawable product before the batch finishes, graded by how far
 *      along it is — so impatience costs quality, and the Lounge's sour
 *      (`minGrade: fair`) is the consumer that prices it.
 *   3. **The age statement is the MINIMUM across a blend**, never the
 *      average, because that is what an age statement means.
 *
 * ⚠ The idempotence test is the one that would catch the real bug: the
 * write is reconcile-on-read, so a give that is not path-independent would
 * climb every time anybody looked at the cask.
 *
 *   4. ⭐⭐ **An absorbent wall remembers** (D11): it learns a share of what
 *      the contents give a nose — their own smells included — gives it
 *      back to the next fill, loses what it gives, and a wash spends it.
 *      A pitch coat seals both sources; a lead glaze still leaches.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Vat from '../../../platform/thing/Vat';
import MaturationProfile from '../../../lib/maturation/MaturationProfile';
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
import { rememberProfile } from './profiles';
import Wood from '../../../platform/idea/material/Wood';
import Water from '../../../platform/idea/material/Water';
import Acid from '../../../platform/idea/material/Acid';
import PigmentPaint from '../../../platform/idea/material/PigmentPaint';
import { PerceptionApi } from '../../../api/perception';
import { AppApi } from '../../../api/app';
import { MixinApi } from '../../../api/mixin';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import type { AnyConstructor } from '../../../api/mixin';
import { ProxyApi } from '../../../api/proxy';

const OAK = '/base-library/aromas/oak';
const VANILLA = '/base-library/aromas/vanilla';
const CHAR = '/base-library/aromas/char';
const SMOKE = '/base-library/aromas/smoke';
const WHISKY_NOSE = '/base-library/aromas/testwhisky';

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
  rememberProfile(() => {
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

let woodSeq = 0;
/** A wood whose wall gives `imparts`; `absorbent` makes it remember. */
function wood(imparts: { type: string; amount: number }[], tags: string[] = ['wood']): Wood {
  woodSeq += 1;
  return makeStuffAtPath(() => {
    const m = new Wood();
    m.setName(`test-wood-${woodSeq}`);
    m.setTags(tags);
    m.setDensity(Quantity.of(750, 'kg/m³'));
    m.setWaterAbsorptionCapacity(Quantity.of(28, '%'));
    void m.setImparts(imparts);
    return m;
  }, `/stuff/idea/material/_test/wood-${woodSeq}`);
}

/**
 * A cask. `imparts` is what its oak body gives its contents; `coat`, a
 * material laid set on its inside face (a char, a pitch, a glaze).
 */
function cask(
  imparts: { type: string; amount: number }[] = [],
  opts: { tags?: string[]; coat?: { getTemplatePath(): string | null } } = {},
): Vat {
  const v = makeStuff(() => new Vat());
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(25, 'L'));
  v.lastAmbientK = 290;
  v.stampedTemperatureK = 290;
  v.setOpen(true);
  if (imparts.length > 0 || opts.tags) v.setMaterial(wood(imparts, opts.tags));
  if (opts.coat) {
    void v.setCoats({ inside: [{ material: opts.coat.getTemplatePath()!, thicknessM: 0.002, state: 'set' }] });
  }
  return v;
}

/** The char a cooper's fire lays: vanilla and char, a little oak. */
function charCoat(amounts: { type: string; amount: number }[] = [
  { type: VANILLA, amount: 40 },
  { type: CHAR, amount: 120 },
  { type: OAK, amount: 15 },
]): Wood {
  return wood(amounts, ['wood', 'char']);
}

function pail(band: string, litres: number): Pail {
  const p = makeStuff(() => new Pail());
  (p as unknown as { interiorBulk: boolean }).interiorBulk = true;
  p.setInteriorCapacity(Quantity.of(50, 'L'));
  (p as unknown as { interiorMaterial: string }).interiorMaterial = SPIRIT;
  p.setInteriorAmount(Quantity.of(litres, 'L'));
  // The cut's grade is the SPIRIT's — its payload's (matter-model-overlaps D2).
  slotOf(p).setPayload({ grade: Grade.of(band).getBand() });
  return p;
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
  for (const [path, threshold] of [
    [OAK, 0.07],
    [VANILLA, 0.1],
    [CHAR, 0.3],
    [SMOKE, 0.01],
    [WHISKY_NOSE, 0.1],
  ] as const) {
    PerceptionApi.aromas().remember(path, { threshold }, null);
  }
  // ⭐ The wall gives over the test profile's own ten days, as the shipped
  // `faces.wallGiveDays` is the whiskey profile's ninety.
  const setting = AppApi.setting.bind(AppApi);
  vi.spyOn(AppApi, 'setting').mockImplementation((key: string) =>
    key === 'faces.wallGiveDays' ? '10' : setting(key),
  );
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
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐⭐ the wall gives — the cask writes its character (D11)', () => {
  it('a cask whose wall gives NOTHING leaves the payload untouched', () => {
    // ⭐ The host-placement claim, proved: every Faced vessel can answer,
    // and for a wall whose material imparts nothing it is vacuous.
    profile();
    const v = cask();
    fill(pail('fine', 25), v, 20);
    age(v, 12);
    expect(slotOf(v).getPayload()?.dissolvedAromatics).toBeUndefined();
  });

  it('gives its figures into the contents over the contact time', () => {
    profile();
    const v = cask([{ type: OAK, amount: 25 }]);
    fill(pail('fine', 25), v, 20);
    // Five of the ten give days: about half.
    age(v, 5);
    const half = aromaOf(v, OAK);
    expect(half).toBeGreaterThan(10);
    expect(half).toBeLessThan(15);
    age(v, 6);
    expect(aromaOf(v, OAK)).toBeCloseTo(25, 4);
  });

  it('⚠ is IDEMPOTENT across repeated reads — the reconcile-on-read trap', () => {
    // A give that compounded per read would climb every time anybody so
    // much as looked at the cask, and nothing would say so: a `look` would
    // make the whisky woodier. The give is linear and capped.
    profile();
    const v = cask([{ type: OAK, amount: 25 }]);
    fill(pail('fine', 25), v, 20);
    age(v, 12);
    const settled = aromaOf(v, OAK);
    for (let i = 0; i < 20; i++) v.getMaturationPhase();
    expect(aromaOf(v, OAK)).toBeCloseTo(settled, 9);
  });

  it('⭐⭐ two casks of the SAME WOOD make two different whiskies', () => {
    // Both bodies are the same oak; the charred one has a char coat
    // inside, and the coat is the giving layer.
    profile();
    const oak = [
      { type: OAK, amount: 25 },
      { type: VANILLA, amount: 3 },
    ];
    const plain = cask(oak);
    const charred = cask(oak, { coat: charCoat() });
    fill(pail('fine', 25), plain, 20);
    fill(pail('fine', 25), charred, 20);
    age(plain, 12);
    age(charred, 12);
    expect(aromaOf(plain, OAK)).toBeCloseTo(25, 4);
    expect(aromaOf(charred, OAK)).toBeCloseTo(15, 4);
    expect(aromaOf(charred, VANILLA)).toBeGreaterThan(aromaOf(plain, VANILLA));
    expect(aromaOf(charred, CHAR)).toBeCloseTo(120, 4);
    expect(aromaOf(plain, CHAR)).toBe(0);
  });

  it('adds to what the spirit already carried, never replacing it', () => {
    // A peated spirit in a charred cask is both things. Nothing the cask
    // does erases what the still gave up.
    profile();
    const v = cask([{ type: CHAR, amount: 120 }]);
    const p = pail('fine', 25);
    slotOf(p).setPayload({
      ...(slotOf(p).getPayload() ?? {}),
      dissolvedAromatics: [{ type: SMOKE, amount: 75 }],
    });
    fill(p, v, 20);
    age(v, 12);
    expect(aromaOf(v, SMOKE)).toBeCloseTo(75, 4);
    expect(aromaOf(v, CHAR)).toBeCloseTo(120, 4);
  });

  it('starts over for a new batch — a refilled cask does not double up', () => {
    profile();
    const v = cask([{ type: OAK, amount: 25 }]);
    fill(pail('fine', 25), v, 20);
    age(v, 12);
    // Empty it and refill: a fresh batch, a fresh extraction.
    slotOf(v).setAmount(Quantity.of(0, 'L'));
    v.getMaturationPhase();
    fill(pail('fine', 25), v, 20);
    age(v, 12);
    // A fresh extraction, not a doubled one — at the second fill's
    // strength, because a wall spends a third of its give per fill after
    // the first (`faces.wallSpentPerFill`).
    expect(aromaOf(v, OAK)).toBeCloseTo(25 * 0.66, 4);
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
    const young = slotOf(v).getPayload()?.grade;
    expect(young).toBe('poor');
    age(v, 8); // to the end
    // ⭐ And at full conversion the maturity term stops binding, so the
    // band is the FILL's again — the cut's grade, not the cask's.
    expect(slotOf(v).getPayload()?.grade).toBe('masterful');
  });

  it('⚠ never RAISES a band — the input cap still rules', () => {
    // Weakest-link all the way down: a `fair` cut left in oak for a
    // year is still fair whisky. Time improves whiskey; it does not
    // absolve a distiller.
    profile(0.25);
    const v = cask();
    fill(pail('fair', 25), v, 20);
    age(v, 12);
    expect(slotOf(v).getPayload()?.grade).toBe('fair');
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

describe('⭐⭐ the wall SPENDS its give fill by fill, and a re-fire restores it (D11)', () => {
  /** Empty the cask into a waiting pail — the batch is done with. */
  function rack(v: Vat): void {
    const sink = pail('fine', 0);
    BulkableApi.transfer(slotOf(v), slotOf(sink), { kind: 'all', mode: 'strict' } as never);
  }
  function oneFill(v: Vat, type = OAK): number {
    fill(pail('fine', 25), v, 20);
    age(v, 12);
    const got = aromaOf(v, type);
    rack(v);
    return got;
  }

  it('the first fill gives all of it; each after gives a third less; the fourth nothing', () => {
    profile();
    const v = cask([{ type: OAK, amount: 30 }]);
    const first = oneFill(v);
    const second = oneFill(v);
    const third = oneFill(v);
    const fourth = oneFill(v);
    expect(first).toBeCloseTo(30, 3);
    expect(second).toBeCloseTo(30 * 0.66, 3);
    expect(third).toBeCloseTo(30 * 0.32, 3);
    expect(fourth).toBeCloseTo(0, 6);
    expect(v.wallGiveLeft('inside')).toBe(0);
    // ⭐ …and a look says so — the line the retired maturation augmenter
    // printed, read off the wall's spent now.
    fill(pail('fine', 25), v, 5);
    v.setLongDescription('A cask.');
    expect(v.getMarkupLong(v as never, {})).toMatch(/given its contents everything it had/);
  });

  it('⭐ a fill is counted by the TRANSFER into an empty wall — a top-up is not a fill', () => {
    profile();
    const v = cask([{ type: OAK, amount: 30 }]);
    expect(v.wallGiveLeft('inside')).toBe(1);
    fill(pail('fine', 25), v, 10);
    expect(v.wallGiveLeft('inside')).toBe(1); // the first is free
    fill(pail('fine', 25), v, 10); // a top-up
    expect(v.wallGiveLeft('inside')).toBe(1);
    rack(v);
    fill(pail('fine', 25), v, 10);
    expect(v.wallGiveLeft('inside')).toBeCloseTo(0.66, 9);
  });

  it('a coat keeps its own spent; the body under it is untouched', () => {
    profile();
    const v = cask([{ type: OAK, amount: 30 }], { coat: charCoat() });
    oneFill(v, CHAR);
    oneFill(v, CHAR);
    expect(v.getCoats('inside')[0]?.spent).toBeCloseTo(0.34, 9);
    expect(v.wallSpent.inside).toBeUndefined();
  });

  it('⭐ a re-fire restores it — and a plain cask comes back CHARRED', async () => {
    profile();
    const v = cask([{ type: OAK, amount: 30 }]);
    const char = charCoat([{ type: CHAR, amount: 100 }]);
    for (let i = 0; i < 4; i++) oneFill(v);
    expect(v.wallGiveLeft('inside')).toBe(0);
    // `refireFace` is the cooper's — gated to CraftingLogic's repair rung,
    // whose own gate and bill read are the repair tests'. The raw target
    // stands in for the rung (the documented test seam).
    const raw = (v as unknown as Record<symbol, Vat>)[ProxyApi.RAW_TARGET]!;
    raw.refireFace('inside', char.getTemplatePath()!);
    expect(v.wallGiveLeft('inside')).toBe(1);
    expect(v.getCoats('inside')[0]?.material).toBe(char.getTemplatePath());
    fill(pail('fine', 25), v, 20);
    age(v, 12);
    expect(aromaOf(v, CHAR)).toBeCloseTo(100, 3);
    expect(aromaOf(v, OAK)).toBe(0);
  });
});

describe('⭐⭐ an absorbent wall REMEMBERS — learn, give back, run out, wash (D11)', () => {
  let seq = 0;
  /** A liquid; `nose` is its own smell, OU/kg (as mg/L: × the aroma's threshold). */
  async function liquid(nose = 0): Promise<Water> {
    seq += 1;
    const m = makeStuffAtPath(() => {
      const w = new Water();
      w.setName(`test-liquid-${seq}`);
      w.setTags(['liquid']);
      w.setDensity(Quantity.of(1000, 'kg/m³'));
      return w;
    }, `/stuff/idea/material/_test/liquid-${seq}`);
    if (nose > 0) await m.setSmells([{ aroma: WHISKY_NOSE, strength: nose }]);
    return m;
  }
  /** Fill `v` empty with `litres` of `m`. */
  function pour(v: Vat, m: Water, litres = 20): void {
    const p = makeStuff(() => new Pail());
    (p as unknown as { interiorBulk: boolean }).interiorBulk = true;
    p.setInteriorCapacity(Quantity.of(50, 'L'));
    p.setBulkMaterial('interior', m);
    p.setInteriorAmount(Quantity.of(litres, 'L'));
    fill(p, v, litres);
  }
  function empty(v: Vat): void {
    const sink = pail('fine', 0);
    BulkableApi.transfer(slotOf(v), slotOf(sink), { kind: 'all', mode: 'strict' } as never);
  }
  function kept(v: Vat): number {
    return v.absorbedAromas('inside').find((a) => a.type === WHISKY_NOSE)?.amount ?? 0;
  }
  function memoryCask(): Vat {
    return cask([], { tags: ['wood', 'absorbent'] });
  }

  it('learns a share of what the contents give a nose — their own smell included', async () => {
    const v = memoryCask();
    // 50 OU/kg × 0.1 mg/L per OU = 5 mg/L; the wall keeps a tenth.
    pour(v, await liquid(50));
    age(v, 2);
    expect(kept(v)).toBeCloseTo(0.5, 6);
  });

  it('⭐ gives it back to the next fill — water in a whiskey cask tastes of whiskey — and LOSES what it gives', async () => {
    const v = memoryCask();
    pour(v, await liquid(50));
    age(v, 2);
    empty(v);
    const water = await liquid();
    pour(v, water);
    age(v, 5);
    // The wall and the water meet halfway.
    expect(aromaOf(v, WHISKY_NOSE)).toBeCloseTo(0.25, 3);
    expect(kept(v)).toBeCloseTo(0.25, 3);
  });

  it('runs out — each fill of water takes half of what is left', async () => {
    const v = memoryCask();
    pour(v, await liquid(50));
    age(v, 2);
    const water = await liquid();
    const got: number[] = [];
    for (let i = 0; i < 3; i++) {
      empty(v);
      pour(v, water);
      age(v, 5);
      got.push(aromaOf(v, WHISKY_NOSE));
    }
    expect(got[0]).toBeCloseTo(0.25, 3);
    expect(got[1]).toBeCloseTo(0.125, 3);
    expect(got[2]).toBeCloseTo(0.0625, 3);
  });

  it('⭐ a wash halves it (`faces.washClears`), and never touches the wall\'s own give', async () => {
    const v = cask([{ type: OAK, amount: 30 }], { tags: ['wood', 'absorbent'] });
    pour(v, await liquid(50));
    age(v, 2);
    empty(v);
    const before = kept(v);
    const spentBefore = v.wallSpent.inside;
    v.washSite({ waterK: 340, hardnessDgh: 0, cleansers: [], effort: 3 });
    expect(kept(v)).toBeCloseTo(before / 2, 9);
    expect(v.wallSpent.inside).toBe(spentBefore);
  });

  it('⭐ a pitch coat seals the wall — neither the oak nor its memory reaches the ale', async () => {
    const pitch = makeStuffAtPath(() => {
      const m = new PigmentPaint();
      m.setName('test-pitch');
      m.setTags(['waterproofing']);
      return m;
    }, '/stuff/idea/material/_test/pitch');
    const v = cask([{ type: OAK, amount: 30 }], { tags: ['wood', 'absorbent'], coat: pitch });
    expect(v.isSealed('inside')).toBe(true);
    pour(v, await liquid(50));
    age(v, 12);
    expect(aromaOf(v, OAK)).toBe(0);
    expect(v.absorbedAromas('inside')).toEqual([]);
    expect(v.wallGiveLeft('inside')).toBeNull();
  });

  it('⭐ the leach still runs under a sealed glaze — the coat\'s own', () => {
    const glaze = makeStuffAtPath(() => {
      const m = new PigmentPaint();
      m.setName('test-lead-glaze');
      m.setTags(['glaze']);
      m.setLeaches([{ toxin: 'lead', mgPerLPerDay: 4 }]);
      return m;
    }, '/stuff/idea/material/_test/lead-glaze');
    const vinegar = makeStuffAtPath(() => {
      const m = new Acid();
      m.setName('test-vinegar');
      m.setTags(['liquid']);
      m.setPh(2.4);
      return m;
    }, '/stuff/idea/material/_test/vinegar');
    const v = cask([{ type: OAK, amount: 30 }], { tags: ['wood', 'absorbent'], coat: glaze });
    pour(v, vinegar as unknown as Water);
    age(v, 7);
    const lead = slotOf(v).getPayload()?.dissolvedToxins?.find((t) => t.type === 'lead')?.amount ?? 0;
    expect(lead).toBeGreaterThan(20);
    expect(aromaOf(v, OAK)).toBe(0);
  });

  it('⭐ restores what it remembers and what it has spent — absorbed, wallSpent, a coat\'s spent', async () => {
    const v = cask([{ type: OAK, amount: 30 }], { tags: ['wood', 'absorbent'], coat: charCoat() });
    pour(v, await liquid(50));
    age(v, 2);
    empty(v);
    pour(v, await liquid(50));
    age(v, 1);
    v.wallSpent = { inside: 0.34 };
    const faced = MixinApi.getPersistenceContributors(Vat as unknown as AnyConstructor).find(
      (c) => c.key === 'FacedMixin',
    );
    if (!faced?.captureSlice) throw new Error('FacedMixin contributes no slice');
    const slice = JSON.parse(JSON.stringify(faced.captureSlice(v, {} as never))) as {
      fields: Record<string, unknown>;
    };
    expect(Object.keys(slice.fields)).toEqual(expect.arrayContaining(['absorbed', 'wallSpent', 'coats']));
    makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
    const applier = await StuffApi.singleton<TemplateApplier>(TemplateApplier.templatePath);
    const fresh = cask();
    await applier.apply(fresh, slice.fields, { mode: 'restore' });
    expect(fresh.absorbedAromas('inside')).toEqual(v.absorbedAromas('inside'));
    expect(fresh.wallSpent).toEqual({ inside: 0.34 });
    expect(fresh.getCoats('inside')[0]?.spent).toBeCloseTo(0.34, 9);
  });
});
