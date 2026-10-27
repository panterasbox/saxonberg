/**
 * Cut cane inverts (sugar D15), as the cane stalk's authored KINETICS: the
 * sucrose turns on a clock from the cut, faster the hotter, and the crop's
 * grade falls as it turns, so cane is milled the day it is cut. The curve is
 * read off `cane-stalk.yaml`, so this proves the row.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Crop from '@saxonberg/server/mud/platform/thing/Crop';
import Material from '@saxonberg/server/mud/lib/material/Material';
import type { KineticSpec } from '@saxonberg/server/mud/lib/material/Kinetics';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const STALK = '/trade/sugar/idea/material/cane-stalk';
const KINETICS = (
  YAML.parse(
    readFileSync(fileURLToPath(new URL('../../content/trade/sugar/idea/material/cane-stalk.yaml', import.meta.url)), 'utf8'),
  ) as { data: { kinetics: KineticSpec[] } }
).data.kinetics;

let real = 9_000_000;
const tick = (gameHours: number): void => {
  real += ((gameHours * 3600) / 12) * 1000;
};

describe('cut cane inverts — the stalk’s kinetics', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real += 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => real);
    if (!StuffApi.findByTemplatePath(STALK)) {
      makeStuffAtPath(() => {
        const m = new Material();
        m.setName('cane stalk');
        m.setDensity(Quantity.of(1000, 'kg/m³'));
        m.setSpecificHeat(Quantity.of(3500, 'J/(kg·K)'));
        m.setThermalConductivity(Quantity.of(0.4, 'W/(m·K)'));
        m.setKinetics(KINETICS);
        return m;
      }, STALK);
    }
  });
  afterEach(() => WorldClockApi._resetForTesting());

  function bundle(tempK: number): Crop {
    const c = makeStuff(() => new Crop());
    c.setMass(Quantity.of(30, 'kg'));
    c.setMaterial(StuffApi.findByTemplatePath<Material>(STALK)!);
    c.setStampedTemperatureK(tempK);
    c.setLastAmbientK(tempK);
    c.setGrade(Grade.of('fine'));
    c.reconcileKinetics();
    return c;
  }

  it('fresh-cut it says so, and its grade is what it was cut at', () => {
    const c = bundle(300);
    expect(c.kineticPhrases()[0]!.phrase).toMatch(/fresh-cut/);
    expect(c.getGrade().getBand()).toBe('fine');
  });

  it('⭐ a bundle left a day in tropical heat has inverted, and lost a band', () => {
    const c = bundle(300);
    tick(24);
    // ∫ 0.02/h × 24 h = 0.48 → 1 − e^−0.48 ≈ 0.38.
    expect(c.getKineticExtent('inversion')).toBeCloseTo(1 - Math.exp(-0.48), 2);
    expect(c.kineticPhrases()[0]!.phrase).toMatch(/inverted/);
    expect(c.getGrade().getOrdinal()).toBe(Grade.of('fine').getOrdinal() - 1);
  });

  it('the same day in the cool turns it far less — the rate halves every ten degrees', () => {
    const hot = bundle(300);
    const cool = bundle(280);
    tick(24);
    expect(cool.getKineticExtent('inversion')).toBeLessThan(hot.getKineticExtent('inversion') / 2);
  });
});
