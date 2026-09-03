/**
 * ⭐ The cooking MEDIUM — and the reason there is no method table anywhere.
 *
 * A recipe declares what carries its heat (`medium: water | fat`, absent =
 * dry) and how hot it needs to be. Two consequences, both physics:
 *
 *   1. it must actually HAVE an input carrying the medium's tag — you
 *      cannot boil without water;
 *   2. the effective heat is `min(fire, the medium's phase ceiling)` —
 *      water's boiling point, a fat's smoke point.
 *
 * So "boiling cannot brown" is not a rule anybody wrote: a wet recipe
 * demanding 450 K declines for want of heat at an 800 K hearth because the
 * water stops at 373, and the same demand in tallow (smoking at 478) is
 * simply cooked.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CraftingApi } from '../../../../api/crafting';
import type { CraftRequest } from '../../../../api/crafting';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { WorldClockApi } from '../../../../api/worldclock';
import { BulkableApi } from '../../../../api/bulk';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Quantity } from '../../../../lib/quantity';
import Material from '../../../../lib/material/Material';
import Thing from '../../../../lib/stuff/Thing';
import { Recipe } from '../../../../lib/craft/Recipe';
import Oven from '../../../thing/Oven';
import CraftVessel from '../../../thing/CraftVessel';
import GradedReceptacle from '../../../thing/GradedReceptacle';
import RecipeCatalogue from '../../RecipeCatalogue';
import { Reserve } from '../../../../lib/reserve';
import { Idea } from '../../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ThermalMixin } from '../../../../lib/thermal/Thermal';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../lib/description/Named';
import { Stuff } from '../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoomMedium';
}
class TestCook extends ThermalMixin(
  ContainerMixin(NamedMixin(ContainableMixin(Idea))),
) {
  static _mixinName = 'TestCookMedium';
}

const WATER = '/stuff/idea/material/_test/medium-water';
const TALLOW = '/stuff/idea/material/_test/medium-tallow';
const MEAT = '/stuff/idea/material/_test/medium-meat';
const DISH_T = '/obj/_test/medium-dish';

let store: Record<string, Record<string, unknown>[]>;
let room: TestRoom;
let cook: TestCook;

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

/** A hearth at `burnK` — the fire half of the effective-heat pair. */
function makeHearth(burnK: number): Oven {
  return makeStuff(() => {
    const o = new Oven();
    o.setBurnTemperatureK(burnK);
    o.setReserve(
      new Reserve(
        'fuel',
        Quantity.of(100, '%'),
        Quantity.of(100, '%'),
        'combustion',
        null,
      ),
    );
    o._setLit(true);
    return o;
  });
}

function makeBottle(materialPath: string, amountL: number): GradedReceptacle {
  const b = makeStuff(() => new GradedReceptacle());
  (b as unknown as { interiorBulk: boolean }).interiorBulk = true;
  (b as unknown as { interiorMaterial: string }).interiorMaterial = materialPath;
  b.setInteriorCapacity(Quantity.of(2, 'L'));
  b.setInteriorAmount(Quantity.of(amountL, 'L'));
  b.setGradeBand('fair');
  return b;
}

