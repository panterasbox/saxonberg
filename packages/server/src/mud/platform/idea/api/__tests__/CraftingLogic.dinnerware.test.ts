/**
 * ⭐ **Dinnerware is a POOL, not a mint** — the build's structural finding.
 *
 * A plated meal used to CLONE a plate into the world: bussing was real
 * work at the bar and free in the kitchen, for no reason but that `Dish`
 * and `CraftVessel` had been written a month apart. `Dish extends
 * CraftVessel` now, so a meal is claimed → filled → soiled → washed →
 * claimed again, exactly like a coupe.
 *
 * And because dinner must not be cancelled for want of crockery, the last
 * resort is the pot you cooked in — which works only because `CookPot` is
 * a member of the SAME pool. The bar's `no-glass` stays hard: no clean
 * coupe, no martini. That asymmetry is deliberate.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CraftingApi } from '../../../../api/crafting';
import type { CraftRequest } from '../../../../api/crafting';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { WorldClockApi } from '../../../../api/worldclock';
import { MixinApi } from '../../../../api/mixin';
import { BulkableApi } from '../../../../api/bulk';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Quantity } from '../../../../lib/quantity';
import Material from '../../../../lib/material/Material';
import Thing from '../../../../lib/stuff/Thing';
import Dish from '../../../thing/Dish';
import CraftVessel from '../../../thing/CraftVessel';
import ToolItem from '../../../thing/ToolItem';
import Oven from '../../../thing/Oven';
import PersistentHydrator from '../../persistence/PersistentHydrator';
import RecipeCatalogue from '../../RecipeCatalogue';
import { Reserve } from '../../../../lib/reserve';
import { Idea } from '../../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ThermalMixin } from '../../../../lib/thermal/Thermal';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../lib/description/Named';
import { ToolMixin } from '../../../../lib/craft/Tooled';
import { ManualBuildMixin } from '../../../../lib/craft/ManualBuild';
import { DurableMixin } from '../../../../lib/material/Durable';
import { Stuff } from '../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoomDinnerware';
}
class TestCook extends ThermalMixin(
  ContainerMixin(NamedMixin(ContainableMixin(Idea))),
) {
  static _mixinName = 'TestCookDinnerware';
}
/**
 * The shipped `CookPot` composition, restated: a kernel test never names a
 * pack's class, but the SHAPE is the thing under test — a pot that is a
 * `CraftVessel` and therefore a member of the dish pool.
 */
class TestPot extends ManualBuildMixin(ToolMixin(DurableMixin(CraftVessel))) {
  static _mixinName = 'TestPotDinnerware';
}

const MEAT = '/stuff/idea/material/_test/dinner-meat';
const COOKED = '/platform/idea/material/cooked';
const BOWL_T = '/stuff/thing/items/bowl';

let store: Record<string, Record<string, unknown>[]>;
let room: TestRoom;
let cook: TestCook;

function registerMaterial(path: string, name: string, tags: string[]): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setEdibility(true);
    return m;
  }, path) as unknown as Material;
}

function hearth(): Oven {
  return makeStuff(() => {
    const o = new Oven();
    o.setBurnTemperatureK(600);
    o.setReserve(
      new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null),
    );
    o._setLit(true);
    return o;
  });
}

function meat(): Thing {
  const t = makeStuff(() => new Thing());
  t.setMass(Quantity.of(0.3, 'kg'));
  t.setMaterial(StuffApi.findByTemplatePath<Material>(MEAT) as unknown as Material);
  ContainmentApi.move(t, room);
  return t;
}

/** A clean bowl at the shipped commons path (what the recipe's row names). */
function bowl(): Dish {
  const d = makeStuffAtPath(() => new Dish(), BOWL_T) as unknown as Dish;
  (d as unknown as { interiorBulk: boolean }).interiorBulk = true;
  d.setInteriorCapacity(Quantity.of(1, 'L'));
  ContainmentApi.move(d, room);
  return d;
}

