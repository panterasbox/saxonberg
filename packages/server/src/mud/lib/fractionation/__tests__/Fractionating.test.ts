/**
 * ⭐⭐ The run machine — a host whose interior yields in ordered fractions
 * as it is drawn.
 *
 * The test host is a generic `Fractionating(Thermal(Crafted(Bulkable(
 * Good))))` and the schedule is authored inline, so nothing here knows
 * the word whiskey. That is the AC12 claim under test as much as any
 * single assertion: **a different product is rows**. The last describe
 * block proves it with a six-fraction schedule carrying per-fraction heat
 * gates, which is the crude-oil shape, running on unchanged code.
 *
 * What each block is for:
 *
 *   - the state machine: a cold charge pours back out as what it is; heat
 *     starts the run and swaps the material; the residue swap at the floor.
 *   - the span blend: a pour that straddles a boundary carries both sides
 *     in proportion, which is the whole reason `payloadForDraw` takes the
 *     litres.
 *   - the read: lagged by competence, never gated, and ⚠ **silent** — the
 *     scene text either side of a boundary must be identical, because a
 *     message would turn a judgement into a prompt.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import Good from '../../stuff/Good';
import { BulkableMixin } from '../../bulk/Bulkable';
import { CraftedMixin } from '../../craft/Crafted';
import { ThermalMixin } from '../../thermal/Thermal';
import { FractionatingMixin } from '../Fractionating';
import FractionSchedule, { type FractionSpec } from '../FractionSchedule';
import { DissolvedToxins } from '../../metabolism/DissolvedToxins';
import { MixinApi } from '../../../api/mixin';
import Material from '../../material/Material';
import { Quantity } from '../../quantity';
import { Grade } from '../../craft/Grade';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

/**
 * The generic host. Nothing about it is a still.
 *
 * ⚠ `reachableHeatK()` is overridden to a settable field rather than
 * stubbed: in production it walks the environment for a lit, fuelled
 * burner, and standing a fire up in a unit test would be testing
 * `lib/fire`. The gate under test is *does the run start at the heat the
 * schedule asks for*, and the heat's provenance is the pack wave's.
 */
class TestColumn extends FractionatingMixin(
  ThermalMixin(CraftedMixin(BulkableMixin(Good))),
) {
  static _mixinName = 'FractionatingTestColumn';

  public testHeatK = 290;

  public override reachableHeatK(): number {
    return this.testHeatK;
  }
}

/** A plain Bulkable receiver — a bucket. */
class Pail extends CraftedMixin(BulkableMixin(Good)) {
  static _mixinName = 'FractionatingTestPail';
}

const CHARGE = '/stuff/idea/material/_test/fraction-charge';
const PRODUCT = '/stuff/idea/material/_test/fraction-product';
const RESIDUE = '/stuff/idea/material/_test/fraction-residue';
const SCHEDULE = '/stuff/idea/fractionation/_test/fraction-run';

/**
 * The inline schedule: a tenth of foreshots at a thousand-per-litre, a
 * fifth of heads at two hundred, half of hearts clean and `fine`, and a
 * last tenth of `poor` tails — leaving a tenth of residue. Hand-chosen
 * round numbers so every expected blend below can be worked out in the
 * head.
 */
const FRACTIONS: FractionSpec[] = [
  {
    key: 'foreshots',
    upTo: 0.1,
    character: 'It reeks of solvent and nail varnish.',
    gradeBand: 'poor',
    toxins: [{ type: 'methanol', amount: 1000 }],
  },
  {
    key: 'heads',
    upTo: 0.3,
    character: 'Sharp and hot, with an edge that bites.',
    gradeBand: 'fair',
    toxins: [{ type: 'methanol', amount: 200 }],
  },
  {
    key: 'hearts',
    upTo: 0.8,
    character: 'Clean and sweet, with the grain showing through.',
    gradeBand: 'fine',
  },
  {
    key: 'tails',
    upTo: 0.9,
    character: 'Flat and oily, going dull at the back.',
    gradeBand: 'poor',
  },
];

