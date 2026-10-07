/**
 * ⭐⭐ **A transform cannot be better than what went into it.**
 *
 * `applyBatchGrade` wrote `bandFor(_worstStretch)` and ignored the fill
 * entirely, so a **`poor` must made `fine` wine** provided the cellar was
 * kept at the right temperature. That is not a property of fermentation;
 * it is a laundry, and it contradicted `Grade.deriveAtFixedControl`'s
 * weakest-link rule one folder over.
 *
 * ⚠⚠ **This file exists because the fix broke nothing.** The whiskey
 * build's plan predicted *"expect shipped test numbers to move in
 * brewing/winemaking — that is the fix landing, not a regression"*, and
 * 163 tests across maturation, bulk and the world passed unchanged. Which
 * means either the cap works and no shipped test ever fermented a bad
 * fill, or the cap never fires. An unexercised seam that reads as a fix
 * is the failure this repo keeps shipping, so the claim is proved here
 * directly — both limbs, including the one that must NOT cap.
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
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { TemplatePaths } from '../../paths';

const MUST = '/stuff/idea/material/_test/cap-must';
const WINE = '/stuff/idea/material/_test/cap-wine';
const SCALE = 12;
let real = 0;

/** A graded, markable source — the crusher's bucket. */
class Pail extends CraftedMixin(BulkableMixin(Good)) {
  static _mixinName = 'InputBandCapPail';
}

function material(path: string, tags: string[], sugar = 0): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setTags(tags);
    if (sugar > 0) m.setNutrientAmounts({ sugar });
    return m;
  }, path);
}

function profile(): void {
  makeStuffAtPath(() => {
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
  graded(p).setGrade(Grade.of(band));
  return p;
}

function graded(v: unknown): { setGrade(g: Grade): void; getGradeBand(): string } {
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
    // and it really did carry its band onto the vat.
    expect(slotOf(v).getAmount().rawValue()).toBeCloseTo(20, 9);
    expect(graded(v).getGradeBand()).toBe('poor');

    ferment(v);
    expect(v.getMaturationPhase(), 'the batch has to FINISH or the cap is untested')
      .toBe('finished');
    // It became wine — and it is poor wine.
    expect(slotOf(v).getMaterialPath()).toBe(WINE);
    expect(graded(v).getGradeBand()).toBe('poor');
  });

  it('⭐ a MASTERFUL must is capped only by the cellar, not by the fill', () => {
    const v = vat();
    fill(pail('masterful', 20), v, 20);
    expect(graded(v).getGradeBand()).toBe('masterful');
    ferment(v);
    expect(v.getMaturationPhase()).toBe('finished');
    // A perfectly-kept cellar derives `masterful` from `_worstStretch`,
    // and the cap is at or above it, so nothing is taken away.
    expect(graded(v).getGradeBand()).toBe('masterful');
  });

  it('⚠⚠ an UNGRADED fill is not capped at `fair` — the default band is not a claim', () => {
    // The trap the witness exists to avoid. `GradedMixin.gradeBand`
    // defaults to `'fair'`, so reading the host's own face at
    // `startBatch` would have capped EVERY ferment nobody graded at
    // `fair` for ever — including every shipped one, silently.
    const v = vat();
    // Hand-filled: no graded source anywhere, so no witness fires.
    (v as unknown as { interiorMaterial: string }).interiorMaterial = MUST;
    v.setInteriorAmount(Quantity.of(20, 'L'));
    ferment(v);
    expect(v.getMaturationPhase()).toBe('finished');
    expect(graded(v).getGradeBand()).not.toBe('fair');
    expect(graded(v).getGradeBand()).toBe('masterful');
  });

  it('a bad cellar still degrades a good fill — the cap is a ceiling, not a floor', () => {
    const v = vat();
    fill(pail('masterful', 20), v, 20);
    // Over `damageAboveK` for the whole run.
    v.lastAmbientK = 330;
    v.stampedTemperatureK = 330;
    ferment(v);
    expect(graded(v).getGradeBand()).not.toBe('masterful');
  });
});