/** A pot: the `pot` tool the recipe needs AND a pool vessel in its own right. */
function pot(): TestPot {
  const p = makeStuff(() => new TestPot());
  (p as unknown as { interiorBulk: boolean }).interiorBulk = true;
  p.setInteriorCapacity(Quantity.of(4, 'L'));
  p.setCategory('pot');
  p.setCapabilities(['pot']);
  ContainmentApi.move(p, room);
  return p;
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
    async (col: string, query: Record<string, unknown>) => {
      if (col === 'documents' && query.kind === 'recipe') {
        return (store['recipes'] ?? []).map((d) => ({
          path: `/generic-objects/recipes/${String(d.recipeId)}`,
          owner: '/generic-objects',
          kind: 'recipe',
          data: d,
        })) as never;
      }
      return (store[col] ?? []) as never;
    },
  );
  WorldClockApi._setNowProviderForTesting(() => 1000);

  // ⭐ The point of the whole wave: NOTHING clones on the edible path.
  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    throw new Error(`unexpected clone ${path}`);
  });

  registerMaterial(MEAT, 'stew meat', ['meat']);
  registerMaterial(COOKED, 'cooked fare', ['food']);

  store.recipes!.push({
    recipeId: 'pot-roast',
    name: 'Pot Roast',
    keywords: ['roast'],
    inputSlots: [
      { slot: 'meat', category: 'meat', minGrade: 'fair', kind: 'item', count: 1 },
    ],
    toolCapabilities: ['pot'],
    outputTemplate: BOWL_T,
    outputMaterial: '',
    outputAppearance: 'a deep bowl of pot roast',
    baseGradeBand: '',
    requiresHeatK: 400,
    outputApplication: 'edible',
    outputPortionL: 0.4,
  });
  const catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/platform/idea/RecipeCatalogue',
  );
  await catalogue.warm();

  room = makeStuff(() => new TestRoom());
  cook = makeStuffAtPath(() => new TestCook(), '/obj/_test/dinner-cook');
  ContainmentApi.move(cook, room);
  ContainmentApi.move(hearth(), room);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('the claim → soil → wash → reclaim loop (AC10)', () => {
  it('⭐ a meal CLAIMS the bowl in reach; nothing is cloned', async () => {
    pot();
    const b = bowl();
    meat();
    const outcome = await craftAs(cook, { recipeRef: 'pot-roast', makerMode: 'self' });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // The very same object — a claim, not a mint.
    expect(outcome.output).toBe(b);
    expect(BulkableApi.slotFor(b, undefined)!.getAmount().rawValue()).toBeCloseTo(
      0.4,
      6,
    );
  });

  it('the served bowl is SOILED, and a soiled bowl is never claimed again', async () => {
    pot();
    const b = bowl();
    meat();
    await craftAs(cook, { recipeRef: 'pot-roast', makerMode: 'self' });
    expect(b.isSoiled()).toBe(true);
    expect(b.isClaimable()).toBe(false);

    // A second order with the bowl still dirty falls back to the pot.
    meat();
    const second = await craftAs(cook, { recipeRef: 'pot-roast', makerMode: 'self' });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.output).not.toBe(b);
  });

  it('…and washing it puts it back in the pool', async () => {
    pot();
    const b = bowl();
    meat();
    await craftAs(cook, { recipeRef: 'pot-roast', makerMode: 'self' });
    b.wash();
    expect(b.isSoiled()).toBe(false);
    expect(b.isClaimable()).toBe(true);

    meat();
    const second = await craftAs(cook, { recipeRef: 'pot-roast', makerMode: 'self' });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.output).toBe(b); // the SAME bowl, back round the loop
  });
});