function material(path: string, tags: string[] = []): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setTags(tags);
    return m;
  }, path);
}

function schedule(
  fractions: FractionSpec[] = FRACTIONS,
  over: Partial<{
    requiresHeatK: number;
    readBlur: number;
    gradeStretch: number;
    discipline: string;
  }> = {},
): FractionSchedule {
  return makeStuffAtPath(() => {
    const s = new FractionSchedule();
    s.setKey('test-run');
    s.setInputCategory('test-charge');
    s.setProductMaterial(PRODUCT);
    s.setResidueMaterial(RESIDUE);
    s.setRequiresHeatK(over.requiresHeatK ?? 350);
    s.setReadBlur(over.readBlur ?? 0);
    s.setGradeStretch(over.gradeStretch ?? 0);
    s.setDiscipline(over.discipline ?? 'test-distilling');
    s.setFractions(fractions);
    return s;
  }, SCHEDULE);
}

/**
 * ⚠⚠ `band` is NOT optional decoration. The host's Graded face caps every
 * draw at the charge's own grade (D10/D11 — weakest-link: the hearts of a
 * mediocre wash are mediocre spirit), and `CraftedMixin`'s default band is
 * `fair`. So a column nobody graded caps everything at `fair`, and a test
 * expecting to see a fraction's own `fine` has to say what it charged the
 * pot with. In production `carryBatchIdentity` does this at the pour: the
 * still is empty before the charge, so the vat's band rides in with it.
 */
function column(chargeL: number, tempK = 290, band = 'masterful'): TestColumn {
  const c = makeStuff(() => new TestColumn());
  (c as unknown as { interiorBulk: boolean }).interiorBulk = true;
  c.setInteriorCapacity(Quantity.of(100, 'L'));
  graded(c).setGrade(Grade.of(band));
  c.testHeatK = tempK;
  if (chargeL > 0) {
    (c as unknown as { interiorMaterial: string }).interiorMaterial = CHARGE;
    c.setInteriorAmount(Quantity.of(chargeL, 'L'));
  }
  return c;
}

function pail(): Pail {
  const p = makeStuff(() => new Pail());
  (p as unknown as { interiorBulk: boolean }).interiorBulk = true;
  p.setInteriorCapacity(Quantity.of(100, 'L'));
  return p;
}

/**
 * TS view of a Crafted host's grade surface — the inner `GradedMixin`'s
 * members are present at runtime but not surfaced on the anonymous mixin
 * base (the documented `Crafted.ts` cast pattern, as `GradeCarry.test.ts`
 * does it).
 */
function graded(v: unknown): {
  setGrade(g: Grade): void;
  getGradeBand(): string;
} {
  return v as { setGrade(g: Grade): void; getGradeBand(): string };
}

function slotOf(v: unknown) {
  return BulkableApi.slotFor(v as never, undefined)!;
}

function draw(from: unknown, to: unknown, litres: number) {
  return BulkableApi.transfer(slotOf(from), to === null ? null : slotOf(to), {
    kind: 'measure',
    litres,
    mode: 'strict',
  });
}

/** Heat the column enough to start the run. */
function heat(c: TestColumn, tempK = 360): void {
  c.testHeatK = tempK;
}

function doseIn(v: unknown, type = 'methanol'): number {
  return (
    new DissolvedToxins(slotOf(v))
      .raw()
      .find((t) => t.type === type)?.amount ?? 0
  );
}

beforeEach(() => {
  installV1QuantityMarshallers();
  material(CHARGE, ['liquid', 'test-charge']);
  material(PRODUCT, ['liquid', 'spirit']);
  material(RESIDUE, ['liquid', 'dregs']);
});

afterEach(() => StuffApi.clearAll());

