/**
 * CraftingLogic branches — the crafting-branches growth over the same
 * skeleton: the tangible (smithing) and edible (cooking) output seams, the
 * discrete/glob item consume seam with its conservation guard, the
 * `requiresHeatK` gate (the reachable-heat seam consumed at last), and the
 * gather walk's two new rungs (maker inventory + open-container descent).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CraftingApi } from '../../../api/crafting';
import type { CraftRequest } from '../../../api/crafting';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { ExecutionContextApi } from '../../../api/execution-context';
import { WorldClockApi } from '../../../api/worldclock';
import { MixinApi } from '../../../api/mixin';
import { BulkableApi } from '../../../api/bulk';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { Quantity } from '../../../lib/quantity';
import Material from '../../../lib/material/Material';
import Thing from '../../../lib/stuff/Thing';
import Ingot from '../../../obj/Ingot';
import Forge from '../../../obj/Forge';
import ToolItem from '../../../lib/craft/ToolItem';
import CraftedDrink from '../../../domain/lounge/CraftedDrink';
import GradedReceptacle from '../../../domain/lounge/GradedReceptacle';
import RecipeCatalogue from '../../RecipeCatalogue';
import { Reserve } from '../../../lib/reserve';
import { Idea } from '../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { SealableMixin } from '../../../lib/spatial/Sealable';
import { NamedMixin } from '../../../lib/description/Named';
import { CraftedMixin } from '../../../lib/craft/Crafted';
import { GlobbableMixin } from '../../../lib/stuff/Globbable';
import { Stuff } from '../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoomBranches';
}
/** A maker with an inventory (Container) — the carried-kit gather rung. */
class TestSmith extends ContainerMixin(NamedMixin(ContainableMixin(Idea))) {
  static _mixinName = 'TestSmithBranches';
}
/** The smithing output form — a Crafted Tangible (Thing composes Tangible). */
class TestKnife extends CraftedMixin(Thing) {
  static _mixinName = 'TestKnifeBranches';
}
/** A sealable stock chest — the open-container gather rung. */
class TestChest extends SealableMixin(ContainerMixin(Thing)) {
  static _mixinName = 'TestChestBranches';
}
/** A fungible discrete foodstuff — the glob debit path. */
class TestProduce extends GlobbableMixin(Thing) {
  static _mixinName = 'TestProduceBranches';
}

const IRON = '/lib/material/_test/branch-iron';
const VEG = '/lib/material/_test/branch-veg';
const MEAT = '/lib/material/_test/branch-meat';
const STEW = '/lib/material/_test/branch-stew';
const GIN = '/lib/material/_test/branch-gin';
const VERMOUTH = '/lib/material/_test/branch-vermouth';
const MARTINI_MAT = '/lib/material/_test/branch-martini';
const KNIFE_T = '/obj/_test/branch-knife';
const DISH_T = '/obj/_test/branch-dish';
const GLASS_T = '/obj/_test/branch-glass';
const SMITH = '/obj/_test/branch-smith';

let store: Record<string, Record<string, unknown>[]>;
let room: TestRoom;
let smith: TestSmith;

function registerMaterial(
  path: string,
  name: string,
  tags: string[],
  edible = false,
): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    if (edible) m.setEdibility(true);
    return m;
  }, path) as unknown as Material;
}

function makeIngot(massKg = 0.5): Ingot {
  const i = makeStuff(() => new Ingot());
  i.setMass(Quantity.of(massKg, 'kg'));
  i.setMaterial(
    StuffApi.findByTemplatePath<Material>(IRON) as unknown as Material,
  );
  return i;
}

function makeForge(lit: boolean, burnK = 1300): Forge {
  return makeStuff(() => {
    const f = new Forge();
    f.setBurnTemperatureK(burnK);
    f.setReserve(
      new Reserve(
        'fuel',
        Quantity.of(100, '%'),
        Quantity.of(100, '%'),
        'combustion',
        null,
      ),
    );
    f._setLit(lit);
    return f;
  });
}

function makeBottle(materialPath: string, band: string, amountL: number) {
  const b = makeStuff(() => new GradedReceptacle());
  (b as unknown as { interiorBulk: boolean }).interiorBulk = true;
  (b as unknown as { interiorMaterial: string }).interiorMaterial = materialPath;
  b.setInteriorCapacity(Quantity.of(1, 'L'));
  b.setInteriorAmount(Quantity.of(amountL, 'L'));
  b.setGradeBand(band);
  return b;
}

async function craftAs(
  principal: Stuff | null,
  req: CraftRequest,
): Promise<Awaited<ReturnType<typeof CraftingApi.craft>>> {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    if (principal) ExecutionContextApi.tagActingAuthor(principal);
    return CraftingApi.craft(req);
  }) as unknown as Awaited<ReturnType<typeof CraftingApi.craft>>;
}

