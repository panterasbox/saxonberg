/**
 * ⭐⭐ Circulation — what losing blood does to you BEFORE it kills you.
 *
 * Two of the seven vital signs (`bloodPressureSystolic` /
 * `bloodPressureDiastolic`) shipped with band profiles, storage, and no
 * driver at all. They are now derived from circulating volume, and the
 * SHAPE of that derivation is the whole point:
 *
 * - **the compensated plateau** — systolic holds through ATLS class II and
 *   drops at class III. *A patient can be seriously bled with a normal
 *   blood pressure right up until they are not.*
 * - **the narrowing pulse pressure** — diastolic RISES while systolic
 *   holds, so the gap closes. The earliest sign there is.
 * - **the window** — shock at 30 % loss, dying at 36 %.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { Quantity } from '../../quantity';
import { HARM_DEFAULTS } from '../../../platform/idea/Condition';
import { TemplatePaths } from '../../paths';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

let seq = 0;

function bleeder(): Creature {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('test-bleeder');
  plan.setBodyParts([{ key: 'body.torso', parent: null, tissues: [] }]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/bleed-${id}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/bleed-${id}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  return c;
}

/** Drop the body to `lossFraction` of its baseline volume and reconcile. */
function bleedTo(c: Creature, lossFraction: number): void {
  const baseline = c.getVitalBand('bloodVolume').baseline;
  c.setVitalSign('bloodVolume', Quantity.of(baseline * (1 - lossFraction), 'L'));
  c.getConditions(); // reconcile-on-read
}

const systolic = (c: Creature): number =>
  c.getVitalSign('bloodPressureSystolic').rawValue();
const diastolic = (c: Creature): number =>
  c.getVitalSign('bloodPressureDiastolic').rawValue();
const pulsePressure = (c: Creature): number => systolic(c) - diastolic(c);
const hasShock = (c: Creature): boolean =>
  c
    .getConditions()
    .some(
      (x) =>
        x.kind === 'affliction' &&
        x.templatePath === TemplatePaths.circulationHypovolemicShock,
    );

describe('circulation — the compensated plateau', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('an intact body reads its baseline pressure', () => {
    const c = bleeder();
    c.getConditions();
    expect(systolic(c)).toBeCloseTo(120, 5);
    expect(diastolic(c)).toBeCloseTo(80, 5);
  });

  it('⭐⭐ SYSTOLIC HOLDS through class II — the fact that matters most', () => {
    const c = bleeder();
    bleedTo(c, HARM_DEFAULTS.SHOCK_COMPENSATED_LOSS);
    // 15 % of blood volume gone and the pressure has not moved. This is
    // the whole reason a bled patient can look fine.
    expect(systolic(c)).toBeCloseTo(120, 5);
  });

  it('…and FALLS past it — class III decompensation', () => {
    const c = bleeder();
    bleedTo(c, 0.3);
    // past = 0.15, slope 1.5 → 22.5 % down.
    expect(systolic(c)).toBeCloseTo(120 * (1 - 1.5 * 0.15), 5);
    expect(systolic(c)).toBeLessThan(120);
  });

  it('⭐⭐ the PULSE PRESSURE NARROWS before the systolic moves at all', () => {
    const c = bleeder();
    c.getConditions();
    const wide = pulsePressure(c);

    bleedTo(c, 0.1);
    // Systolic untouched…
    expect(systolic(c)).toBeCloseTo(120, 5);
    // …and yet the gap has already closed, because the diastolic ROSE.
    expect(diastolic(c)).toBeGreaterThan(80);
    expect(pulsePressure(c)).toBeLessThan(wide);
  });

  it('⚠ and it is a RISE, not a slower fall — vasoconstriction', () => {
    const c = bleeder();
    bleedTo(c, HARM_DEFAULTS.SHOCK_COMPENSATED_LOSS);
    expect(diastolic(c)).toBeCloseTo(
      80 * (1 + HARM_DEFAULTS.SHOCK_DIASTOLIC_RISE),
      5,
    );
  });

  it('past the plateau BOTH fall together', () => {
    const c = bleeder();
    bleedTo(c, 0.3);
    expect(diastolic(c)).toBeLessThan(80);
    expect(systolic(c)).toBeLessThan(120);
  });

  it('the derive is a READ, not a latch — refilling restores the pressure', () => {
    const c = bleeder();
    bleedTo(c, 0.3);
    expect(systolic(c)).toBeLessThan(120);
    bleedTo(c, 0);
    expect(systolic(c)).toBeCloseTo(120, 5);
  });
});

describe('circulation — shock, and the window before death', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('no shock below the threshold', () => {
    const c = bleeder();
    bleedTo(c, 0.2);
    expect(hasShock(c)).toBe(false);
  });

  it('⭐⭐ shock at 30 % — BEFORE the dying window opens at 36 %', () => {
    const c = bleeder();
    bleedTo(c, HARM_DEFAULTS.SHOCK_LOSS_FRACTION);
    expect(hasShock(c)).toBe(true);
    // ⭐ The window: the body is visibly failing and is NOT yet dying.
    // That interval is what makes a medic able to matter.
    expect(c.isDying()).toBe(false);
  });

  it('…and the dying floor still opens where it always did', () => {
    // ⚠ The dying floor lives in the reconcile TAIL, behind the world-clock
    // guard — the circulation derive deliberately does not (blood pressure
    // is a read of present volume, not an integration). So this one case
    // needs a clock, and that asymmetry is the finding, not a defect.
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
    try {
      const c = bleeder();
      c.setLifecycleState('alive');
      // survivableMin 3.2 of a 5 L baseline = 36 % loss.
      bleedTo(c, 0.37);
      expect(hasShock(c)).toBe(true);
      expect(c.isDying()).toBe(true);
    } finally {
      WorldClockApi._resetForTesting();
    }
  });

  it('hysteresis — it does not flicker at the boundary', () => {
    const c = bleeder();
    bleedTo(c, 0.31);
    expect(hasShock(c)).toBe(true);
    // Back above the spawn threshold but not yet past the relief margin.
    bleedTo(c, 0.28);
    expect(hasShock(c)).toBe(true);
    bleedTo(c, 0.2);
    expect(hasShock(c)).toBe(false);
  });

  it('is spawned ONCE, not once per read', () => {
    const c = bleeder();
    bleedTo(c, 0.31);
    c.getConditions();
    c.getConditions();
    const rows = c
      .getConditions()
      .filter(
        (x) =>
          x.kind === 'affliction' &&
          x.templatePath === TemplatePaths.circulationHypovolemicShock,
      );
    expect(rows).toHaveLength(1);
  });

  it('⭐ out-of-band pressure feeds the condition band', () => {
    // `getConditionBand` adds severity per out-of-band vital sign, and
    // before this the two pressure signs were driven by nothing — so they
    // could never contribute. Now a bled body reads worse for the right
    // reason.
    const c = bleeder();
    const before = c.getConditionBand();
    bleedTo(c, 0.34);
    expect(c.getConditionBand()).not.toBe(before);
  });
});