describe('the state machine', () => {
  it('matter no schedule matches leaves the host idle — a still full of water', () => {
    schedule();
    const c = column(0);
    (c as unknown as { interiorMaterial: string }).interiorMaterial = PRODUCT;
    c.setInteriorAmount(Quantity.of(10, 'L'));
    expect(c.getRunPhase()).toBe('idle');
  });

  it('⭐ a COLD charge pours back out as what it is', () => {
    schedule();
    const c = column(20);
    expect(c.getRunPhase()).toBe('charged');
    // Nothing has happened to it: still the charge material, all of it
    // available, and no dose anywhere.
    expect(slotOf(c).getMaterialPath()).toBe(CHARGE);
    expect(slotOf(c).available()).toBeCloseTo(20, 9);

    const back = pail();
    const res = draw(c, back, 20);
    expect(res.applied).toBeCloseTo(20, 9);
    expect(slotOf(back).getMaterialPath()).toBe(CHARGE);
    expect(doseIn(back)).toBe(0);
  });

  it('heat starts the run and swaps the interior to the product', () => {
    schedule();
    const c = column(20);
    heat(c);
    expect(c.getRunPhase()).toBe('running');
    expect(slotOf(c).getMaterialPath()).toBe(PRODUCT);
    expect(c.getChargeL()).toBeCloseTo(20, 9);
    expect(c.getDrawnL()).toBe(0);
  });

  it('the draw advances the run, and the floor is the residue', () => {
    schedule();
    const c = column(20);
    heat(c);
    // 10 % residue on a 20 L charge ⇒ 18 L is all that is drawable.
    expect(slotOf(c).available()).toBeCloseTo(18, 9);

    const p = pail();
    draw(c, p, 18);
    expect(c.getDrawnL()).toBeCloseTo(18, 9);
    // The swap happens at the floor: what is left is the residue, and it
    // carries none of the spirit's dose.
    expect(c.getRunPhase()).toBe('spent');
    expect(slotOf(c).getMaterialPath()).toBe(RESIDUE);
    expect(slotOf(c).getPayload()?.dissolvedToxins).toBeUndefined();
    expect(slotOf(c).getAmount().rawValue()).toBeCloseTo(2, 9);
  });

  it('emptying the host ends the run', () => {
    schedule();
    const c = column(20);
    heat(c);
    // ⚠ Two draws, and the reason is the floor: a `running` host will not
    // give up what is under the residue line, so `drain everything` is
    // *draw the product, then dump the dregs*. A single 20 L strict pour
    // is DECLINED, which is the honest answer and not a bug.
    draw(c, null, 18);
    expect(c.getRunPhase()).toBe('spent');
    draw(c, null, 2);
    expect(c.getRunPhase()).toBe('idle');
    expect(c.getChargeL()).toBe(0);
  });
});

describe('what a draw carries — the span blend', () => {
  it('⭐⭐ a pour wholly inside one fraction carries that fraction', () => {
    schedule();
    const c = column(20);
    heat(c);
    const p = pail();
    // The first 2 L is all foreshots (upTo 0.1 × 20 L = 2 L).
    draw(c, p, 2);
    expect(doseIn(p)).toBeCloseTo(1000, 6);
    expect(graded(p).getGradeBand()).toBe(
      'poor',
    );
  });

  it('⭐⭐ a pour that STRADDLES a boundary carries both sides in proportion', () => {
    schedule();
    const c = column(20);
    heat(c);
    const p = pail();
    // 4 L from the first drop: 2 L of foreshots at 1000 and 2 L of heads
    // at 200. Worked by hand: (2 × 1000 + 2 × 200) / 4 = 600.
    draw(c, p, 4);
    expect(doseIn(p)).toBeCloseTo(600, 6);
    // And the grade is the WORST band in the span, not an average.
    expect(graded(p).getGradeBand()).toBe(
      'poor',
    );
  });

  it('⭐ the honest small draw — 0.2 L of foreshots is 1000, not diluted', () => {
    schedule();
    const c = column(20);
    heat(c);
    const p = pail();
    draw(c, p, 0.2);
    expect(doseIn(p)).toBeCloseTo(1000, 6);
  });

  it('⭐⭐ the whole point: throwing the first away gives a CLEAN bottle', () => {
    schedule();
    const c = column(20);
    heat(c);
    // Discard the first 6 L (foreshots + heads, upTo 0.3 × 20 = 6 L).
    draw(c, null, 6);
    const bottle = pail();
    // Then take the hearts: 10 L of them, clean and fine.
    draw(c, bottle, 10);
    expect(doseIn(bottle)).toBe(0);
    expect(
      graded(bottle).getGradeBand(),
    ).toBe('fine');
  });

  it('⚠ and keeping pouring past the hearts drags the grade down', () => {
    schedule();
    const c = column(20);
    heat(c);
    draw(c, null, 6);
    const bottle = pail();
    draw(c, bottle, 10); // the hearts — fine
    expect(
      graded(bottle).getGradeBand(),
    ).toBe('fine');
    draw(c, bottle, 2); // two litres of tails on top
    // Weakest-link on the top-up: the bottle is poor now, and no amount
    // of good spirit poured in afterwards would lift it.
    expect(
      graded(bottle).getGradeBand(),
    ).toBe('poor');
  });

  it('the draw is stamped with the hand that charged the pot', () => {
    schedule();
    const c = column(0);
    c.setMaker('/platform/agent/Avatar/the-distiller');
    (c as unknown as { interiorMaterial: string }).interiorMaterial = CHARGE;
    c.setInteriorAmount(Quantity.of(20, 'L'));
    heat(c);
    const p = pail();
    draw(c, p, 2);
    expect(slotOf(p).getPayload()?.maker).toBe(
      '/platform/agent/Avatar/the-distiller',
    );
  });
});

