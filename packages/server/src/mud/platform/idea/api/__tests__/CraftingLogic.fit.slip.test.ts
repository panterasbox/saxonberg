/**
 * ⭐ `fit handle to jug` (ceramics W4): a SLIP joint joins green clay to
 * green clay at leather-hard only — too soft and it sags off, too dry and
 * the slip will not take — and a handle much wetter than its body cracks
 * where they meet as they dry.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CraftingApi } from '../../../../api/crafting';
import type { FitOutcome } from '../../../../api/crafting';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { WorldClockApi } from '../../../../api/worldclock';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Quantity } from '../../../../lib/quantity';
import Material from '../../../../lib/material/Material';
import Good from '../../../../lib/stuff/Good';
import JointCatalogue from '../../JointCatalogue';
import { Template } from '../../../../lib/stuff/Template';
import { Idea } from '../../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ThermalMixin } from '../../../../lib/thermal/Thermal';
import { MoistureMixin } from '../../../../lib/material/Moisture';
import { GreenwareMixin } from '../../../../lib/material/Greenware';
import { AssembledMixin } from '../../../../lib/craft/Assembled';
import { DurableMixin } from '../../../../lib/material/Durable';
import { TemplatePaths } from '../../../../lib/paths';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoomSlip';
}
class TestPotter extends ThermalMixin(ContainerMixin(ContainableMixin(Idea))) {
  static _mixinName = 'TestPotterSlip';
}
class GreenJug extends GreenwareMixin(
  MoistureMixin(AssembledMixin(DurableMixin(ThermalMixin(Good)))),
) {
  static _mixinName = 'TestGreenJugSlip';
}
class GreenHandle extends GreenwareMixin(MoistureMixin(ThermalMixin(Good))) {
  static _mixinName = 'TestGreenHandleSlip';
}

const CLAY = '/stuff/idea/material/_test/slip-clay';
const JUG = '/x/thing/jug';
const HANDLE = '/x/thing/handle';

let room: TestRoom;
let potter: TestPotter;

function clay(): Material {
  return StuffApi.findByTemplatePath<Material>(CLAY) as unknown as Material;
}

/** A thrown jug with its handle seat EMPTY — the line is waiting. */
function jug(moisture: number): GreenJug {
  const j = makeStuff(() => new GreenJug());
  stampTemplatePathForTest(j, JUG);
  j.setMaterial(clay());
  j.setMass(Quantity.of(1.2, 'kg'));
  j.setKeywords(['jug']);
  j.setBill({
    parts: [{ part: 'handle', template: HANDLE, count: 1, role: 'wear' }],
    joints: [{ key: 'handling', method: 'slip', members: ['handle'] }],
  });
  j.recordAssembly(
    [
      {
        part: 'handle',
        template: HANDLE,
        count: 1,
        role: 'wear',
        material: CLAY,
        grade: 'fair',
        condition: 1,
        failed: 1,
        makers: [],
      },
    ],
    [{ key: 'handling', method: 'slip', members: ['handle'], tension: 1, maker: '' }],
  );
  j.setWaterState({ moisture, solute: 0 });
  // ⚠ Standing nowhere: a piece in a test room would ask the biome chain
  // for its humidity, which a unit test does not load. Free-standing, the
  // water model reads its default air (60 % → equilibrium 0.6, so
  // leather-hard is moisture ≈ 0.66–0.88).
  return j;
}

function handle(moisture: number): GreenHandle {
  const h = makeStuff(() => new GreenHandle());
  stampTemplatePathForTest(h, HANDLE);
  h.setMaterial(clay());
  h.setMass(Quantity.of(0.15, 'kg'));
  h.setKeywords(['handle']);
  h.setWaterState({ moisture, solute: 0 });
  return h;
}

function fit(part: GreenHandle, whole: GreenJug): Promise<FitOutcome> {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(potter);
    return CraftingApi.fit({ part, whole });
  }) as unknown as Promise<FitOutcome>;
}

beforeEach(() => {
  StuffApi.clearAll();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockResolvedValue([] as never);
  WorldClockApi._setNowProviderForTesting(() => 1000);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('clay');
    m.setTags(['earth', 'plastic', 'clay']);
    m.setDensity(Quantity.of(1800, 'kg/m³'));
    return m;
  }, CLAY);
  vi.spyOn(Template, 'findByClass').mockImplementation(async (cls: string) =>
    cls === '/platform/idea/Joint'
      ? ([
          {
            path: '/platform/idea/Joint/slip',
            class: cls,
            data: {
              key: 'slip',
              portability: 'hand',
              instrument: '',
              competence: null,
              reversible: 'never',
              strength: 0.6,
              structuralRecovery: 0,
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
  room = makeStuff(() => new TestRoom());
  potter = makeStuffAtPath(() => new TestPotter(), '/platform/agent/Avatar/potter-1');
  ContainmentApi.move(potter, room);
});
afterEach(() => vi.restoreAllMocks());

describe('the slip joint', () => {
  it('⭐ a leather-hard handle fits a leather-hard jug — joined, sound, no handle returned', async () => {
    const j = jug(0.75);
    const out = await fit(handle(0.76), j);
    expect(out, JSON.stringify(out)).toMatchObject({ ok: true });
    if (!out.ok || out.arm !== 'replace') return;
    expect(out.part).toBe('handle');
    expect(out.returned).toBeNull();
    expect(j.getLine('handle')?.failed).toBe(0);
    expect(j.getFlaws()).toEqual([]);
  });

  it('a plastic jug is too soft to take it, and says so', async () => {
    const out = await fit(handle(0.76), jug(1));
    expect(out).toMatchObject({ ok: false, reason: 'not-leather-hard', detail: 'too-soft' });
  });

  it('a bone-dry handle is too dry for the slip to take', async () => {
    const out = await fit(handle(0.61), jug(0.75));
    expect(out).toMatchObject({ ok: false, reason: 'not-leather-hard', detail: 'too-dry' });
  });

  it('⭐ a handle much wetter than its body joins — and the join checks as they dry', async () => {
    const j = jug(0.68);
    const out = await fit(handle(0.86), j);
    expect(out.ok).toBe(true);
    expect(j.getFlaws().map((f) => f.kind)).toEqual(['check']);
  });
});
