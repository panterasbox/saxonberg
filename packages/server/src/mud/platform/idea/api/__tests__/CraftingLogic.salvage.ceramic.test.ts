/**
 * ⭐ Recast (ceramics S18): what a cast salvages to follows from what it is.
 *
 *   - fired clay salvages to SHERDS — its material's authored broken form,
 *     whole by mass (breaking a pot loses nothing but the pot);
 *   - an ALLOY salvages as itself — pewter remelted is pewter, never its
 *     tin and its lead apart.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CraftingApi } from '../../../../api/crafting';
import type { SalvageOutcome } from '../../../../api/crafting';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { WorldClockApi } from '../../../../api/worldclock';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Quantity } from '../../../../lib/quantity';
import Material from '../../../../lib/material/Material';
import Casting from '../../../thing/Casting';
import MetalCasting from '../../../thing/MetalCasting';
import Scrap from '../../../thing/Scrap';
import RecipeCatalogue from '../../RecipeCatalogue';
import { Idea } from '../../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import Good from '../../../../lib/stuff/Good';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoomSalvageCeramic';
}
class TestWrecker extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = 'TestWreckerSalvageCeramic';
}

const TIN = '/stuff/idea/material/_test/svc-tin';
const LEAD = '/stuff/idea/material/_test/svc-lead';
const PEWTER = '/stuff/idea/material/_test/svc-pewter';
const EARTHENWARE = '/stuff/idea/material/_test/svc-earthenware';
const SHERDS = '/stuff/thing/_test/sherds';

let wrecker: TestWrecker;
let cloned: string[] = [];

function registerMaterial(path: string, setup: (m: Material) => void): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!.replace('svc-', ''));
    setup(m);
    return m;
  }, path) as unknown as Material;
}

async function salvageAs(item: Stuff): Promise<SalvageOutcome> {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(wrecker);
    return CraftingApi.salvage({ item });
  }) as unknown as Promise<SalvageOutcome>;
}

beforeEach(async () => {
  StuffApi.clearAll();
  cloned = [];
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(async () => [] as never);
  WorldClockApi._setNowProviderForTesting(() => 1000);
  registerMaterial(TIN, (m) => {
    m.setTags(['metal']);
    m.setMeltingPoint(Quantity.of(505, 'K'));
  });
  registerMaterial(LEAD, (m) => {
    m.setTags(['metal']);
    m.setMeltingPoint(Quantity.of(600, 'K'));
  });
  registerMaterial(PEWTER, (m) => {
    m.setTags(['alloy', 'metal']);
    m.setMeltingPoint(Quantity.of(500, 'K'));
    m.setComposition([
      { materialPath: TIN, fraction: 0.8 },
      { materialPath: LEAD, fraction: 0.2 },
    ]);
  });
  registerMaterial(EARTHENWARE, (m) => {
    m.setTags(['ceramic', 'brittle', 'fired']);
    m.setBrokenTemplate(SHERDS);
  });
  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    cloned.push(path);
    if (path === '/stuff/thing/metal-casting') return makeStuff(() => new MetalCasting()) as never;
    if (path === '/stuff/thing/Casting') return makeStuff(() => new Casting()) as never;
    if (path === SHERDS || path === '/stuff/thing/Scrap') return makeStuff(() => new Scrap()) as never;
    throw new Error(`unexpected clone ${path}`);
  });
  const catalogue = makeStuffAtPath(() => new RecipeCatalogue(), '/platform/idea/RecipeCatalogue');
  await catalogue.warm();
  const room = makeStuff(() => new TestRoom());
  wrecker = makeStuff(() => new TestWrecker());
  ContainmentApi.move(wrecker, room);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

function piece(materialPath: string, kg: number): Good {
  const g = makeStuff(() => new Good());
  g.setMaterial(StuffApi.findByTemplatePath<Material>(materialPath)!);
  g.setMass(Quantity.of(kg, 'kg'));
  ContainmentApi.move(g, wrecker);
  return g;
}

describe('salvage — recast (ceramics S18)', () => {
  it('⭐ a fired pot salvages to SHERDS, whole by mass', async () => {
    const pot = piece(EARTHENWARE, 0.5);
    const out = await salvageAs(pot);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(cloned).toEqual([SHERDS]);
    expect(out.recoveredKg).toBeCloseTo(0.5, 6);
    expect(pot.isDestroyed()).toBe(true);
  });

  it('⭐ a pewter cast salvages to a lump of PEWTER — an alloy is not unmixed by melting', async () => {
    const cast = piece(PEWTER, 1);
    const out = await salvageAs(cast);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.outputs).toHaveLength(1);
    const lump = out.outputs[0] as unknown as Good;
    expect(lump.getMaterial()?.getTemplatePath()).toBe(PEWTER);
  });
});
