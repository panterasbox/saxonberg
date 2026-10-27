/**
 * The iron pot boils lye down to black salts (potash D11, converged on the
 * sugar build's plateau — `potash-on-sugar`).
 *
 * ⭐ The kernel plateau takes the water off and KEEPS the alkali, so the
 * strength climbs and the egg rides higher; boiled down to saturation the
 * pot casts a cake of black salts of the alkali over its purity, graded as
 * the lye was. The plateau is stood in for here by what it does between
 * two reads: the litres fall and the dissolved mass stays.
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
  /** The plateau's work, between two reads: water off as steam, the alkali kept. */
  const boilTo = (p: IronPot, litres: number): void => {
    const was = p.getBulkAmount('interior').rawValue();
    const payload = p.getBulkPayload('interior') ?? {};
    const kg = (payload.dissolvedSolidsKgPerL ?? 0) * was;
    p.setBulkAmount('interior', Quantity.of(litres, 'L'));
    p.setBulkPayload('interior', { ...payload, dissolvedSolidsKgPerL: kg / litres });
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

  it('⭐⭐ boiled down, it casts black salts of the alkali over the purity, graded as the lye', () => {
    const p = pot(30, 0.06);
    p.getContents();
    boilTo(p, 10);
    boilTo(p, 1.5);
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

  it('⭐⭐ the cake is whose the LYE was — the communal oven — and nobody\'s when it was nobody\'s', () => {
    const mine = { kind: 'player' as const, templatePath: '/platform/agent/Avatar/alice' };
    const p = pot(30, 0.06);
    p.setBulkPayload('interior', { dissolvedSolidsKgPerL: 0.06, contentsOwner: mine });
    p.getContents();
    boilTo(p, 1.5);
    expect((cast.mock.calls[0]![0] as { madeBy?: unknown }).madeBy).toEqual(mine);
    const q = pot(30, 0.06); // rain and nobody's ash
    q.getContents();
    boilTo(q, 1.5);
    expect((cast.mock.calls[0]![0] as { madeBy?: unknown }).madeBy).toBeNull();
  });

  it('⭐ WATER carrying dissolved alkali (a hopper drawn early) still sets its salts — the alkali is not lost with the steam', () => {
    const p = pot(30, 0.06);
    const water = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('rain water');
      m.setTags(['liquid', 'water']);
      return m;
    }, '/stuff/idea/material/_pot-water');
    p.setBulkMaterial('interior', water);
    p.setBulkPayload('interior', { dissolvedSolidsKgPerL: 0.06 });
    p.getContents();
    boilTo(p, 1.5);
    expect(cast).toHaveBeenCalledTimes(1);
    expect((cast.mock.calls[0]![0] as { massKg: number }).massKg).toBeCloseTo(1.8 / 0.65, 6);
  });

  it('⭐ a weak lye boiled the same way leaves a third of the cake (AC 5, AC 6)', () => {
    const p = pot(30, 0.02);
    p.getContents();
    boilTo(p, 0.5); // 0.6 kg in half a litre: past saturation
    const pool = cast.mock.calls[0]![0] as { massKg: number };
    expect(pool.massKg).toBeCloseTo(0.6 / 0.65, 6);
  });

  it('a pour INTO a working pot reads the blended strength (the pour folds it)', () => {
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
