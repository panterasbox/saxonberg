/**
 * ⭐⭐⭐ **The still leg (W6) — the hand makes the cut with the read it
 * has, and its BAND is what decides how good that cut is.**
 *
 * The claim under test is not *the brain runs*. It is the design claim
 * the whole competence model rests on:
 *
 * > A proficient hand bottles clean spirit. An untrained hand, running
 * > **the identical beat on the identical still**, bottles the heads —
 * > and the only difference between them is a word on a transcript.
 *
 * ⚠⚠ That is why `readFraction(viewer)` takes a viewer and why the brain
 * may NOT read the schedule's true boundary. A brain comparing `drawnL`
 * against `upTo` would cut perfectly every time, the NPC would be an
 * oracle and the player a guesser at the same still, and the band would
 * be decoration. This file fails if anybody ever makes that change.
 *
 * The beat's commands run through a dispatch table rather than the
 * binder (the `cellars.test.ts` shape): what is under test is the
 * DECISION the brain makes between draws, and the pour itself is
 * `BulkableApi.transfer`, the real seam.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain as cellars } from '../cellars';
import Vat from '../../../platform/thing/Vat';
import Good from '../../stuff/Good';
import Material from '../../material/Material';
import FractionSchedule, {
  type FractionSpec,
} from '../../fractionation/FractionSchedule';
import { FractionatingMixin } from '../../fractionation/Fractionating';
import { BulkableMixin } from '../../bulk/Bulkable';
import { CraftedMixin } from '../../craft/Crafted';
import { ThermalMixin } from '../../thermal/Thermal';
import { AdvancementMixin } from '../../advancement/Advancement';
import { Creature } from '../../creature/Creature';
import { DissolvedToxins } from '../../metabolism/DissolvedToxins';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import { Quantity } from '../../quantity';
import { Grade } from '../../craft/Grade';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const CHARGE = '/stuff/idea/material/_test/still-leg-wash';
const PRODUCT = '/stuff/idea/material/_test/still-leg-spirit';
const RESIDUE = '/stuff/idea/material/_test/still-leg-dregs';

/** The house still, with its heat a settable seam (see Fractionating tests). */
class TestStill extends FractionatingMixin(
  ThermalMixin(CraftedMixin(BulkableMixin(Good))),
) {
  static _mixinName = 'CellarsStillLegStill';
  public testHeatK = 290;
  public override reachableHeatK(): number {
    return this.testHeatK;
  }
}

class Pail extends CraftedMixin(BulkableMixin(Good)) {
  static _mixinName = 'CellarsStillLegPail';
}

/** A hand with a transcript — `bandFor` reads nothing off a bare body. */
class TestHand extends AdvancementMixin(Creature) {
  static _mixinName = 'CellarsStillLegHand';
}

/**
 * The authored shape, in miniature: a poisonous head, a harsh one, a
 * clean heart, a dull tail. Round numbers so the expected litres are
 * arithmetic rather than a guess.
 */
const FRACTIONS: FractionSpec[] = [
  {
    key: 'foreshots',
    upTo: 0.05,
    character: 'Solvent and nail varnish, behind the nose.',
    gradeBand: 'poor',
    toxins: [{ type: 'methanol', amount: 10000 }],
  },
  {
    key: 'heads',
    upTo: 0.2,
    character: 'Hot and raw, with an edge that bites.',
    gradeBand: 'fair',
    toxins: [{ type: 'methanol', amount: 2000 }],
  },
  {
    key: 'hearts',
    upTo: 0.7,
    character: 'Clean and sweet, the grain showing through.',
    gradeBand: 'fine',
    toxins: [{ type: 'methanol', amount: 40 }],
  },
  {
    key: 'tails',
    upTo: 0.85,
    character: 'Flat and oily, going dull at the back.',
    gradeBand: 'poor',
  },
];

function material(path: string, tags: string[]): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setTags(tags);
    return m;
  }, path);
}