describe('the read — lagged, never gated, and silent', () => {
  it('with no blur the read is exactly where the run is', () => {
    schedule();
    const c = column(20);
    heat(c);
    const viewer = makeStuff(() => new Good());
    expect(c.readFraction(viewer)?.key).toBe('foreshots');
    draw(c, null, 3);
    expect(c.readFraction(viewer)?.key).toBe('heads');
    draw(c, null, 4);
    expect(c.readFraction(viewer)?.key).toBe('hearts');
  });

  it('⭐⭐ an untrained nose is OPTIMISTIC — it calls the hearts early', () => {
    // readBlur 0.1 of a 20 L charge = a 2 L window at `untrained`. The
    // hearts begin at 6 L.
    schedule(FRACTIONS, { readBlur: 0.1 });
    const c = column(20);
    heat(c);
    const viewer = makeStuff(() => new Good()); // no transcript ⇒ untrained

    // At 4.5 L the run is squarely in the heads — and the window reaches
    // 6.5 L, which is hearts, so that is what the nose reports. The
    // untrained distiller starts collecting a litre and a half early and
    // bottles the heads.
    draw(c, null, 4.5);
    expect(c.readFraction(viewer)?.key).toBe('hearts');

    // ⭐ And the same optimism at the far end: the tails begin at 16 L,
    // and at 16.5 L the window still reaches back into the hearts, so the
    // nose says keep going.
    draw(c, null, 12);
    expect(c.getDrawnL()).toBeCloseTo(16.5, 9);
    expect(c.readFraction(viewer)?.key).toBe('hearts');

    // ⚠⚠ The error this REPLACED was a lag, and a lag is the wrong error:
    // you start collecting when you believe the hearts have begun, so a
    // nose that notices boundaries late starts LATE, throws good spirit
    // away and makes a cleaner bottle. It taught the opposite lesson.
    // Both of an optimistic window's errors enlarge the cut and make it
    // worse, which is also the real pressure on a novice.
  });

  it('⚠⚠ a host that composes no AdvancementMixin has NO band, whatever its digest says', () => {
    schedule(FRACTIONS, { readBlur: 0.1, discipline: 'test-distilling' });
    const c = column(20);
    heat(c);
    const expert = makeStuff(() => new Good());
    (
      expert as unknown as { competenceDigestCached(): unknown }
    ).competenceDigestCached = () => [
      { discipline: 'test-distilling', band: 'expert' },
    ];
    // ⭐ `bandFor` asks `MixinApi.isAdvancing(viewer)` BEFORE it reads any
    // digest, so a stub on a host that does not compose the mixin is
    // ignored entirely and the read comes back untrained. That is the
    // honest behaviour — a body with no transcript has no competence —
    // and it is recorded here because it cost a pair of
    // identical-looking passing tests: the world test's "expert" and
    // "untrained" distillers made the SAME cut and both cases passed.
    //
    // The expert's cut is proved in `world/__tests__/whiskey-run.test.ts`,
    // whose nose composes `AdvancementMixin` for real.
    draw(c, null, 4.5);
    expect(c.readFraction(expert)?.key).toBe('hearts');
  });

  it('⭐ and the untrained can still draw EVERY DROP — competence gates nothing', () => {
    schedule(FRACTIONS, { readBlur: 0.1 });
    const c = column(20);
    heat(c);
    const p = pail();
    const res = draw(c, p, 18);
    expect(res.applied).toBeCloseTo(18, 9);
    expect(res.status).not.toBe('declined');
  });

  it('⚠⚠ NOTHING announces a boundary — the notes are identical either side', () => {
    schedule();
    const c = column(20);
    heat(c);
    const p = pail();
    // 1 L, wholly inside the foreshots.
    const before = draw(c, p, 1);
    const p2 = pail();
    // 1 L more, which crosses into the heads at 2 L.
    const across = draw(c, p2, 2);
    const p3 = pail();
    // 1 L wholly inside the heads.
    const after = draw(c, p3, 1);

    const kinds = (r: { notes: readonly { kind: string }[] }) =>
      r.notes.map((n) => n.kind);
    expect(kinds(across)).toEqual(kinds(before));
    expect(kinds(after)).toEqual(kinds(before));
  });

  it('a host that is not running reads nothing', () => {
    schedule();
    const c = column(20); // cold
    const viewer = makeStuff(() => new Good());
    expect(c.readFraction(viewer)).toBeNull();
  });

  it('⚠ no fraction character carries a digit — the row class refuses one', () => {
    const s = schedule();
    for (const spec of s.getFractions()) {
      expect(spec.character).not.toMatch(/\d/);
    }
    expect(() =>
      s.setFractions([
        {
          key: 'bad',
          upTo: 0.5,
          character: 'It is 40% alcohol.',
          gradeBand: 'fine',
        },
      ]),
    ).toThrow(/digit/);
  });
});