beforeEach(async () => {
  store = { recipes: [] };
  StuffApi.clearAll();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) =>
      (store[col] ?? []).filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never,
  );
  WorldClockApi._setNowProviderForTesting(() => 1000);

  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    if (path === KNIFE_T) {
      return makeStuff(() => new TestKnife()) as never;
    }
    if (path === DISH_T || path === GLASS_T) {
      const g = makeStuff(() => new CraftedDrink());
      (g as unknown as { interiorBulk: boolean }).interiorBulk = true;
      g.setInteriorCapacity(Quantity.of(1, 'L'));
      return g as never;
    }
    throw new Error(`unexpected clone ${path}`);
  });

  registerMaterial(IRON, 'iron', ['metal', 'ferrous']);
  registerMaterial(VEG, 'root vegetable', ['vegetable'], true);
  registerMaterial(MEAT, 'stew meat', ['meat'], true);
  registerMaterial(STEW, 'hearty stew', ['food'], true);
  registerMaterial(GIN, 'house gin', ['gin']);
  registerMaterial(VERMOUTH, 'dry vermouth', ['vermouth']);
  registerMaterial(MARTINI_MAT, 'martini', ['cocktail']);

  store.recipes!.push(
    {
      recipeId: 'belt-knife',
      name: 'Belt Knife',
      keywords: ['knife'],
      inputSlots: [
        { slot: 'stock', category: 'ferrous', minGrade: 'fair', kind: 'item', count: 1 },
      ],
      toolCapabilities: ['striking'],
      outputTemplate: KNIFE_T,
      outputMaterial: '',
      baseGradeBand: '',
      requiresHeatK: 1300,
      outputApplication: 'tangible',
    },
    {
      recipeId: 'hearty-stew',
      name: 'Hearty Stew',
      keywords: ['stew'],
      inputSlots: [
        { slot: 'veg', category: 'vegetable', minGrade: 'fair', kind: 'item', count: 2 },
        { slot: 'meat', category: 'meat', minGrade: 'fair', kind: 'item', count: 1 },
      ],
      toolCapabilities: [],
      outputTemplate: DISH_T,
      outputMaterial: STEW,
      baseGradeBand: '',
      outputApplication: 'edible',
      outputPortionL: 0.4,
    },
    {
      recipeId: 'martini',
      name: 'Gin Martini',
      keywords: ['martini'],
      inputSlots: [
        { slot: 'base', category: 'gin', minGrade: 'fair', measureL: 0.06 },
        { slot: 'mod', category: 'vermouth', minGrade: 'fair', measureL: 0.01 },
      ],
      toolCapabilities: ['mixing-glass'],
      outputTemplate: GLASS_T,
      outputMaterial: MARTINI_MAT,
      baseGradeBand: '',
    },
  );
  const catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/obj/RecipeCatalogue',
  );
  await catalogue.warm();

  room = makeStuff(() => new TestRoom());
  smith = makeStuffAtPath(() => new TestSmith(), SMITH);
  ContainmentApi.move(smith, room);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('the tangible (smithing) branch', () => {
  it('flows the ingot material + mass onto the knife, consumes the ingot', async () => {
    const forge = makeForge(true);
    ContainmentApi.move(forge, room);
    const ingot = makeIngot(0.5);
    ContainmentApi.move(ingot, room);
    const hammer = makeStuff(() => new ToolItem());
    hammer.setCapabilities(['striking']);
    // The hammer is iron too — a tool must never be consumed as matter.
    hammer.setMaterial(
      StuffApi.findByTemplatePath<Material>(IRON) as unknown as Material,
    );
    ContainmentApi.move(hammer, room);

    const outcome = await craftAs(smith, {
      recipeRef: 'belt-knife',
      makerMode: 'self',
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    // Material flowed from the chosen ingot; mass conserved.
    expect(MixinApi.isTangible(outcome.output)).toBe(true);
    if (!MixinApi.isTangible(outcome.output)) return;
    expect(outcome.output.getMaterial()?.getName()).toBe('iron');
    expect(outcome.output.getMass().rawValue()).toBeCloseTo(0.5, 9);
    // Ungraded stock derives at fair (the F8 fallback).
    expect(outcome.grade.getBand()).toBe('fair');
    expect(outcome.recipeId).toBe('belt-knife');
    // The ingot is gone; the (iron) hammer survives.
    expect(ingot.isDestroyed()).toBe(true);
    expect(hammer.isDestroyed()).toBe(false);
  });

  it('declines insufficient-heat at a cold forge, resolves at a hot one', async () => {
    const forge = makeForge(false);
    ContainmentApi.move(forge, room);
    ContainmentApi.move(makeIngot(), room);
    const hammer = makeStuff(() => new ToolItem());
    hammer.setCapabilities(['striking']);
    ContainmentApi.move(hammer, room);

    const cold = await craftAs(smith, {
      recipeRef: 'belt-knife',
      makerMode: 'self',
    });
    expect(cold).toMatchObject({
      ok: false,
      reason: 'insufficient-heat',
      detail: '1300',
    });

    // A lit forge arrives (the cold one stays cold — `_setLit` is gated).
    ContainmentApi.move(makeForge(true), room);
    const hot = await craftAs(smith, {
      recipeRef: 'belt-knife',
      makerMode: 'self',
    });
    expect(hot.ok).toBe(true);
  });
});

describe('broken tools', () => {
  it("a broken hammer fails the tool match (missing-tool)", async () => {
    ContainmentApi.move(makeForge(true), room);
    ContainmentApi.move(makeIngot(), room);
    const hammer = makeStuff(() => new ToolItem());
    hammer.setCapabilities(['striking']);
    hammer.setCondition(0.05); // broken — offers nothing until repaired
    ContainmentApi.move(hammer, room);

    const outcome = await craftAs(smith, {
      recipeRef: 'belt-knife',
      makerMode: 'self',
    });
    expect(outcome).toMatchObject({
      ok: false,
      reason: 'missing-tool',
      detail: 'striking',
    });
  });
});

describe('the edible (cooking) branch', () => {
  function stockKitchen(): { veg: TestProduce; meat: Thing } {
    const veg = makeStuff(() => new TestProduce());
    veg.setQuantity(5);
    veg.setMass(Quantity.of(0.2, 'kg'));
    veg.setMaterial(
      StuffApi.findByTemplatePath<Material>(VEG) as unknown as Material,
    );
    ContainmentApi.move(veg, room);
    const meat = makeStuff(() => new Thing());
    meat.setMass(Quantity.of(0.3, 'kg'));
    meat.setMaterial(
      StuffApi.findByTemplatePath<Material>(MEAT) as unknown as Material,
    );
    ContainmentApi.move(meat, room);
    return { veg, meat };
  }

  it('fills the dish with the authored food material at the portion', async () => {
    const { veg, meat } = stockKitchen();
    const outcome = await craftAs(smith, {
      recipeRef: 'hearty-stew',
      makerMode: 'self',
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const outSlot = BulkableApi.slotFor(outcome.output, undefined)!;
    expect(outSlot.getMaterialPath()).toBe(STEW);
    expect(outSlot.getAmount().rawValue()).toBeCloseTo(0.4, 9);
    // Conservation: the glob debited exactly 2 units; the meat consumed whole.
    expect(veg.getQuantity()).toBe(3);
    expect(meat.isDestroyed()).toBe(true);
  });

  it('throws (conservation breach) when a matched glob shrinks before consume', async () => {
    const { veg } = stockKitchen();
    // Rig: the stack shrinks between slot-match and consume (the clone is
    // the intervening await) — the strict debit must throw, not short-draw.
    vi.mocked(StuffApi.clone).mockImplementation(async () => {
      veg.setQuantity(1);
      const g = makeStuff(() => new CraftedDrink());
      (g as unknown as { interiorBulk: boolean }).interiorBulk = true;
      g.setInteriorCapacity(Quantity.of(1, 'L'));
      return g as never;
    });
    await expect(
      craftAs(smith, { recipeRef: 'hearty-stew', makerMode: 'self' }),
    ).rejects.toThrow(/conservation breach/);
  });
});

describe('the gather walk rungs', () => {
  it('draws from an open chest, declines when the same chest is closed', async () => {
    const forge = makeForge(true);
    ContainmentApi.move(forge, room);
    const hammer = makeStuff(() => new ToolItem());
    hammer.setCapabilities(['striking']);
    ContainmentApi.move(hammer, room);
    const chest = makeStuff(() => new TestChest());
    ContainmentApi.move(chest, room);
    ContainmentApi.move(makeIngot(), chest);

    chest.setOpen(false);
    const closed = await craftAs(smith, {
      recipeRef: 'belt-knife',
      makerMode: 'self',
    });
    expect(closed).toMatchObject({
      ok: false,
      reason: 'insufficient-input',
      detail: 'ferrous',
    });

    chest.setOpen(true);
    const open = await craftAs(smith, {
      recipeRef: 'belt-knife',
      makerMode: 'self',
    });
    expect(open.ok).toBe(true);
  });

  it('gathers a bottle from the maker inventory (the bar walk, widened)', async () => {
    // Gin carried by the maker; vermouth + mixing glass in the room.
    ContainmentApi.move(makeBottle(GIN, 'fine', 0.7), smith);
    ContainmentApi.move(makeBottle(VERMOUTH, 'fair', 0.7), room);
    const mixer = makeStuff(() => new ToolItem());
    mixer.setCapabilities(['mixing-glass']);
    ContainmentApi.move(mixer, room);

    const outcome = await craftAs(smith, {
      recipeRef: 'martini',
      makerMode: 'self',
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.grade.getBand()).toBe('fair'); // min(fine, fair)
  });
});
