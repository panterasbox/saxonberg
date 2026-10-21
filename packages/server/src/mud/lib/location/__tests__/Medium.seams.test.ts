/**
 * ⭐⭐ The medium, seam by seam (underwater B1, D29 seams 1, 2, 5, 6).
 *
 *  1. No flame under the water: striking a light is refused before
 *     anything is struck, in the medium's words.
 *  2. Ink on a soaked page has run; a fixed sign in the rain is still
 *     legible.
 *  5. An air voice under the water is bubbles (Swimming.test.ts pins it).
 *  6. Under the water an air-breather takes nothing in by mouth; at the
 *     surface it may.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import Good from '../../stuff/Good';
import Material from '../../material/Material';
import { ThermalMixin } from '../../thermal/Thermal';
import { WetMixin } from '../../wetness/Wet';
import { ReservedMixin, Reserve } from '../../reserve';
import { CombustibleMixin } from '../../fire/Combustible';
import { MarkedMixin } from '../../description/Marked';
import { ContainableMixin } from '../../spatial/Containable';
import { Character } from '../../character/Character';
import { StuffApi } from '../../../api/stuff';
import { BiomeApi, type MediumRead } from '../../../api/biome';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

class Firewood extends CombustibleMixin(WetMixin(ThermalMixin(ReservedMixin(Good)))) {
  static _mixinName = 'FirewoodMedium';
}
class Page extends MarkedMixin(WetMixin(ContainableMixin(Good))) {
  static _mixinName = 'PageMedium';
}
class TestCharacter extends Character {}

const UNDER: MediumRead = {
  tag: 'water', substance: 'water', immersed: true, atSurface: false,
  temperatureK: 285, depthM: 3, waterRef: null,
};
const SURFACE: MediumRead = { ...UNDER, atSurface: true, depthM: 0 };

function wood(): Firewood {
  const m = makeStuffAtPath(() => {
    const mat = new Material();
    mat.setName('medium-test-wood');
    mat.setAutoignitionTemperature(Quantity.of(570, 'K'));
    mat.setHeatOfCombustion(Quantity.of(16, 'MJ/kg'));
    return mat;
  }, '/stuff/idea/material/_test/medium-test-wood') as unknown as Material;
  return makeStuff(() => {
    const f = new Firewood();
    f.setMass(Quantity.of(1, 'kg'));
    f.setMaterial(m);
    f.setReserve(new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null));
    return f;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the medium, seam by seam (underwater B1)', () => {
  it('⭐ seam 1: no flame under the water — refused before anything is struck', () => {
    const log = wood();
    vi.spyOn(BiomeApi, 'mediumFor').mockReturnValue(UNDER);
    expect(log.ignite()).toEqual({ lit: false, reason: 'no-air' });
    expect(log.isBurning()).toBe(false);
  });

  it('⭐ seam 2: the ink on a soaked page has run; dried, the words do not come back', () => {
    const page = makeStuff(() => new Page());
    page.setMarkText('Meet me at the quay at dusk.');
    expect(page.getMarkText()).toBe('Meet me at the quay at dusk.');
    page.wet(1);
    expect(page.getMarkText()).toMatch(/ink has run/);
  });

  it('seam 2: marks pressed into the surface are not ink', () => {
    const page = makeStuff(() => new Page());
    page.setMarkText('ok');
    page.setMarkForm('embossed');
    page.wet(1);
    expect(page.getMarkText()).toBe('ok');
  });

  it('⭐ seam 6: under the water an air-breather takes nothing in by mouth; at the surface it may', () => {
    const c = makeStuff(() => new TestCharacter());
    vi.spyOn(BiomeApi, 'mediumFor').mockReturnValue(UNDER);
    expect(c.canIngest()).toMatchObject({ ok: false, reason: 'airway' });
    vi.spyOn(BiomeApi, 'mediumFor').mockReturnValue(SURFACE);
    expect(c.canIngest()).toEqual({ ok: true });
  });
});
