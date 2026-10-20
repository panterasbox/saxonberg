/**
 * ⭐ A molten pool carries its composition (ceramics ruling C, revision 2).
 *
 * Whole objects remelt by phase change — no recipe, no class changing at a
 * rung. A green (iron-bearing) piece of glass melts in a lit kiln into the
 * pot standing beside it (`poolVesselIn`), the pool's payload carries what
 * was dissolved in the piece (`alloying`), and when the pool sets the lump
 * reads the iron back — so a green bottle remelted comes back green. Two
 * pools blend their composition by volume.
 */

import '../../../../test-bootstrap';
import type { Burner } from '../../fire/Burner';
import { chargeHot } from '../../fire/__tests__/burner-fuel';
import type { Stuff } from '../../stuff/Stuff';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Place from '../../stuff/Place';
import Material from '../../material/Material';
import Oven from '../../../platform/thing/Oven';
import Casting from '../../../platform/thing/Casting';
import Receptacle from '../../../platform/thing/Receptacle';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const IRON = '/stuff/idea/material/element/iron';
const SCALE = 12;
let real = 0;
const advance = (gameSec: number): void => {
  real += (gameSec / SCALE) * 1000;
};

let seq = 0;
function glass(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('glass');
    m.setTags(['glass']);
    m.setDensity(Quantity.of(2500, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(840, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(1, 'W/(m·K)'));
    m.setMeltingPoint(Quantity.of(1300, 'K'));
    m.setLatentHeatOfFusion(Quantity.of(150000, 'J/kg'));
    return m;
  }, `/stuff/idea/material/_test/pool-glass-${seq}`) as unknown as Material;
}

describe('a pool remembers what melted into it', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  it('⭐ a green piece melts into the pot beside it, and the pool sets green', async () => {
    const g = glass();
    const room = makeStuff(() => {
      const r = new Place();
      r.setTemperature(Quantity.of(293, 'K'));
      return r;
    });
    const kiln = makeStuff(() => new Oven());
    chargeHot(kiln as unknown as Stuff & Burner, 400);
    kiln.setBurnTemperatureK(1600);
    await ContainmentApi.move(kiln, room as never);
    if (!kiln.isLit()) kiln.ignite();

    const pot = makeStuff(() => new Receptacle());
    pot.interiorBulk = true;
    pot.setInteriorCapacity(Quantity.of(5, 'L'));
    await ContainmentApi.move(pot, kiln as never);

    const cullet = makeStuff(() => new Casting());
    cullet.setMaterial(g);
    cullet.setMass(Quantity.of(1, 'kg'));
    cullet.setAlloying([{ materialPath: IRON, fraction: 0.006 }]);
    cullet.setStampedTemperatureK(293);
    cullet.setLastAmbientK(293);
    await ContainmentApi.move(cullet, kiln as never);
    await cullet.restamp();
    cullet.reconcileThermal();

    advance(12 * 3600);
    cullet.getTemperature();
    for (let i = 0; i < 8; i++) await new Promise<void>((r) => setTimeout(r, 0));
    expect(cullet.isDestroyed()).toBe(true);
    // The pot caught it — not the floor of a floorless chamber.
    expect(pot.getBulkMaterialPath('interior')).toBe(g.getTemplatePath());
    expect(pot.getBulkAmount('interior').rawValue()).toBeCloseTo(0.4, 3);
    expect(pot.getBulkPayload('interior')?.alloying).toEqual([
      { materialPath: IRON, fraction: 0.006 },
    ]);

    // Out of the kiln it cools, plateaus and SETS as a lump of the material
    // — and the lump reads the iron back off the pool.
    vi.spyOn(StuffApi, 'clone').mockImplementation((async () => makeStuff(() => new Casting())) as never);
    await ContainmentApi.move(pot, room as never);
    await pot.restamp();
    pot.setContentsTemperature(1200);
    for (let i = 0; i < 20 && pot.getBulkAmount('interior').rawValue() > 0; i++) {
      advance(3600);
      pot.getTemperature();
    }
    for (let i = 0; i < 8; i++) await new Promise<void>((r) => setTimeout(r, 0));
    const lump = (room as unknown as { getContents(): Stuff[] })
      .getContents()
      .find((c) => c instanceof Casting) as Casting | undefined;
    expect(lump).toBeDefined();
    expect(lump!.fractionOf(IRON)).toBeCloseTo(0.006, 6);
  });

  it('two pools blend their composition by volume', () => {
    const out = BulkableApi.blendPayloads(
      { alloying: [{ materialPath: IRON, fraction: 0.006 }] },
      1,
      { alloying: [{ materialPath: IRON, fraction: 0 }] },
      2,
    );
    expect(out.alloying?.[0]?.fraction).toBeCloseTo(0.002, 6);
    const clear = BulkableApi.blendPayloads(null, 1, null, 1);
    expect(clear.alloying).toBeUndefined();
  });
});