describe('pot as last resort — dinner is never cancelled (AC10)', () => {
  it('⭐ no crockery at all: the meal lands in the pot it was cooked in', async () => {
    const p = pot();
    meat();
    const outcome = await craftAs(cook, { recipeRef: 'pot-roast', makerMode: 'self' });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.output).toBe(p);
    expect(BulkableApi.slotFor(p, undefined)!.getAmount().rawValue()).toBeCloseTo(
      0.4,
      6,
    );
    // ⚠ And the pot is SOILED by serving from it, or the fallback would
    // sit outside the wash loop and a pot would never need cleaning.
    expect(p.isSoiled()).toBe(true);
  });

  it('a clean bowl is preferred over the pot when both are there', async () => {
    const p = pot();
    const b = bowl();
    meat();
    const outcome = await craftAs(cook, { recipeRef: 'pot-roast', makerMode: 'self' });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.output).toBe(b);
    expect(p.isSoiled()).toBe(false);
  });
});

describe('the pot in the pool does not misbehave', () => {
  it('⚠ a pot is never claimed as a DRINK vessel — kind-matching stops it', async () => {
    // A recipe wanting a `coupe` finds no coupe; the pot is right there
    // and is not one. The bar's asymmetry: no clean glass, no drink.
    store.recipes!.push({
      recipeId: 'house-cordial',
      name: 'House Cordial',
      keywords: ['cordial'],
      inputSlots: [
        { slot: 'meat', category: 'meat', minGrade: 'fair', kind: 'item', count: 1 },
      ],
      toolCapabilities: [],
      outputTemplate: '/stuff/thing/vessel/coupe',
      outputMaterial: '',
      baseGradeBand: '',
    });
    const catalogue = StuffApi.findByTemplatePath<RecipeCatalogue>(
      '/platform/idea/RecipeCatalogue',
    )!;
    await catalogue.warm();
    pot();
    meat();
    const outcome = await craftAs(cook, {
      recipeRef: 'house-cordial',
      makerMode: 'self',
    });
    expect(outcome).toMatchObject({ ok: false, reason: 'no-glass' });
  });

  it("⚠ the pot's CONTENTS are not drawn as an ingredient for the next dish", async () => {
    // Dish-as-ingredient ("stock into soup") is out of scope for v1, and
    // this is the negative test that says it does not happen by accident
    // now that a pot full of dinner is a Crafted Bulkable in the pool.
    const p = pot();
    meat();
    await craftAs(cook, { recipeRef: 'pot-roast', makerMode: 'self' });
    const potSlot = BulkableApi.slotFor(p, undefined)!;
    expect(potSlot.getAmount().rawValue()).toBeCloseTo(0.4, 6);

    // A second order with only the full pot in the room: the meat slot
    // must find nothing, NOT reach into the pot's cooked blend.
    const second = await craftAs(cook, { recipeRef: 'pot-roast', makerMode: 'self' });
    expect(second).toMatchObject({ ok: false, reason: 'insufficient-input' });
    expect(potSlot.getAmount().rawValue()).toBeCloseTo(0.4, 6); // untouched
  });
});

describe('the hydrator arms cover Dish too (the logged-out-lockout lesson)', () => {
  it('⭐ a soiled dish round-trips through the Hydrator without a policy denial', async () => {
    const b = bowl();
    // What a snapshot of a used dish holds. `setSoiled` is gated to
    // CraftingLogic + the two Hydrator arms; a Dish that did NOT inherit
    // that gate — or a gate that named only glasses — would THROW here,
    // and in production it locked a player out of their character.
    const restored = makeStuff(() => new Dish());
    await expect(
      makeStuff(() => new PersistentHydrator()).hydrate(restored, {
        soiled: true,
        technique: 'stewed',
        interiorBulk: true,
      }),
    ).resolves.toBeUndefined();
    expect(restored.isSoiled()).toBe(true);
    expect(MixinApi.isBulkable(restored)).toBe(true);
    expect(b.isSoiled()).toBe(false);
  });
});