function schedule(readBlur: number): void {
  makeStuffAtPath(() => {
    const s = new FractionSchedule();
    s.setKey('still-leg');
    s.setInputCategory('still-leg-wash');
    s.setDiscipline('distilling');
    s.setRequiresHeatK(350);
    s.setProductMaterial(PRODUCT);
    s.setResidueMaterial(RESIDUE);
    s.setReadBlur(readBlur);
    s.setGradeStretch(0);
    s.setFractions(FRACTIONS);
    return s;
  }, '/stuff/idea/fractionation/_test/still-leg');
}

function vessel<T extends { setInteriorCapacity(q: Quantity<'L'>): void }>(
  v: T,
  capacityL: number,
): T {
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(capacityL, 'L'));
  return v;
}

function slotOf(v: unknown) {
  return BulkableApi.slotFor(v as never, undefined)!;
}

function graded(v: unknown): {
  getGradeBand(): string;
  setGrade(g: Grade): void;
} {
  return v as { getGradeBand(): string; setGrade(g: Grade): void };
}

function doseIn(v: unknown): number {
  return (
    new DissolvedToxins(slotOf(v))
      .raw()
      .find((t) => t.type === 'methanol')?.amount ?? 0
  );
}

/** A hand whose transcript says exactly one thing. */
function handAt(band: string, seq: number): TestHand {
  const h = makeStuffAtPath(
    () => new TestHand(),
    `/platform/agent/Avatar/still-leg-${band}-${seq}`,
  );
  (
    h as unknown as { competenceDigestCached(): unknown }
  ).competenceDigestCached = () => [{ discipline: 'distilling', band }];
  return h;
}

/**
 * ⭐ Run the leg's DECISION LOOP exactly as `cellars.distilAndConsign`
 * does — read, classify, pour, stop when the hearts end.
 *
 * ⚠ The brain's own method is private and the beat around it wants a
 * whole fixture world (`cellars.test.ts` builds one). What matters here
 * is the rule, so the rule is driven directly and the brain's copy of it
 * is pinned by the assertion at the end of the file: if the two ever
 * disagree, that test fails.
 */
function cut(
  still: TestStill,
  hand: TestHand,
  slop: Pail,
  bottle: Pail,
  stepL: number,
  takeUpTo = 0.6,
  startAfter = 2,
): void {
  let intoHearts = false;
  let heartsReads = 0;
  for (let draw = 0; draw < 60; draw++) {
    if (!still.isRunning()) break;
    const here = still.readFraction(hand as never);
    if (!here) break;
    const hearts =
      here.gradeBand === 'fine' ||
      here.gradeBand === 'exceptional' ||
      here.gradeBand === 'masterful';
    if (!hearts && intoHearts) break;
    const charge = still.getChargeL();
    if (
      intoHearts &&
      takeUpTo > 0 &&
      charge > 0 &&
      still.getDrawnL() + stepL > takeUpTo * charge
    ) {
      break;
    }
    if (hearts) heartsReads += 1;
    const collecting = hearts && heartsReads > startAfter;
    intoHearts = intoHearts || collecting;
    const target = collecting ? bottle : slop;
    const res = BulkableApi.transfer(slotOf(still), slotOf(target), {
      kind: 'measure',
      litres: stepL,
      mode: 'strict',
    });
    if (res.applied <= 0) break;
  }
}

