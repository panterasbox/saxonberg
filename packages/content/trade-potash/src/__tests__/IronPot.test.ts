/**
 * The iron pot keeps count of its alkali across the boil (potash D11).
 *
 * ⭐ The kernel plateau takes the water off; the pot keeps the alkali and
 * rewrites the strength, so the egg rides higher as it boils down; when
 * the water is gone the pot casts a cake of black salts of the alkali over
 * its purity, graded as the lye was. The plateau is stood in for here by
 * the litres falling between reads — that is all the pot ever sees of it.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import IronPot from '../thing/IronPot';
import Material from '@saxonberg/server/mud/lib/material/Material';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

const SALTS = '/trade/potash/idea/material/black-salts';

function lye(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test lye');
    m.setTags(['liquid', 'caustic', 'alkali', 'lye']);
    m.setDensity(Quantity.of(1100, 'kg/m³'));
    return m;
  }, '/trade/chandlery/idea/material/_test-lye');
}

describe('the iron pot', () => {
  let liquor: Material;
  let cast: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    installV1QuantityMarshallers();
    liquor = lye();
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('black salts');
      m.setTags(['solid', 'potash', 'black-salts']);
      return m;
    }, SALTS);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  function pot(litres: number, kgPerL: number): IronPot {
    const p = makeStuff(() => new IronPot());
    p.setInteriorCapacity(Quantity.of(40, 'L'));
    p.setBulkMaterial('interior', liquor);
    p.setBulkAmount('interior', Quantity.of(litres, 'L'));
    p.setBulkPayload('interior', { dissolvedSolidsKgPerL: kgPerL });
    (p as unknown as { setGrade(g: Grade): void }).setGrade(Grade.of('fine'));
    cast = vi.fn(async () => null);
    vi.spyOn(p, 'castInto').mockImplementation(cast as never);
    return p;
  }
  const strength = (p: IronPot): number => p.getBulkPayload('interior')?.dissolvedSolidsKgPerL ?? 0;
  /** The plateau's work, between two reads: litres off as steam. */
  const boilTo = (p: IronPot, litres: number): void => {
    if (litres > 0) p.setBulkAmount('interior', Quantity.of(litres, 'L'));
    else {
      p.setBulkAmount('interior', Quantity.of(0, 'L'));
      p.setBulkMaterial('interior', null);
    }
    p.getContents();
  };

  it('⭐ the alkali stays as the water goes — the strength climbs', () => {
    const p = pot(30, 0.06);
    expect(p.getAlkaliKg()).toBeCloseTo(1.8, 6);
    boilTo(p, 15);
    expect(p.getAlkaliKg()).toBeCloseTo(1.8, 6);
    expect(strength(p)).toBeCloseTo(0.12, 6);
    boilTo(p, 5);
    expect(strength(p)).toBeCloseTo(0.36, 6);
  });

  it('⭐⭐ boiled dry, it casts black salts of the alkali over the purity, graded as the lye', () => {
    const p = pot(30, 0.06);
    p.getContents();
    boilTo(p, 10);
    boilTo(p, 0);
    expect(cast).toHaveBeenCalledTimes(1);
    const pool = cast.mock.calls[0]![0] as { material: Material; massKg: number };
    expect(pool.material.getTemplatePath()).toBe(SALTS);
    expect(pool.massKg).toBeCloseTo(1.8 / 0.65, 6);
    expect(p.getAlkaliKg()).toBe(0);
  });

  it('⭐ boiled down to SATURATION the salts set — it need not reach dry', () => {
    const p = pot(30, 0.06); // 1.8 kg of alkali
    p.getContents();
    boilTo(p, 2); // 0.9 kg/L — not yet
    expect(cast).not.toHaveBeenCalled();
    boilTo(p, 1.5); // 1.2 kg/L — past saturation
    expect(cast).toHaveBeenCalledTimes(1);
    expect((cast.mock.calls[0]![0] as { massKg: number }).massKg).toBeCloseTo(1.8 / 0.65, 6);
    expect(p.getBulkAmount('interior').rawValue()).toBe(0);
  });

  it('⭐ a weak lye boiled the same way leaves a third of the cake (AC 5, AC 6)', () => {
    const p = pot(30, 0.02);
    p.getContents();
    boilTo(p, 0);
    const pool = cast.mock.calls[0]![0] as { massKg: number };
    expect(pool.massKg).toBeCloseTo(0.6 / 0.65, 6);
  });

  it('a pour INTO a working pot re-bases the count off the blended strength', () => {
    const p = pot(20, 0.06);
    p.getContents();
    boilTo(p, 10); // 1.2 kg in 10 L: 0.12
    // A second pour, blended by the pour to (10·0.12 + 10·0.03)/20.
    p.setBulkAmount('interior', Quantity.of(20, 'L'));
    p.setBulkPayload('interior', { dissolvedSolidsKgPerL: 0.075 });
    expect(p.getAlkaliKg()).toBeCloseTo(1.5, 6);
  });

  it('an empty pot with nothing counted casts nothing', () => {
    const p = makeStuff(() => new IronPot());
    const spy = vi.spyOn(p, 'castInto');
    p.getContents();
    expect(spy).not.toHaveBeenCalled();
  });
});
