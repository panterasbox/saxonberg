/**
 * ⭐ `fit lining to furnace` — a LINE named instead of a part (ceramics W5):
 * the part is whatever in reach is the line's row, or a row that `extends:`
 * it, and as many bricks as burnt through are renewed. Nothing in reach is
 * refused naming what the line is laid of.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Burner } from '../../../../lib/fire/Burner';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { chargeHot } from '../../../../lib/fire/__tests__/burner-fuel';
import Oven from '../../../thing/Oven';
import Good from '../../../../lib/stuff/Good';
import Material from '../../../../lib/material/Material';
import { StackableMixin } from '../../../../lib/stuff/Stackable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ThermalMixin } from '../../../../lib/thermal/Thermal';
import { Idea } from '../../../../lib/stuff/Idea';
import { Quantity } from '../../../../lib/quantity';
import { StuffApi } from '../../../../api/stuff';
import { CraftingApi } from '../../../../api/crafting';
import { ContainmentApi } from '../../../../api/containment';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { WorldClockApi } from '../../../../api/worldclock';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import JointCatalogue from '../../JointCatalogue';
import { Template } from '../../../../lib/stuff/Template';
import { TemplatePaths } from '../../../../lib/paths';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../../../lib/security/__tests__/test-setup';

class Firebricks extends StackableMixin(Good) {
  static _mixinName = 'LineFitTestFirebricks';
}
class Room extends ContainerMixin(Idea) {
  static _mixinName = 'LineFitTestRoom';
}
class Mason extends ThermalMixin(ContainerMixin(ContainableMixin(Idea))) {
  static _mixinName = 'LineFitTestMason';
}

const REFRACTORY = '/stuff/idea/material/_test/lining-refractory';
const BRICK = '/x/thing/firebrick';
const MADE = '/x/trade/thing/made-firebrick';

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
  vi.spyOn(Template, 'findByPath').mockImplementation((async (p: string) =>
    p === MADE ? { path: MADE, extends: BRICK, data: {} } : p === BRICK ? { path: BRICK, data: { shortDescription: 'firebrick' } } : null) as never);
  makeStuffAtPath(() => new JointCatalogue(), TemplatePaths.jointCatalogue);
  const room = makeStuff(() => new Room());
  mason = makeStuffAtPath(() => new Mason(), '/platform/agent/Avatar/mason-1');
  ContainmentApi.move(mason, room);
});
afterEach(() => vi.restoreAllMocks());

function bricks(n: number, row: string): Firebricks {
  const b = makeStuff(() => {
    const s = new Firebricks();
    s.setMass(Quantity.of(3, 'kg'));
    s.setMaterial(StuffApi.findByTemplatePath<Material>(REFRACTORY) as unknown as Material);
    s.setQuantity(n);
    s.setKeywords(['firebrick']);
    return s;
  });
  stampTemplatePathForTest(b, row);
  return b;
}

function burnt(): Oven {
  const o = furnace();
  for (let i = 0; i < 40 && (o.liningHealth() ?? 1) > 0.1; i++) o.wearLining(1500, 3600);
  return o;
}

function fitLine(o: Oven) {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(mason);
    return CraftingApi.fit({ whole: o, line: 'lining' });
  });
}

describe('fit lining to <furnace>', () => {
  it('⭐ relines with the firebrick in hand — the line names the part', async () => {
    const o = burnt();
    const failed = o.getLine('lining')!.failed;
    expect(failed).toBeGreaterThan(0);
    ContainmentApi.move(bricks(failed, BRICK), mason);
    const out = await fitLine(o);
    expect(out, JSON.stringify(out)).toMatchObject({ ok: true, arm: 'replace', part: 'lining', replaced: failed });
    expect(o.getLine('lining')!.failed).toBe(0);
    expect(o.ignite()).toMatchObject({ lit: true });
  });

  it('a made brick whose row extends the line\'s fits it (row lineage)', async () => {
    const o = burnt();
    ContainmentApi.move(bricks(8, MADE), mason);
    const out = await fitLine(o);
    expect(out, JSON.stringify(out)).toMatchObject({ ok: true, arm: 'replace' });
  });

  it('nothing in reach is refused, naming what the line is laid of', async () => {
    const o = burnt();
    const out = await fitLine(o);
    expect(out).toMatchObject({ ok: false, reason: 'insufficient-input', detail: 'line:firebrick' });
  });
});