function makeMeat(): Thing {
  const t = makeStuff(() => new Thing());
  t.setMass(Quantity.of(0.4, 'kg'));
  t.setMaterial(
    StuffApi.findByTemplatePath<Material>(MEAT) as unknown as Material,
  );
  return t;
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

/** A wet/fat/dry recipe over one meat item, at the demanded heat. */
function recipeRow(
  id: string,
  medium: '' | 'water' | 'fat',
  requiresHeatK: number,
): Record<string, unknown> {
  const slots: Record<string, unknown>[] = [
    { slot: 'meat', category: 'meat', minGrade: 'fair', kind: 'item', count: 1 },
  ];
  if (medium === 'water') {
    slots.unshift({
      slot: 'water',
      category: 'water',
      minGrade: 'fair',
      kind: 'bulk',
      measureL: 0.5,
    });
  } else if (medium === 'fat') {
    slots.unshift({
      slot: 'fat',
      category: 'fat',
      minGrade: 'fair',
      kind: 'bulk',
      measureL: 0.1,
    });
  }
  return {
    recipeId: id,
    name: id,
    keywords: [id],
    inputSlots: slots,
    toolCapabilities: [],
    outputTemplate: DISH_T,
    outputMaterial: '',
    outputAppearance: `a portion of ${id}`,
    baseGradeBand: '',
    requiresHeatK,
    ...(medium ? { medium } : {}),
    outputApplication: 'edible',
    outputPortionL: 0.4,
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
    if (path === DISH_T) {
      const d = makeStuff(() => new CraftVessel());
      (d as unknown as { interiorBulk: boolean }).interiorBulk = true;
      d.setInteriorCapacity(Quantity.of(1, 'L'));
      return d as never;
    }
    throw new Error(`unexpected clone ${path}`);
  });

  // ⭐ The two media, with their REAL ceilings — water boils at 373,
  // beef tallow smokes at 478. Everything below follows from these.
  const water = registerMaterial(WATER, 'water', ['liquid', 'water'], true);
  water.setBoilingPoint(Quantity.of(373, 'K'));
  const tallow = registerMaterial(TALLOW, 'tallow', ['liquid', 'fat'], true);
  tallow.setSmokePoint(Quantity.of(478, 'K'));
  registerMaterial(MEAT, 'stew meat', ['meat'], true);
  // The generic cooked base every derived edible blend points at.
  registerMaterial('/platform/idea/material/cooked', 'cooked fare', ['food'], true);

  store.recipes!.push(
    recipeRow('wet-simmer', 'water', 373),
    recipeRow('wet-browned', 'water', 450), // impossible: water stops at 373
    recipeRow('fried-cutlet', 'fat', 440), // fine in tallow
    recipeRow('scorched-cutlet', 'fat', 500), // past tallow's smoke point
    recipeRow('dry-roast', '', 450), // no medium, no cap
  );
  const catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/platform/idea/RecipeCatalogue',
  );
  await catalogue.warm();

  room = makeStuff(() => new TestRoom());
  cook = makeStuffAtPath(() => new TestCook(), '/obj/_test/medium-cook');
  ContainmentApi.move(cook, room);
  ContainmentApi.move(makeHearth(800), room); // a roaring hearth
  ContainmentApi.move(makeMeat(), room);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('the medium caps the effective heat (AC7)', () => {
  it('⭐ water cannot brown: a 450 K wet recipe declines at an 800 K hearth', async () => {
    ContainmentApi.move(makeBottle(WATER, 2), room);
    const outcome = await craftAs(cook, {
      recipeRef: 'wet-browned',
      makerMode: 'self',
    });
    expect(outcome).toMatchObject({
      ok: false,
      reason: 'insufficient-heat',
      detail: '450',
    });
  });

  it('…and the same hearth simmers a 373 K wet recipe without complaint', async () => {
    ContainmentApi.move(makeBottle(WATER, 2), room);
    const outcome = await craftAs(cook, {
      recipeRef: 'wet-simmer',
      makerMode: 'self',
    });
    expect(outcome.ok).toBe(true);
  });

  it('a DRY recipe at the same 450 K is simply cooked — no medium, no cap', async () => {
    const outcome = await craftAs(cook, {
      recipeRef: 'dry-roast',
      makerMode: 'self',
    });
    expect(outcome.ok).toBe(true);
  });
});

