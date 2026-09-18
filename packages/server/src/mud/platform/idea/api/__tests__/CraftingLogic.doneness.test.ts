/**
 * Doneness and the hold (docs/subsystems/thermal.md § doneness).
 *
 * Two behaviour changes, both in the direction of "the physics decides":
 *
 * 1. ⭐⭐ **The kill is a rate, and the hold is never zero.**
 *    `resolveSpoilage` used to short-circuit TWICE — once below the
 *    flora's kill temperature, and again when a recipe authored no hold,
 *    which sent the load to a flat `0`. The second was the bad one: a
 *    recipe that simply did not mention a hold sterilised perfectly,
 *    which made a sear and a lazy warm-through identical. `killOver` is
 *    now always called, and IT holds the threshold (untouched below
 *    `killK`), so the only thing that changed is that workings above the
 *    kill are integrated against a real time.
 *
 * 2. ⭐ **A working stamps the doneness it earned.** Every dish comes out
 *    of its own working `done`; only physics after the mint takes it past.
 *    A fire fiercer than the recipe's ceiling still MINTS — it mints a
 *    scorched thing. Declining would protect the player from a mistake
 *    worth being able to make.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CraftingApi } from '../../../../api/crafting';
import type { CraftRequest } from '../../../../api/crafting';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { WorldClockApi } from '../../../../api/worldclock';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Quantity } from '../../../../lib/quantity';
import Material from '../../../../lib/material/Material';
import Provision from '../../../thing/Provision';
import CraftVessel from '../../../thing/CraftVessel';
import RecipeCatalogue from '../../RecipeCatalogue';
import { Recipe } from '../../../../lib/craft/Recipe';
import { Freshness } from '../../../../lib/material/Freshness';
import { ThermalDose } from '../../../../lib/thermal/ThermalDose';
import { BulkableApi } from '../../../../api/bulk';
import { Idea } from '../../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../lib/description/Named';
import { MakerMixin } from '../../../../lib/craft/Maker';
import { ThermalMixin } from '../../../../lib/thermal/Thermal';
import { Stuff } from '../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoomDoneness';
}
/** A cook standing in a room with a given reachable heat. */
class TestCook extends MakerMixin(
  NamedMixin(ThermalMixin(ContainableMixin(Idea))),
) {
  static _mixinName = 'TestCookDoneness';
  private _heatK = 0;
  setReachableHeat(k: number): void {
    this._heatK = k;
  }
  reachableHeatK(): number {
    return this._heatK;
  }
  getConferredMixinNames(): readonly string[] {
    return ['MakerMixin'];
  }
}

const MEAT_MAT = '/stuff/idea/material/food/doneness-meat';
const DISH_MAT = '/stuff/idea/material/food/doneness-dish';
const GLASS = '/test/doneness-bowl';
const COOK = '/test/cook-doneness';

let store: Record<string, Record<string, unknown>[]>;
let room: TestRoom;
let cook: TestCook;

function registerMaterial(path: string, name: string, tags: string[]): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setEdibility(true);
    // Perishable — a real spoilage activation energy, so the load moves.
    m.setSpoilActivationEnergy(Quantity.of(60000, 'J/mol'));
    m.setWaterActivity(0.97);
    return m;
  }, path);
}

async function craftAs(principal: Stuff, req: CraftRequest): Promise<Stuff> {
  const outcome = await (ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(principal);
    return CraftingApi.craft(req);
  }) as ReturnType<typeof CraftingApi.craft>);
  if (!outcome.ok) {
    throw new Error(`craft declined: ${JSON.stringify(outcome)}`);
  }
  const output = (outcome as unknown as { output: Stuff | null }).output;
  if (output === null) throw new Error('craft produced no output');
  return output;
}

/** A recipe doc; `holdS`/`maxHeatK` omitted unless named. */
function recipeDoc(
  recipeId: string,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  return {
    recipeId,
    name: recipeId,
    keywords: [recipeId],
    inputSlots: [
      { slot: 'meat', category: 'meat', minGrade: 'fair', kind: 'item', count: 1 },
    ],
    toolCapabilities: [],
    outputTemplate: GLASS,
    outputMaterial: DISH_MAT,
    outputApplication: 'edible',
    outputPortionL: 0.3,
    baseGradeBand: '',
    ...extra,
  };
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

  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    if (path !== GLASS) throw new Error(`unexpected clone ${path}`);
    const g = makeStuff(() => new CraftVessel());
    (g as unknown as { interiorBulk: boolean }).interiorBulk = true;
    g.setInteriorCapacity(Quantity.of(1, 'L'));
    return g as never;
  });

  registerMaterial(MEAT_MAT, 'meat', ['meat', 'food']);
  registerMaterial(DISH_MAT, 'dish', ['dish', 'food']);

  store.recipes!.push(
    // A lazy warm-through: over the kill (333) but barely, and stating no
    // hold. This is the recipe whose behaviour D3 changes.
    recipeDoc('lazy-warm', { requiresHeatK: 340 }),
    // A proper sear: far over the kill, no hold stated.
    recipeDoc('proper-sear', { requiresHeatK: 500 }),
    // Below the kill entirely — must be untouched by any of this.
    recipeDoc('cold-dress', { requiresHeatK: 320 }),
    // A working with a ceiling, for the scorch arm.
    recipeDoc('ceilinged-roast', { requiresHeatK: 430, maxHeatK: 470 }),
  );
  const catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/platform/idea/RecipeCatalogue',
  );
  await catalogue.warm();

  room = makeStuff(() => new TestRoom());
  cook = makeStuffAtPath(() => new TestCook(), COOK);
  ContainmentApi.move(cook, room);
  const bowl = makeStuffAtPath(() => new CraftVessel(), GLASS);
  (bowl as unknown as { interiorBulk: boolean }).interiorBulk = true;
  bowl.setInteriorCapacity(Quantity.of(1, 'L'));
  ContainmentApi.move(bowl, room);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

