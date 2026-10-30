/**
 * ⭐ A chamber furnace's lining is a part that wears (ceramics D19): every
 * hold eats firebrick, a thinning lining holds less heat, a burnt-through
 * one will not light, and `fit` with firebricks relines it.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Burner } from '../../../lib/fire/Burner';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { chargeHot } from '../../../lib/fire/__tests__/burner-fuel';
import Oven from '../Oven';
import Good from '../../../lib/stuff/Good';
import Material from '../../../lib/material/Material';
import { StackableMixin } from '../../../lib/stuff/Stackable';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { ThermalMixin } from '../../../lib/thermal/Thermal';
import { Idea } from '../../../lib/stuff/Idea';
import { Quantity } from '../../../lib/quantity';
import { StuffApi } from '../../../api/stuff';
import { CraftingApi } from '../../../api/crafting';
import { ContainmentApi } from '../../../api/containment';
import { ExecutionContextApi } from '../../../api/execution-context';
import { WorldClockApi } from '../../../api/worldclock';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import JointCatalogue from '../../idea/JointCatalogue';
import { Template } from '../../../lib/stuff/Template';
import { TemplatePaths } from '../../../lib/paths';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../../lib/security/__tests__/test-setup';

class Firebricks extends StackableMixin(Good) {
  static _mixinName = 'LiningTestFirebricks';
}
class Room extends ContainerMixin(Idea) {
  static _mixinName = 'LiningTestRoom';
}
class Mason extends ThermalMixin(ContainerMixin(ContainableMixin(Idea))) {
  static _mixinName = 'LiningTestMason';
}

const REFRACTORY = '/stuff/idea/material/_test/lining-refractory';
const BRICK = '/x/thing/firebrick';

let mason: Mason;

function furnace(): Oven {
  return makeStuff(() => {
    const o = new Oven();
    o.setBurnTemperatureK(1500);
    chargeHot(o as unknown as Stuff & Burner, 200);
    o.setBill({
      parts: [{ part: 'lining', template: BRICK, count: 8, role: 'wear', material: REFRACTORY }],
      joints: [{ key: 'lining', method: 'dry-laid', members: ['lining'] }],
    });
    o.ensureParts();
    o._setLit(false);
    return o;
  });
}

beforeEach(() => {
  StuffApi.clearAll();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockResolvedValue([] as never);
  WorldClockApi._setNowProviderForTesting(() => 1000);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('refractory');
    m.setMeltingPoint(Quantity.of(1950, 'K'));
    return m;
  }, REFRACTORY);
  vi.spyOn(Template, 'findByClass').mockImplementation(async (cls: string) =>
    cls === '/platform/idea/Joint'
      ? ([
          {
            path: '/platform/idea/Joint/dry-laid',
            class: cls,
            data: {
              key: 'dry-laid',
              portability: 'hand',
              instrument: '',
              competence: null,
              reversible: 'effort',
              strength: 0.7,
              structuralRecovery: 0.5,
              fastenerRecovery: 0,
              tightenable: false,
              failure: 'parted',
            },
          },
        ] as never)
      : ([] as never),
  );
  vi.spyOn(Template, 'findByPath').mockResolvedValue(null as never);
  makeStuffAtPath(() => new JointCatalogue(), TemplatePaths.jointCatalogue);
  const room = makeStuff(() => new Room());
  mason = makeStuffAtPath(() => new Mason(), '/platform/agent/Avatar/mason-1');
  ContainmentApi.move(mason, room);
});
afterEach(() => vi.restoreAllMocks());

describe('the lining', () => {
  it('a new lining is whole and holds the full heat', () => {
    const o = furnace();
    expect(o.liningHealth()).toBeCloseTo(1, 6);
    expect(o.heatCeilingFactor()).toBeCloseTo(1, 6);
  });

  it('⭐ every hold wears it; a thinning lining holds less heat', () => {
    const o = furnace();
    const ceiling = o.heatCeilingFactor();
    o.wearLining(1500, 3600);
    expect(o.liningHealth()!).toBeLessThan(1);
    expect(o.heatCeilingFactor()).toBeLessThan(ceiling);
  });

  it('⭐⭐ burnt through it will not light; relined with firebrick it does', async () => {
    const o = furnace();
    for (let i = 0; i < 40 && (o.liningHealth() ?? 1) > 0.1; i++) o.wearLining(1500, 3600);
    expect(o.liningHealth()!).toBeLessThanOrEqual(0.15);
    expect(o.ignite()).toMatchObject({ lit: false, reason: 'lining-burnt-through' });

    const bricks = makeStuff(() => {
      const b = new Firebricks();
      b.setMass(Quantity.of(3, 'kg'));
      b.setMaterial(StuffApi.findByTemplatePath<Material>(REFRACTORY) as unknown as Material);
      b.setQuantity(8);
      b.setKeywords(['firebrick', 'lining']);
      return b;
    });
    stampTemplatePathForTest(bricks, BRICK);
    const out = await ExecutionContextApi.runRoot(null, 'test', () => {
      ExecutionContextApi.tagActingAuthor(mason);
      return CraftingApi.fit({ part: bricks, whole: o });
    });
    expect(out, JSON.stringify(out)).toMatchObject({ ok: true });
    expect(o.liningHealth()!).toBeGreaterThan(0.8);
    expect(o.ignite()).toMatchObject({ lit: true });
  });
});
