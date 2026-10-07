/**
 * ⭐⭐ **A tangible dipped out of BULK, whose material is the bulk's.**
 *
 * One recipe dips a candle, and what the candle is made of is whatever fat
 * was in the pot — beeswax or tallow, one act, two materials, a taper that
 * reads of honey or of mutton accordingly.
 *
 * The rule the recipe doc already states for every other arm is
 * *`outputMaterial` empty ⇒ the output material comes from the matched
 * input.* The item arm has always honoured it (a steel bar makes a steel
 * knife); the **bulk** arm threw instead, so the only way to ship a candle
 * was to weld one material onto the recipe — and then to ship a second
 * recipe for the other feedstock, which is two recipes for one act.
 *
 * ⭐ The precedent is in the same file on the other mint path:
 * `fix/2026-10-03-ordered-maker` found `applyBulkOutput` not stamping a
 * maker that `mintVessel` already stamped — *"Two mint paths, and only one
 * of them stamped the liquid; this is the other one agreeing."* This is
 * two paths disagreeing about DERIVING a material, and this is the other
 * one agreeing.
 */

import '../../../../../test-bootstrap';
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
import Good from '../../../../lib/stuff/Good';
import CraftVessel from '../../../thing/CraftVessel';
import RecipeCatalogue from '../../RecipeCatalogue';
import { Idea } from '../../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../lib/description/Named';
import { EmployedMixin } from '../../../../lib/employment/Employed';
import { TangibleMixin } from '../../../../lib/material/Tangible';
import { CraftedMixin } from '../../../../lib/craft/Crafted';
import { Stuff } from '../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoomDipped';
}
class TestChandler extends EmployedMixin(
  NamedMixin(ContainableMixin(Idea)),
) {
  static _mixinName = 'TestChandlerDipped';
  isFulfilling(): boolean {
    return true;
  }
}
/** The candle's shape: a tangible, crafted, discrete thing. */
class TestCandle extends CraftedMixin(TangibleMixin(ContainableMixin(Good))) {
  static _mixinName = 'TestCandleDipped';
}

const WAX_MAT = '/stuff/idea/material/organic/beeswax';
const TALLOW_MAT = '/stuff/idea/material/food/tallow';
const CANDLE = '/trade/chandlery/thing/candle';
const POT = '/trade/chandlery/thing/dip-pot';
const CHANDLER = '/test/chandler-dipped';

let store: Record<string, Record<string, unknown>[]>;
let room: TestRoom;
let chandler: TestChandler;
let minted: TestCandle[];

function registerMaterial(path: string, name: string, tags: string[]): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setDensity(Quantity.of(900, 'kg/m³'));
    return m;
  }, path);
}

/** A pot standing in the room with `litres` of `materialPath` in it. */
function potOf(materialPath: string, litres: number, path: string): CraftVessel {
  const pot = makeStuffAtPath(() => new CraftVessel(), path);
  (pot as unknown as { interiorBulk: boolean }).interiorBulk = true;
  pot.setInteriorCapacity(Quantity.of(2, 'L'));
  pot.setBulkMaterial(
    'interior',
    StuffApi.findByTemplatePath(materialPath) as unknown as Material,
  );
  pot.setInteriorAmount(Quantity.of(litres, 'L'));
  ContainmentApi.move(pot, room);
  return pot;
}

async function craftAs(principal: Stuff, req: CraftRequest) {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(principal);
    return CraftingApi.craft(req);
  }) as ReturnType<typeof CraftingApi.craft>;
}

beforeEach(async () => {
  store = { recipes: [] };
  minted = [];
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
      return (store[col] ?? []).filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never;
    },
  );
  WorldClockApi._setNowProviderForTesting(() => 1000);

  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    if (path !== CANDLE) throw new Error(`unexpected clone ${path}`);
    const c = makeStuff(() => new TestCandle());
    c.setMass(Quantity.of(0.12, 'kg'));
    minted.push(c);
    return c as never;
  });

  registerMaterial(WAX_MAT, 'beeswax', ['wax', 'candle-stock', 'once-living']);
  registerMaterial(TALLOW_MAT, 'tallow', [
    'liquid',
    'fat',
    'cooking-fat',
    'candle-stock',
    'rendered',
  ]);

  store.recipes!.push({
    recipeId: 'candle',
    name: 'Dip a candle',
    keywords: ['candle', 'dip', 'taper'],
    inputSlots: [
      {
        slot: 'stock',
        category: 'candle-stock',
        minGrade: 'poor',
        measureL: 0.12,
      },
    ],
    toolCapabilities: [],
    outputApplication: 'tangible',
    outputTemplate: CANDLE,
    // ⭐⭐ EMPTY, on purpose. The whole point of the recipe.
    outputMaterial: '',
    baseGradeBand: '',
  });
  const catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/platform/idea/RecipeCatalogue',
  );
  await catalogue.warm();

  room = makeStuff(() => new TestRoom());
  chandler = makeStuffAtPath(() => new TestChandler(), CHANDLER);
  ContainmentApi.move(chandler, room);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('one recipe, two feedstocks', () => {
  it('⭐ a pot of WAX dips a candle made of beeswax', async () => {
    potOf(WAX_MAT, 2, POT);

    const result = await craftAs(chandler, {
      recipeRef: 'candle',
      // ⭐ `make` is `'self'`: you are the one dipping it. The recipe is
      // ungated (no discipline, no difficulty), which is what lets a
      // player with no trade make a candle at all.
      makerMode: 'self',
    });

    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(minted).toHaveLength(1);
    expect(minted[0]!.getMaterial()?.getName()).toBe('beeswax');
  });

  it('⭐ the SAME recipe over a pot of tallow dips a tallow candle', async () => {
    potOf(TALLOW_MAT, 2, POT);

    const result = await craftAs(chandler, {
      recipeRef: 'candle',
      // ⭐ `make` is `'self'`: you are the one dipping it. The recipe is
      // ungated (no discipline, no difficulty), which is what lets a
      // player with no trade make a candle at all.
      makerMode: 'self',
    });

    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(minted[0]!.getMaterial()?.getName()).toBe('tallow');
  });

  it('the mass is the bulk it took, by that material\'s density', async () => {
    potOf(WAX_MAT, 2, POT);

    await craftAs(chandler, { recipeRef: 'candle', makerMode: 'self' });

    // 0.12 L at 900 kg/m³ = 0.108 kg. Conservation, over the other kind
    // of matter — exactly as the item arm does it.
    expect(minted[0]!.getMass().rawValue()).toBeCloseTo(0.108, 3);
  });

  it('debits the pot', async () => {
    const pot = potOf(WAX_MAT, 2, POT);

    await craftAs(chandler, { recipeRef: 'candle', makerMode: 'self' });

    expect(pot.getBulkAmount('interior').rawValue()).toBeCloseTo(1.88, 3);
  });

  it('⚠ an empty pot refuses, and it does not throw', async () => {
    potOf(WAX_MAT, 0, POT);

    const result = await craftAs(chandler, {
      recipeRef: 'candle',
      // ⭐ `make` is `'self'`: you are the one dipping it. The recipe is
      // ungated (no discipline, no difficulty), which is what lets a
      // player with no trade make a candle at all.
      makerMode: 'self',
    });

    // ⚠ And it refuses for the RIGHT reason. An earlier draft of this test
    // passed while every case declined `no-maker`, which is the shape of a
    // test that proves nothing.
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('insufficient-input');
    expect(minted).toHaveLength(0);
  });
});