/** A spoiled cut standing in the room, load 0.5. */
function spoiledCut(): Provision {
  const cut = makeStuff(() => new Provision());
  cut.setMass(Quantity.of(0.4, 'kg'));
  cut.setMaterial(
    StuffApi.findByTemplatePath<Material>(MEAT_MAT)! as unknown as Material,
  );
  cut.setMicrobialLoad(0.5);
  ContainmentApi.move(cut, room);
  return cut;
}

function loadOf(output: Stuff): number {
  const slot = BulkableApi.slotFor(output, undefined)!;
  return new Freshness(slot).load();
}
function doseOf(output: Stuff): { doseS: number; scorchS: number } {
  const slot = BulkableApi.slotFor(output, undefined)!;
  const d = slot.getPayload()?.dose;
  return { doseS: d?.doseS ?? 0, scorchS: d?.scorchS ?? 0 };
}

describe('the hold is never zero — the kill as a rate', () => {
  it('⭐ a LAZY WARM-THROUGH no longer sterilises: it leaves a residual load', async () => {
    // 340 K for the default hold. Before this build the unauthored hold
    // sent the load to a flat 0; it now integrates, and 340 K is only a
    // little over the kill, so a little survives.
    spoiledCut();
    cook.setReachableHeat(340);
    const out = await craftAs(cook, { recipeRef: 'lazy-warm', makerMode: 'self' });
    const load = loadOf(out);
    expect(load).toBeGreaterThan(0);
    // The hand-computed expectation, so a drift in the kill dials is loud.
    const expected = Freshness.killOver(0.5, ThermalDose.defaultHoldS(), 340);
    expect(load).toBeCloseTo(expected, 8);
  });

  it('a PROPER SEAR still leaves nothing — the change is confined to the lazy band', async () => {
    spoiledCut();
    cook.setReachableHeat(500);
    const out = await craftAs(cook, { recipeRef: 'proper-sear', makerMode: 'self' });
    expect(loadOf(out)).toBe(0);
  });

  it('a working BELOW the kill carries the load straight through, exactly as before', async () => {
    spoiledCut();
    cook.setReachableHeat(320);
    const out = await craftAs(cook, { recipeRef: 'cold-dress', makerMode: 'self' });
    // Untouched: `killOver` returns the load unchanged below `killK`, so
    // the threshold still exists — it just lives in one place now.
    expect(loadOf(out)).toBeCloseTo(0.5, 6);
  });

  it('⭐ the sear and the warm-through now DIFFER, which they did not before', async () => {
    spoiledCut();
    cook.setReachableHeat(340);
    const lazy = await craftAs(cook, { recipeRef: 'lazy-warm', makerMode: 'self' });
    // ⚠ Read it NOW: the second craft claims from the same room pool, and
    // a load read after it is a load read off the wrong bowl.
    const lazyLoad = loadOf(lazy);

    spoiledCut();
    cook.setReachableHeat(500);
    const sear = await craftAs(cook, { recipeRef: 'proper-sear', makerMode: 'self' });
    expect(lazyLoad).toBeGreaterThan(loadOf(sear));
  });
});

describe('the working stamps the doneness it earned', () => {
  it('a dish comes out of its own working DONE', async () => {
    spoiledCut();
    cook.setReachableHeat(500);
    const out = await craftAs(cook, { recipeRef: 'proper-sear', makerMode: 'self' });
    const { doseS, scorchS } = doseOf(out);
    const recipe = Recipe.fromData(
      store.recipes!.find((r) => r.recipeId === 'proper-sear')!,
    );
    expect(doseS).toBeCloseTo(
      ThermalDose.wantedDoseS(recipe.getRequiresHeatK(), recipe.getHoldS()),
      6,
    );
    expect(ThermalDose.bandFor(ThermalDose.donenessOf(doseS, recipe))).toBe(
      'done',
    );
    expect(scorchS).toBe(0);
  });

  it('⭐ a fire over the recipe ceiling still MINTS — and mints a scorched thing', async () => {
    spoiledCut();
    // The recipe's ceiling is 470; the fire is at 600.
    cook.setReachableHeat(600);
    const out = await craftAs(cook, {
      recipeRef: 'ceilinged-roast',
      makerMode: 'self',
    });
    // reaching here at all is the assertion: a craft over the ceiling
    // must MINT, not decline.
    const { scorchS } = doseOf(out);
    expect(ThermalDose.isScorched(scorchS)).toBe(true);
  });

  it('a fire within the ceiling scorches nothing', async () => {
    spoiledCut();
    cook.setReachableHeat(450);
    const out = await craftAs(cook, {
      recipeRef: 'ceilinged-roast',
      makerMode: 'self',
    });
    expect(doseOf(out).scorchS).toBe(0);
  });

  it('a working that asks for no heat stamps no dose', async () => {
    store.recipes!.push(recipeDoc('cold-mix', {}));
    const catalogue = StuffApi.findByTemplatePath<RecipeCatalogue>(
      '/platform/idea/RecipeCatalogue',
    )!;
    catalogue.invalidateCache();
    await catalogue.warm();
    spoiledCut();
    cook.setReachableHeat(0);
    const out = await craftAs(cook, { recipeRef: 'cold-mix', makerMode: 'self' });
    expect(doseOf(out).doseS).toBe(0);
  });
});
