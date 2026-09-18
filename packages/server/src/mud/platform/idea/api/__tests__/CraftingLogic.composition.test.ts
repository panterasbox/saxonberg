/**
 * Composition flows THROUGH a blend (docs/subsystems/crafting.md § composition/D11/D26).
 *
 * ⚠⚠ **Five links carry an extraction from a millstone to a plate, and
 * every one of them fails closed and silent.** A composition dropped at
 * any link produces a white loaf from wholemeal flour with no error
 * anywhere. Two of those links are here:
 *
 *   3. `derivePayload` expands a consumed input's PARTS rather than
 *      collapsing it to its own blend identity;
 *   5. a tangible mint writes the merged parts onto the output.
 *
 * ⭐ And the pin that matters as much as either: **a blend built from
 * parts-less inputs still yields one part per material.** Every cocktail
 * shipped before this build must read exactly as it did.
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
import Receptacle from '../../../thing/Receptacle';
import RecipeCatalogue from '../../RecipeCatalogue';
import { BulkableApi } from '../../../../api/bulk';
import { MixinApi } from '../../../../api/mixin';
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
  static _mixinName = 'TestRoomComposition';
}
class TestCook extends MakerMixin(
  NamedMixin(ThermalMixin(ContainableMixin(Idea))),
) {
  static _mixinName = 'TestCookComposition';
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

const FLOUR = '/stuff/idea/material/food/comp-flour';
const BRAN = '/stuff/idea/material/food/comp-bran';
const WATER = '/stuff/idea/material/comp-water';
const DOUGH = '/stuff/idea/material/food/comp-dough';
const BREAD = '/stuff/idea/material/food/comp-bread';
const TROUGH = '/test/comp-trough';
const LOAF = '/test/comp-loaf';

let store: Record<string, Record<string, unknown>[]>;
let room: TestRoom;
let cook: TestCook;

function material(
  path: string,
  name: string,
  tags: string[],
  amounts: Record<string, number> = {},
): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setEdibility(true);
    m.setNutrientAmounts(amounts);
    m.setDensity(Quantity.of(600, 'kg/m³'));
    return m;
  }, path);
}

async function craftAs(principal: Stuff, req: CraftRequest): Promise<Stuff> {
  const outcome = await (ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(principal);
    return CraftingApi.craft(req);
  }) as ReturnType<typeof CraftingApi.craft>);
  if (!outcome.ok) throw new Error(`craft declined: ${JSON.stringify(outcome)}`);
  const output = (outcome as unknown as { output: Stuff | null }).output;
  if (output === null) throw new Error('craft produced no output');
  return output;
}

/** A holder of `material`, optionally already knowing what it is made of. */
function holder(
  materialPath: string,
  litres: number,
  composition?: { materialPath: string; servings: number }[],
): Receptacle {
  const r = makeStuff(() => new Receptacle());
  (r as unknown as { interiorBulk: boolean }).interiorBulk = true;
  r.setInteriorCapacity(Quantity.of(litres + 1, 'L'));
  const slot = BulkableApi.slotFor(r, undefined)!;
  slot.setMaterial(
    StuffApi.findByTemplatePath<Material>(materialPath)! as unknown as Material,
  );
  slot.setAmount(Quantity.of(litres, 'L'));
  if (composition) slot.setPayload({ ...(slot.getPayload() ?? {}), composition });
  ContainmentApi.move(r, room);
  return r;
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
    if (path === TROUGH) {
      const t = makeStuff(() => new CraftVessel());
      (t as unknown as { interiorBulk: boolean }).interiorBulk = true;
      t.setInteriorCapacity(Quantity.of(20, 'L'));
      return t as never;
    }
    if (path === LOAF) {
      const l = makeStuff(() => new Provision());
      l.setMass(Quantity.of(0.1, 'kg'));
      return l as never;
    }
    throw new Error(`unexpected clone ${path}`);
  });

  material(FLOUR, 'flour', ['flour', 'food'], { carb: 1000, protein: 80 });
  material(BRAN, 'bran', ['bran', 'food'], { carb: 200, protein: 150, fibre: 430 });
  material(WATER, 'water', ['water'], {});
  material(DOUGH, 'dough', ['dough', 'food'], { carb: 500 });
  material(BREAD, 'bread', ['bread', 'food'], { carb: 100 });
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('blend');
    m.setTags(['blend']);
    m.setEdibility(true);
    return m;
  }, '/platform/idea/material/blend');

  store.recipes!.push(
    {
      recipeId: 'make-dough',
      name: 'Dough',
      keywords: ['make-dough'],
      inputSlots: [
        { slot: 'flour', category: 'flour', minGrade: 'fair', measureL: 2 },
        { slot: 'water', category: 'water', minGrade: 'fair', measureL: 1 },
      ],
      toolCapabilities: [],
      outputTemplate: TROUGH,
      outputMaterial: '',
      outputApplication: 'bulk',
      baseGradeBand: '',
    },
    {
      // ⭐ The bulk-only tangible (D11): no item input at all.
      recipeId: 'bake-loaf',
      name: 'Loaf',
      keywords: ['bake-loaf'],
      inputSlots: [
        { slot: 'dough', category: 'dough', minGrade: 'fair', measureL: 1 },
      ],
      toolCapabilities: [],
      outputTemplate: LOAF,
      outputMaterial: BREAD,
      outputApplication: 'tangible',
      requiresHeatK: 480,
      maxHeatK: 560,
      holdS: 1800,
      baseGradeBand: '',
    },
  );
  const catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/platform/idea/RecipeCatalogue',
  );
  await catalogue.warm();

  room = makeStuff(() => new TestRoom());
  cook = makeStuffAtPath(() => new TestCook(), '/test/cook-composition');
  ContainmentApi.move(cook, room);
  const pool = makeStuffAtPath(() => new CraftVessel(), TROUGH);
  (pool as unknown as { interiorBulk: boolean }).interiorBulk = true;
  pool.setInteriorCapacity(Quantity.of(20, 'L'));
  ContainmentApi.move(pool, room);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

