/**
 * #134 (the soak lane, field-population): a can of water that has crossed
 * its freezing point is moved to NOWHERE (`move(item, null)`) before
 * anything reconciled it. The move's `onMoved` restamp caught the clock up
 * with no container, the freeze branch threw `DetachedError`, and — the
 * restamp being fire-and-forget — the rejection was unhandled and took the
 * whole world down.
 *
 * A thing standing nowhere has no ambient to drift toward: the move to
 * nowhere does not restamp, and the next placement catches it up where it
 * now stands.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Water from '../../../platform/idea/material/Water';
import { ThermalMixin } from '../Thermal';
import { BulkableMixin } from '../../bulk/Bulkable';
import { ContainableMixin } from '../../spatial/Containable';
import { NamedMixin } from '../../description/Named';
import { Idea } from '../../stuff/Idea';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { ContainerMixin } from '../../spatial/Container';
import Good from '../../stuff/Good';
import { ContainmentApi } from '../../../api/containment';

class Can extends BulkableMixin(ThermalMixin(ContainableMixin(NamedMixin(Idea)))) {
  static _mixinName = 'DetachedMoveCan';
}
class Shed extends ContainerMixin(Good) {
  static _mixinName = 'DetachedMoveShed';
}

function water(): Water {
  return makeStuffAtPath(() => {
    const m = new Water();
    m.setName('detached-move-water');
    m.setKeywords(['detachedmovewater']);
    (m as unknown as { meltingPoint: Quantity<'K'> }).meltingPoint = Quantity.of(273, 'K');
    (m as unknown as { latentHeatOfFusion: Quantity<'J/kg'> }).latentHeatOfFusion =
      Quantity.of(334_000, 'J/kg');
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    return m;
  }, '/stuff/idea/material/_detached-move/water') as unknown as Water;
}

describe('#134 — a freezing can moved to nowhere', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('does not reconcile its freeze standing nowhere, and no rejection escapes', async () => {
    const rejections: unknown[] = [];
    const onRejection = (r: unknown): void => {
      rejections.push(r);
    };
    process.on('unhandledRejection', onRejection);
    try {
      const can = makeStuff(() => {
        const c = new Can();
        c.setName('can');
        c.interiorBulk = true;
        c.setInteriorCapacity(Quantity.of(10, 'L'));
        c.setBulkMaterial('interior', water());
        c.setBulkAmount('interior', Quantity.of(4, 'L'));
        return c;
      });
      ContainmentApi.move(can, makeStuff(() => new Shed()));
      // Deep under: (273 − 180)·4186·4 ≈ 1.56 MJ ≥ 4 L × 334 kJ — it would set.
      can.setStampedTemperatureK(180);
      can.setLastAmbientK(180);
      const restamp = vi.spyOn(can, 'restamp');

      expect(() => ContainmentApi.move(can, null)).not.toThrow();
      await new Promise((r) => setTimeout(r, 20));

      expect(restamp).not.toHaveBeenCalled();
      expect(rejections).toEqual([]);
      // Still the pool it was: nothing set, nothing lost.
      expect(can.getBulkAmount('interior').rawValue()).toBe(4);
    } finally {
      process.off('unhandledRejection', onRejection);
    }
  });

  it('a restamp that fails says so and never rejects — one object cannot take the world down', async () => {
    const can = makeStuff(() => {
      const c = new Can();
      c.setName('can');
      return c;
    });
    vi.spyOn(can, 'reconcileThermal').mockImplementation(() => {
      throw new Error('a material read before it was loaded');
    });
    const said = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(can.restamp()).resolves.toBeUndefined();
    expect(said).toHaveBeenCalled();
  });
});