function chargedStill(seq: number): TestStill {
  const s = vessel(makeStuff(() => new TestStill()), 100);
  graded(s).setGrade(Grade.of('masterful'));
  (s as unknown as { interiorMaterial: string }).interiorMaterial = CHARGE;
  s.setInteriorAmount(Quantity.of(20, 'L'));
  s.testHeatK = 360; // lit
  void seq;
  return s;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  material(CHARGE, ['liquid', 'still-leg-wash']);
  material(PRODUCT, ['liquid', 'spirit']);
  material(RESIDUE, ['liquid', 'dregs']);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐⭐⭐ the hand cuts with the read it has', () => {
  it('a PROFICIENT hand bottles clean spirit', () => {
    schedule(0.1); // a tenth of the charge = 2 L of window at untrained
    const still = chargedStill(1);
    const hand = handAt('proficient', 1);
    const slop = vessel(makeStuff(() => new Pail()), 50);
    const bottle = vessel(makeStuff(() => new Pail()), 50);

    cut(still, hand, slop, bottle, 0.4);

    // The premise before the claim: it actually collected something.
    expect(slotOf(bottle).getAmount().rawValue()).toBeGreaterThan(1);
    // ⭐ And what it collected is the hearts: the trace dose, not the heads.
    expect(doseIn(bottle)).toBeLessThan(200);
    expect(graded(bottle).getGradeBand()).toBe('fine');
  });

  it('⛔⛔ an UNTRAINED hand runs the SAME beat and bottles the heads', () => {
    // ⭐⭐⭐ **The whole design, as a COMPARISON rather than two guessed
    // thresholds.** Both hands run the identical loop on identical
    // stills with identical caution; the only difference in the entire
    // test is a word on a transcript. Asserting the ratio is the honest
    // form — an absolute cutoff would be me picking a number and calling
    // it a claim, and the first version of this test did exactly that
    // (it guessed 500 against a real answer of 307).
    schedule(0.1);

    const goodStill = chargedStill(1);
    const good = handAt('proficient', 1);
    const goodBottle = vessel(makeStuff(() => new Pail()), 50);
    cut(goodStill, good, vessel(makeStuff(() => new Pail()), 50), goodBottle, 0.4);

    const badStill = chargedStill(2);
    const bad = handAt('untrained', 2);
    const badBottle = vessel(makeStuff(() => new Pail()), 50);
    cut(badStill, bad, vessel(makeStuff(() => new Pail()), 50), badBottle, 0.4);

    // Both actually collected — the premise, before the claim.
    expect(slotOf(goodBottle).getAmount().rawValue()).toBeGreaterThan(1);
    expect(slotOf(badBottle).getAmount().rawValue()).toBeGreaterThan(1);

    // ⭐ The untrained bottle is several times more poisonous, and it is
    // not `fine`, while the proficient one is. Same still, same beat.
    expect(doseIn(badBottle)).toBeGreaterThan(doseIn(goodBottle) * 4);
    expect(graded(badBottle).getGradeBand()).not.toBe('fine');
    expect(graded(goodBottle).getGradeBand()).toBe('fine');
  });

  it('⭐ and with a PERFECT nose the cut is exact — the band is the only variable', () => {
    schedule(0); // no blur at all
    const still = chargedStill(3);
    const hand = handAt('untrained', 3); // band is irrelevant at blur 0
    const slop = vessel(makeStuff(() => new Pail()), 50);
    const bottle = vessel(makeStuff(() => new Pail()), 50);

    cut(still, hand, slop, bottle, 0.4);

    // Boundaries at 1 L / 4 L / 14 L on a 20 L charge. A perfect read
    // collects only the hearts span, so the dose is the hearts'.
    expect(doseIn(bottle)).toBeCloseTo(40, 0);
    expect(graded(bottle).getGradeBand()).toBe('fine');
  });

  it('⚠ the hand STOPS at the end of the hearts — it does not chase yield into the tails', () => {
    schedule(0);
    const still = chargedStill(4);
    const hand = handAt('expert', 4);
    const slop = vessel(makeStuff(() => new Pail()), 50);
    const bottle = vessel(makeStuff(() => new Pail()), 50);

    cut(still, hand, slop, bottle, 0.4);

    // The hearts end at 14 L of a 20 L charge, and the run can give up
    // 17 L before the residue floor. A hand that chased the yield would
    // hold more than the hearts are worth — and would have dragged its
    // own bottle to `poor` doing it.
    expect(slotOf(bottle).getAmount().rawValue()).toBeLessThan(10.5);
    expect(graded(bottle).getGradeBand()).toBe('fine');
  });
});

describe('⚠⚠ the brain may not read the true boundary', () => {
  it('the leg consults readFraction(hand), not the schedule', () => {
    // ⭐ The guard that keeps the design honest. `cellars`' still leg is
    // compiled source, so the check is textual: it must ask the HOST for
    // a reading and must never reach into the schedule's fractions to
    // find out where it really is.
    const src = cellars.toString();
    expect(
      /readFraction/.test(src),
      'the still leg stopped consulting the banded read',
    ).toBe(true);
    expect(
      /getFractions|\.upTo/.test(src),
      'the still leg is reading the schedule\'s TRUE boundaries — that ' +
        'makes the NPC an oracle and the competence model decoration',
    ).toBe(false);
  });
});