function compositionOf(out: Stuff): Record<string, number> {
  const slot = BulkableApi.slotFor(out, undefined);
  const parts = slot?.getPayload()?.composition ?? [];
  const m: Record<string, number> = {};
  for (const p of parts) m[p.materialPath] = (m[p.materialPath] ?? 0) + p.servings;
  return m;
}

describe('⭐⭐ a consumed input contributes its PARTS, not its identity', () => {
  it('flour that knows it is 28% bran makes dough that knows it too', () => {
    // This is link 3. Without it the dough reads `[flour, water]` and the
    // bran vanishes at the trough, silently.
    return (async () => {
      holder(FLOUR, 3, [
        { materialPath: FLOUR, servings: 7.2 },
        { materialPath: BRAN, servings: 2.8 },
      ]);
      holder(WATER, 3);
      const dough = await craftAs(cook, {
        recipeRef: 'make-dough',
        makerMode: 'self',
      });
      const comp = compositionOf(dough);
      expect(comp[BRAN]).toBeGreaterThan(0);
      expect(comp[FLOUR]).toBeGreaterThan(0);
      expect(comp[WATER]).toBeGreaterThan(0);
      // The flour's serving is split in its own proportions.
      expect(comp[BRAN]! / (comp[FLOUR]! + comp[BRAN]!)).toBeCloseTo(0.28, 6);
    })();
  });

  it('a DARKER flour makes a darker dough — the proportion travels', async () => {
    holder(FLOUR, 3, [
      { materialPath: FLOUR, servings: 5 },
      { materialPath: BRAN, servings: 5 },
    ]);
    holder(WATER, 3);
    const dough = await craftAs(cook, {
      recipeRef: 'make-dough',
      makerMode: 'self',
    });
    const comp = compositionOf(dough);
    expect(comp[BRAN]! / (comp[FLOUR]! + comp[BRAN]!)).toBeCloseTo(0.5, 6);
  });

  it('⭐⭐⭐ THE PIN: a parts-less blend still yields one part per material', async () => {
    // Every cocktail, juice and stew shipped before this build. If this
    // ever fails, the flow-through has changed behaviour it had no
    // business touching.
    holder(FLOUR, 3);
    holder(WATER, 3);
    const dough = await craftAs(cook, {
      recipeRef: 'make-dough',
      makerMode: 'self',
    });
    const comp = compositionOf(dough);
    expect(Object.keys(comp).sort()).toEqual([FLOUR, WATER].sort());
    expect(comp[FLOUR]).toBe(1);
    expect(comp[WATER]).toBe(1);
  });
});

describe('⭐ a tangible can be made entirely of bulk (D11) and carries its parts (D26)', () => {
  it('a loaf baked from dough mints at all — this used to THROW', async () => {
    holder(DOUGH, 3);
    cook.setReachableHeat(500);
    const loaf = await craftAs(cook, { recipeRef: 'bake-loaf', makerMode: 'self' });
    if (!MixinApi.isTangible(loaf)) throw new Error('loaf is not Tangible');
    expect(loaf.getMaterial()!.getTemplatePath()).toBe(BREAD);
    // Mass conserved off the bulk: 1 L at 600 kg/m3 = 0.6 kg.
    expect(loaf.getMass().rawValue()).toBeCloseTo(0.6, 6);
  });

  it('⭐⭐ and the loaf knows what it was made of — the fifth link', async () => {
    holder(DOUGH, 3, [
      { materialPath: FLOUR, servings: 7.2 },
      { materialPath: BRAN, servings: 2.8 },
    ]);
    cook.setReachableHeat(500);
    const loaf = await craftAs(cook, { recipeRef: 'bake-loaf', makerMode: 'self' });
    if (!MixinApi.isComposed(loaf)) throw new Error('loaf is not Composed');
    const parts = loaf.getComposition();
    const byPath: Record<string, number> = {};
    for (const p of parts) byPath[p.materialPath] = p.servings;
    expect(byPath[BRAN]).toBeGreaterThan(0);
    expect(byPath[FLOUR]).toBeGreaterThan(0);
    expect(byPath[BRAN]! / (byPath[FLOUR]! + byPath[BRAN]!)).toBeCloseTo(0.28, 6);
  });

  it('a loaf from parts-less dough is made of the dough, not of nothing', async () => {
    holder(DOUGH, 3);
    cook.setReachableHeat(500);
    const loaf = await craftAs(cook, { recipeRef: 'bake-loaf', makerMode: 'self' });
    if (!MixinApi.isComposed(loaf)) throw new Error('loaf is not Composed');
    const parts = loaf.getComposition();
    expect(parts).toHaveLength(1);
    expect(parts[0]!.materialPath).toBe(DOUGH);
  });
});