describe('a fat carries heat past water (AC8)', () => {
  it('⭐ 440 K in tallow succeeds — the same demand water declined', async () => {
    ContainmentApi.move(makeBottle(TALLOW, 1), room);
    const outcome = await craftAs(cook, {
      recipeRef: 'fried-cutlet',
      makerMode: 'self',
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const slot = BulkableApi.slotFor(outcome.output, undefined)!;
    expect(slot.getAmount().rawValue()).toBeCloseTo(0.4, 6);
  });

  it('…but the smoke point is a real ceiling: 500 K declines even in tallow', async () => {
    ContainmentApi.move(makeBottle(TALLOW, 1), room);
    const outcome = await craftAs(cook, {
      recipeRef: 'scorched-cutlet',
      makerMode: 'self',
    });
    expect(outcome).toMatchObject({
      ok: false,
      reason: 'insufficient-heat',
    });
  });
});

describe('the medium must actually be there', () => {
  it('no water in reach declines diegetically — as a missing input, not a new word', async () => {
    const outcome = await craftAs(cook, {
      recipeRef: 'wet-simmer',
      makerMode: 'self',
    });
    expect(outcome).toMatchObject({
      ok: false,
      reason: 'insufficient-input',
      detail: 'water',
    });
  });

  it('tallow does not stand in for water — the tag is the medium', async () => {
    ContainmentApi.move(makeBottle(TALLOW, 1), room);
    const outcome = await craftAs(cook, {
      recipeRef: 'wet-simmer',
      makerMode: 'self',
    });
    expect(outcome).toMatchObject({ ok: false, reason: 'insufficient-input' });
  });
});

describe('the by-hand build clamps the same way', () => {
  const waterIn = {
    category: 'water',
    materialPath: WATER,
    measureL: 0.5,
    gradeBand: 'fair',
    kind: 'bulk' as const,
    tags: ['liquid', 'water'],
  };
  const meatIn = {
    category: 'meat',
    materialPath: MEAT,
    measureL: 0,
    gradeBand: 'fair',
    kind: 'item' as const,
    count: 1,
    tags: ['meat'],
  };

  function pot(): CraftVessel {
    const v = makeStuff(() => new CraftVessel());
    (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
    v.setInteriorCapacity(Quantity.of(2, 'L'));
    return v;
  }

  it('⭐ a build worked at 800 K over WATER still resolves as the 373 K recipe', async () => {
    // Both wet recipes are covered by this buffer, and "the most
    // heat-demanding satisfied recipe wins" — so without the clamp the
    // browned one would win off the latched heat alone. The water is what
    // says otherwise.
    const outcome = (await ExecutionContextApi.runRoot(null, 'test', () => {
      ExecutionContextApi.tagActingAuthor(cook);
      return CraftingApi.mintFromBuild({
        vessel: pot(),
        contributions: [waterIn, meatIn],
        heatedToK: 800,
      });
    })) as Awaited<ReturnType<typeof CraftingApi.mintFromBuild>>;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.recipeId).toBe('wet-simmer');
  });

  it('⭐ the SAME meat with no water banked comes out a dry roast instead', async () => {
    const outcome = (await ExecutionContextApi.runRoot(null, 'test', () => {
      ExecutionContextApi.tagActingAuthor(cook);
      return CraftingApi.mintFromBuild({
        vessel: pot(),
        contributions: [meatIn],
        heatedToK: 800,
      });
    })) as Awaited<ReturnType<typeof CraftingApi.mintFromBuild>>;
    // Nothing declined and nothing was flagged: the wet recipes simply
    // could not be what happened, and the 450 K dry one could. The medium
    // is an input, so leaving it out changes the DISH.
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.recipeId).toBe('dry-roast');
  });
});

describe('Recipe.fromData validates the medium word', () => {
  const base = {
    recipeId: 'bad',
    inputSlots: [{ slot: 's', category: 'c', minGrade: 'fair' }],
    outputTemplate: '/obj/x',
  };

  it('throws at READ on an unknown medium — never a silently uncapped fire', () => {
    expect(() => Recipe.fromData({ ...base, medium: 'steam' })).toThrow(
      /medium/,
    );
    expect(() => Recipe.fromData({ ...base, medium: 42 })).toThrow(/medium/);
  });

  it('accepts the two real media, and absence', () => {
    expect(Recipe.fromData({ ...base, medium: 'water' }).getMedium()).toBe(
      'water',
    );
    expect(Recipe.fromData({ ...base, medium: 'fat' }).getMedium()).toBe('fat');
    expect(Recipe.fromData(base).getMedium()).toBeNull();
    expect(Recipe.fromData({ ...base, medium: '' }).getMedium()).toBeNull();
  });
});