describe('⭐ the charge\'s grade moves the boundaries', () => {
  it('a POOR charge has more heads than a masterful one', () => {
    // gradeStretch 0.02 per band below masterful. A `poor` charge is four
    // bands down ⇒ every boundary below the last moves out by 0.08.
    schedule(FRACTIONS, { gradeStretch: 0.02 });
    const good = column(0, 290, 'masterful');
    (good as unknown as { interiorMaterial: string }).interiorMaterial = CHARGE;
    good.setInteriorAmount(Quantity.of(20, 'L'));
    heat(good);

    const bad = column(0, 290, 'poor');
    (bad as unknown as { interiorMaterial: string }).interiorMaterial = CHARGE;
    bad.setInteriorAmount(Quantity.of(20, 'L'));
    heat(bad);

    const viewer = makeStuff(() => new Good());
    // At 4 L drawn (0.2 of the charge) the good wash is into the heads
    // and the poor one is STILL in the foreshots: 0.1 + 0.08 = 0.18 of
    // 20 L is 3.6 L... so at 4 L it has just reached the heads, while the
    // hearts (0.3 + 0.08 = 0.38 ⇒ 7.6 L) are still a long way off.
    draw(good, null, 4);
    draw(bad, null, 4);
    expect(good.readFraction(viewer)?.key).toBe('heads');
    expect(bad.readFraction(viewer)?.key).toBe('heads');

    // At 7 L the good wash is in the hearts and the poor one is not.
    draw(good, null, 3);
    draw(bad, null, 3);
    expect(good.readFraction(viewer)?.key).toBe('hearts');
    expect(bad.readFraction(viewer)?.key).toBe('heads');
  });
});

