/**
 * ⭐⭐ **A transform cannot be better than what went into it.**
 *
 * The batch's band was `bandFor(_worstStretch)` and ignored the fill
 * entirely, so a **`poor` must made `fine` wine** provided the cellar was
 * kept at the right temperature. That is not a property of fermentation;
 * it is a laundry, and it contradicted `Grade.deriveAtFixedControl`'s
 * weakest-link rule one folder over.
 *
 * The cap is read off the CONTENTS' payload when the batch starts
 * (matter-model-overlaps D2), and the derived band is written back onto
 * the payload — the vat's own grade is its making and is never touched.
 * Both limbs are proved, including the one that must NOT cap.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Vat from '../../../platform/thing/Vat';
import MaturationProfile from '../../../lib/maturation/MaturationProfile';
import Material from '../../material/Material';
import Food from '../../../platform/idea/material/Food';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { Grade, type GradeBand } from '../../craft/Grade';
import { CraftedMixin } from '../../craft/Crafted';
import { BulkableMixin } from '../../bulk/Bulkable';
import Good from '../../stuff/Good';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { TemplatePaths } from '../../paths';
import { rememberProfile } from './profiles';

const MUST = '/stuff/idea/material/_test/cap-must';
const WINE = '/stuff/idea/material/_test/cap-wine';
const SCALE = 12;
let real = 0;

/** A markable source — the crusher's bucket. */
class Pail extends CraftedMixin(BulkableMixin(Good)) {
  static _mixinName = 'InputBandCapPail';
}

function material(path: string, tags: string[], sugar = 0): void {
  makeStuffAtPath(() => {
    const m = new Food();
    m.setName(path.split('/').pop()!);
    m.setTags(tags);
    if (sugar > 0) m.setNutrientAmounts({ sugar });
    return m;
  }, path);
}

function profile(): void {
  rememberProfile(() => {
    const p = new MaturationProfile();
    p.setKey('cap-test');
    p.setMechanism('microbial');
    p.setInputCategory('cap-must');
    p.setStallBelowK(270);
    p.setHappyK(290);
    p.setDamageAboveK(320);
    p.setRatePerDay(1);
    p.setProductMaterial(WINE);
    return p;
  }, '/stuff/idea/maturation/_test/cap-test');
}

function vat(): Vat {
  const v = makeStuff(() => new Vat());
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(50, 'L'));
  // The `StalledAndKilled.test.ts` idiom: a vat's temperature is the
  // stamped pair, not a setter.
  v.lastAmbientK = 290;
  v.stampedTemperatureK = 290;
  v.setOpen(true);
  return v;
}

function pail(band: string, litres: number): Pail {
  const p = makeStuff(() => new Pail());
  (p as unknown as { interiorBulk: boolean }).interiorBulk = true;
  p.setInteriorCapacity(Quantity.of(50, 'L'));
  (p as unknown as { interiorMaterial: string }).interiorMaterial = MUST;
  p.setInteriorAmount(Quantity.of(litres, 'L'));
  slotOf(p).setPayload({ grade: band as GradeBand });
  return p;
}

function graded(v: unknown): { setGrade(g: Grade): void; getGradeBand(): string } {
  return v as { setGrade(g: Grade): void; getGradeBand(): string };
}

/** The batch's grade — its payload's — or `undefined` when ungraded. */
function batchBand(v: unknown): string | undefined {
  return slotOf(v).getPayload()?.grade;
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

/** Run the batch to `finished` in a happy cellar. */
function ferment(v: Vat, gameSec = 86_400 * 3): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const step = Math.min(3600, remaining);
    real += (step / SCALE) * 1000;
    v.getMaturationPhase();
    remaining -= step;
  }
}

beforeEach(() => {
  installV1QuantityMarshallers();
  // ⚠⚠ The vat's clock reads `null` — *nothing is happening* — unless the
  // WorldClockRegistry STUFF is registered, and `StuffApi.clearAll()` in
  // the teardown removes it. Without this the first test in the file
  // passes and every later one reports `idle`, which reads as a design
  // claim about fermentation rather than as a dead clock.
  stampTemplatePathForTest(
    makeStuff(() => new WorldClockRegistry()),
    TemplatePaths.worldClockRegistry,
  );
  WorldClockApi._resetForTesting();
  real = 100_000;
  WorldClockApi._setNowProviderForTesting(() => real);
  material(MUST, ['liquid', 'must', 'cap-must'], 200);
  material(WINE, ['liquid', 'beverage', 'alcoholic', 'cap-wine']);
  profile();
});

afterEach(() => {
  StuffApi.clearAll();
});

describe('the fill caps the batch', () => {
  it('⭐⭐ a POOR must cannot make fine wine, however well the cellar is kept', () => {
    const v = vat();
    fill(pail('poor', 20), v, 20);
    // The premise, proved before the claim: the fill really did arrive,
    // and it really did carry its band in on the contents.
    expect(slotOf(v).getAmount().rawValue()).toBeCloseTo(20, 9);
    expect(batchBand(v)).toBe('poor');

    ferment(v);
    expect(v.getMaturationPhase(), 'the batch has to FINISH or the cap is untested')
      .toBe('finished');
    // It became wine — and it is poor wine.
    expect(slotOf(v).getMaterialPath()).toBe(WINE);
    expect(batchBand(v)).toBe('poor');
    // ⭐ …and the vat is still what its cooper made it.
    expect(graded(v).getGradeBand()).toBe('fair');
  });

  it('⭐ a MASTERFUL must is capped only by the cellar, not by the fill', () => {
    const v = vat();
    fill(pail('masterful', 20), v, 20);
    expect(batchBand(v)).toBe('masterful');
    ferment(v);
    expect(v.getMaturationPhase()).toBe('finished');
    // A perfectly-kept cellar derives `masterful` from `_worstStretch`,
    // and the cap is at or above it, so nothing is taken away.
    expect(batchBand(v)).toBe('masterful');
  });

  it('⚠⚠ an UNGRADED fill is not capped at `fair` — the default band is not a claim', () => {
    // `GradedMixin.gradeBand` defaults to `'fair'`, so reading the vat's
    // own face would cap EVERY ferment nobody graded at `fair` for ever.
    // The cap is the contents' grade, and ungraded contents have none.
    const v = vat();
    (v as unknown as { interiorMaterial: string }).interiorMaterial = MUST;
    v.setInteriorAmount(Quantity.of(20, 'L'));
    expect(batchBand(v)).toBeUndefined();
    ferment(v);
    expect(v.getMaturationPhase()).toBe('finished');
    expect(batchBand(v)).toBe('masterful');
  });

  it('a bad cellar still degrades a good fill — the cap is a ceiling, not a floor', () => {
    const v = vat();
    fill(pail('masterful', 20), v, 20);
    // Over `damageAboveK` for the whole run.
    v.lastAmbientK = 330;
    v.stampedTemperatureK = 330;
    ferment(v);
    expect(batchBand(v)).toBeDefined();
    expect(batchBand(v)).not.toBe('masterful');
  });

  it('⭐ the vat that held a poor batch holds a masterful one next: the cap is per batch', () => {
    const v = vat();
    fill(pail('poor', 20), v, 20);
    ferment(v);
    expect(batchBand(v)).toBe('poor');
    BulkableApi.transfer(slotOf(v), null, { kind: 'all', mode: 'lenient' } as never);
    v.getMaturationPhase();
    fill(pail('masterful', 20), v, 20);
    ferment(v);
    expect(batchBand(v)).toBe('masterful');
  });
});
