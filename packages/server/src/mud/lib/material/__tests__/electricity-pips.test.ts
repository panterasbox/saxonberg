/**
 * The shock-column pips (the armor inversion made legible). A steel
 * breastplate reads near-empty on the shock column ("conducts, barely
 * protects"); a rubber layer reads full. Renders `ConstructedMixin`'s
 * `responsePipsAugmenter` directly.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Armor from '../../../platform/thing/equipment/Armor';
import Material from '../Material';
import { Construction } from '../Construction';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';

let seq = 0;

function mat(conductivity: number): Material {
  const m = makeStuff(() => new Material());
  m.setElectricalConductivity(Quantity.of(conductivity, 'S/m'));
  m.setHardness(Quantity.of(600, 'MPa'));
  m.setToughness(Quantity.of(200, 'MJ/m³'));
  stampTemplatePathForTest(m, `/stuff/idea/material/test/pip-${seq++}`);
  return m;
}

function plateArmor(conductivity: number): Armor {
  const a = makeStuff(() => new Armor());
  a.setMaterial(mat(conductivity));
  a.setConstruction(Construction.of('plate'));
  return a;
}

/** Filled-pip count of the `shock` column in the rendered pip line. */
function shockPips(a: Armor): number {
  const augment = (Armor as unknown as {
    markupAugmenters: Array<(t: string, h: unknown, v: unknown) => string>;
  }).markupAugmenters[0]!;
  const rendered = augment('', a, a);
  const m = /shock (●*)○*/.exec(rendered);
  return m ? m[1]!.length : -1;
}

describe('electricity — the shock-column pips (armor inversion)', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => StuffApi.clearAll());

  it('steel plate reads near-empty (conducts → barely protects)', () => {
    expect(shockPips(plateArmor(6.0e6))).toBeLessThanOrEqual(1);
  });

  it('a rubber layer reads full (insulates → protects)', () => {
    expect(shockPips(plateArmor(1.0e-13))).toBeGreaterThanOrEqual(3);
  });

  it('the inversion is legible: rubber protects more than steel', () => {
    expect(shockPips(plateArmor(1.0e-13))).toBeGreaterThan(
      shockPips(plateArmor(6.0e6)),
    );
  });
});