describe('⭐⭐ AC12 — a different product is ROWS', () => {
  it('a six-fraction schedule with per-fraction heat gates runs on the same code', () => {
    // The crude shape: fractions that come over at different
    // temperatures, no toxins anywhere, characters by smell. Nothing in
    // `lib/fractionation` changes to make this work.
    const crude: FractionSpec[] = [
      {
        key: 'gas',
        upTo: 0.05,
        character: 'A thin, sharp reek that will not stay in the vessel.',
        gradeBand: 'fair',
        requiresHeatK: 330,
      },
      {
        key: 'naphtha',
        upTo: 0.2,
        character: 'Volatile and clean-smelling, almost sweet.',
        gradeBand: 'fine',
        requiresHeatK: 350,
      },
      {
        key: 'kerosene',
        upTo: 0.4,
        character: 'Oily and lamp-like, heavier on the air.',
        gradeBand: 'fine',
        requiresHeatK: 450,
      },
      {
        key: 'gas-oil',
        upTo: 0.6,
        character: 'Thick, dark and slow, with a smell like a workshop.',
        gradeBand: 'fair',
        requiresHeatK: 550,
      },
      {
        key: 'lubricant',
        upTo: 0.75,
        character: 'Barely moving, and it clings to everything.',
        gradeBand: 'fair',
        requiresHeatK: 620,
      },
      {
        key: 'wax',
        upTo: 0.85,
        character: 'Near solid, dull and pale where it cools.',
        gradeBand: 'poor',
        requiresHeatK: 700,
      },
    ];
    makeStuffAtPath(() => {
      const s = new FractionSchedule();
      s.setKey('test-crude');
      s.setInputCategory('test-charge');
      s.setProductMaterial(PRODUCT);
      s.setResidueMaterial(RESIDUE);
      s.setRequiresHeatK(330);
      s.setReadBlur(0);
      s.setFractions(crude);
      return s;
    }, '/stuff/idea/fractionation/_test/crude');

    const c = column(100);
    heat(c, 340); // hot enough for gas, not for naphtha
    expect(c.getRunPhase()).toBe('running');
    // ⭐ The heat gate clamps the draw at the first fraction it cannot
    // reach: 5 L of gas and no further.
    expect(slotOf(c).available()).toBeCloseTo(5, 6);

    heat(c, 460); // now kerosene is reachable, gas-oil is not
    expect(slotOf(c).available()).toBeCloseTo(40, 6);

    heat(c, 800); // everything
    expect(slotOf(c).available()).toBeCloseTo(85, 6);

    const viewer = makeStuff(() => new Good());
    draw(c, null, 10);
    expect(c.readFraction(viewer)?.key).toBe('naphtha');
  });
});

describe('the row class refuses an incoherent schedule', () => {
  it('boundaries must ascend', () => {
    const s = makeStuff(() => new FractionSchedule());
    expect(() =>
      s.setFractions([
        { key: 'a', upTo: 0.5, character: 'One.', gradeBand: 'fine' },
        { key: 'b', upTo: 0.3, character: 'Two.', gradeBand: 'fine' },
      ]),
    ).toThrow(/ascending/);
  });

  it('a schedule that gives up everything is not a still', () => {
    const s = makeStuff(() => new FractionSchedule());
    expect(() =>
      s.setFractions([
        { key: 'a', upTo: 1, character: 'All of it.', gradeBand: 'fine' },
      ]),
    ).toThrow(/residue/);
  });

  it('an unknown grade band is refused at the row', () => {
    const s = makeStuff(() => new FractionSchedule());
    expect(() =>
      s.setFractions([
        { key: 'a', upTo: 0.5, character: 'One.', gradeBand: 'lovely' },
      ]),
    ).toThrow(/gradeBand/);
  });

  it('composing the mixin without Bulkable is refused', () => {
    class Bad extends FractionatingMixin(Good) {
      static _mixinName = 'FractionatingBadHost';
    }
    // ⚠ Through `assertComposable`, which is the seam `StuffApi.register`
    // calls — NOT through `new Bad()`, which is refused first for an
    // unrelated reason (direct construction of a Stuff subclass) and would
    // have made this assertion pass without ever reaching the check.
    expect(() => MixinApi.assertComposable(Bad as never)).toThrow(
      /BulkableMixin/,
    );
  });
});
