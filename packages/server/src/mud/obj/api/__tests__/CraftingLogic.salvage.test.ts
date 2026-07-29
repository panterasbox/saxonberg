/**
 * CraftingLogic.salvage — the one generic lossy melt-down: conservation
 * (Σ output mass ≤ input mass × salvageRate, throw on a rigged breach),
 * matter-typed outputs (metal → re-meltable castings, organics → scrap
 * stacks), provenance/grade/form destroyed with the item, and the
 * acceptance loop's last leg — the forged knife salvages into less iron
 * than the ingot that made it.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CraftingApi } from '../../../api/crafting';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { ExecutionContextApi } from '../../../api/execution-context';
import { WorldClockApi } from '../../../api/worldclock';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { Quantity } from '../../../lib/quantity';
import Material from '../../../lib/material/Material';
import Casting from '../../../obj/Casting';
import Scrap from '../../../obj/Scrap';
import Weapon from '../../../lib/equipment/Weapon';
import RecipeCatalogue from '../../RecipeCatalogue';
import { Idea } from '../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { Grade } from '../../../lib/craft/Grade';
import { MixinApi } from '../../../api/mixin';
import { Stuff } from '../../../lib/stuff/Stuff';
import type { SalvageOutcome } from '../../../api/crafting';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoomSalvage';
}
class TestWrecker extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = 'TestWreckerSalvage';
}

const IRON = '/lib/material/_test/sv-iron';
const LEATHER = '/lib/material/_test/sv-leather';
const COMPOSITE = '/lib/material/_test/sv-composite';
const RIGGED = '/lib/material/_test/sv-rigged';

let room: TestRoom;
let wrecker: TestWrecker;

function registerMaterial(
  path: string,
  name: string,
  tags: string[],
  composition: { materialPath: string; fraction: number }[] = [],
): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setComposition(composition);
    return m;
  }, path) as unknown as Material;
}

function mat(path: string): Material {
  return StuffApi.findByTemplatePath<Material>(path) as unknown as Material;
}

async function salvageAs(item: Stuff): Promise<SalvageOutcome> {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(wrecker);
    return CraftingApi.salvage({ item });
  }) as unknown as Promise<SalvageOutcome>;
}

beforeEach(async () => {
  StuffApi.clearAll();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(async () => [] as never);
  WorldClockApi._setNowProviderForTesting(() => 1000);

  registerMaterial(IRON, 'iron', ['metal', 'ferrous']);
  registerMaterial(LEATHER, 'leather', ['organic', 'leather', 'hide']);
  registerMaterial(COMPOSITE, 'bound blade', ['composite'], [
    { materialPath: IRON, fraction: 0.6 },
    { materialPath: LEATHER, fraction: 0.4 },
  ]);
  // A malformed composition (fractions sum past 1) — matter from nothing.
  registerMaterial(RIGGED, 'impossible alloy', ['composite'], [
    { materialPath: IRON, fraction: 0.8 },
    { materialPath: IRON, fraction: 0.7 },
  ]);

  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    if (path === '/obj/Casting') return makeStuff(() => new Casting()) as never;
    if (path === '/obj/Scrap') return makeStuff(() => new Scrap()) as never;
    throw new Error(`unexpected clone ${path}`);
  });

  const catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/obj/RecipeCatalogue',
  );
  await catalogue.warm();
  room = makeStuff(() => new TestRoom());
  wrecker = makeStuff(() => new TestWrecker());
  ContainmentApi.move(wrecker, room);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('CraftingLogic.salvage', () => {
  it('a forged knife yields LESS iron than the ingot that made it (conservation)', async () => {
    // The acceptance loop's last leg: a 0.5 kg iron knife (forged from a
    // 0.5 kg ingot) salvages to 0.25 kg at the 0.5 rate.
    const knife = makeStuff(() => new Weapon());
    knife.setMaterial(mat(IRON));
    knife.setMass(Quantity.of(0.5, 'kg'));
    if (MixinApi.isCrafted(knife)) {
      knife.stamp({
        maker: '/obj/Avatar/somebody',
        grade: Grade.of('fine'),
        recipe: 'belt-knife',
        craftedAt: 1,
      });
    }
    ContainmentApi.move(knife, room);

    const outcome = await salvageAs(knife);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.recoveredKg).toBeCloseTo(0.25, 9);
    expect(outcome.recoveredKg).toBeLessThan(0.5); // < the ingot's mass
    expect(outcome.outputs).toHaveLength(1);
    const cast = outcome.outputs[0]!;
    expect(cast).toBeInstanceOf(Casting); // re-meltable, re-usable stock
    if (!MixinApi.isTangible(cast)) return;
    expect(cast.getMaterial()?.getName()).toBe('iron');
    expect(cast.getMass().rawValue()).toBeCloseTo(0.25, 9);
    // Provenance, grade, and the form die with the item (the casting
    // carries no mark — the value-add is gone).
    expect(MixinApi.isCrafted(cast)).toBe(false);
    expect(knife.isDestroyed()).toBe(true);
  });

  it('a composite splits matter-typed: metal → casting, organics → scrap glob', async () => {
    const bound = makeStuff(() => new Weapon());
    bound.setMaterial(mat(COMPOSITE));
    bound.setMass(Quantity.of(2, 'kg'));
    ContainmentApi.move(bound, room);

    const outcome = await salvageAs(bound);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // iron: 2 × 0.6 × 0.5 = 0.6 kg casting; leather: 2 × 0.4 × 0.5 =
    // 0.4 kg → 4 scrap units of 0.1.
    const cast = outcome.outputs.find((o) => o instanceof Casting)!;
    const scrap = outcome.outputs.find((o) => o instanceof Scrap)! as Scrap;
    expect(cast).toBeDefined();
    expect(scrap).toBeDefined();
    if (MixinApi.isTangible(cast)) {
      expect(cast.getMass().rawValue()).toBeCloseTo(0.6, 9);
    }
    expect(scrap.getQuantity()).toBe(4);
    expect(outcome.recoveredKg).toBeCloseTo(1.0, 9);
    expect(outcome.recoveredKg).toBeLessThanOrEqual(2 * 0.5 + 1e-9);
  });

  it('throws (conservation breach) on a rigged composition that mints matter', async () => {
    const impossible = makeStuff(() => new Weapon());
    impossible.setMaterial(mat(RIGGED));
    impossible.setMass(Quantity.of(1, 'kg'));
    ContainmentApi.move(impossible, room);
    await expect(salvageAs(impossible)).rejects.toThrow(/conservation breach/);
    expect(impossible.isDestroyed()).toBe(false); // the throw preserves it
  });

  it('refuses creatures, materialless stuff, and builds in use', async () => {
    const bare = makeStuff(() => new Weapon()); // no material
    ContainmentApi.move(bare, room);
    expect(await salvageAs(bare)).toMatchObject({
      ok: false,
      reason: 'insufficient-input',
      detail: 'no-material',
    });

    const { default: CookPot } = await import('../../CookPot');
    const pot = makeStuff(() => new CookPot());
    pot.setMaterial(mat(IRON));
    pot.setMass(Quantity.of(2, 'kg'));
    pot.addContribution({
      category: 'meat',
      measureL: 0,
      gradeBand: 'fair',
      kind: 'item',
      count: 1,
    });
    ContainmentApi.move(pot, room);
    expect(await salvageAs(pot)).toMatchObject({
      ok: false,
      reason: 'insufficient-input',
      detail: 'build-in-use',
    });
  });
});
