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
import { Freshness } from '../../../../lib/material/Freshness';
import Thing from '../../../../lib/stuff/Thing';
import Provision from '../../../thing/Provision';
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
import { BlendLabel } from '../../../../lib/metabolism/BlendLabel';
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
const RAW_BEAN = '/stuff/idea/material/_test/medium-raw-bean';
const SPIRIT = '/stuff/idea/material/_test/medium-spirit';
const RANK_MEAT = '/stuff/idea/material/_test/medium-rank-meat';
const PLAIN_VEG = '/stuff/idea/material/_test/medium-plain-veg';
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

/** A dish over one bean-ish item and one spirit-ish item, at `requiresHeatK`. */
function beanRow(id: string, requiresHeatK: number): Record<string, unknown> {
  return {
    recipeId: id,
    name: id,
    keywords: [id],
    inputSlots: [
      { slot: 'beans', category: 'vegetable', minGrade: 'fair', kind: 'item', count: 1 },
    ],
    toolCapabilities: [],
    outputTemplate: DISH_T,
    outputMaterial: '',
    outputAppearance: `a portion of ${id}`,
    baseGradeBand: '',
    requiresHeatK,
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

  // ⚠ Nothing clones here any more: an edible output is CLAIMED from the
  // vessel pool. A clone attempt is now a bug, so the mock says so.
  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    throw new Error(`unexpected clone ${path}`);
  });

  // ⭐ The two media, with their REAL ceilings — water boils at 373,
  // beef tallow smokes at 478. Everything below follows from these.
  const water = registerMaterial(WATER, 'water', ['liquid', 'water'], true);
  water.setBoilingPoint(Quantity.of(373, 'K'));
  const tallow = registerMaterial(TALLOW, 'tallow', ['liquid', 'fat'], true);
  tallow.setSmokePoint(Quantity.of(478, 'K'));
  registerMaterial(MEAT, 'stew meat', ['meat'], true);
  // ⭐ The AC9 fixtures — a synthetic raw bean whose lectin is destroyed
  // by boiling, and a synthetic ferment whose alcohol is not. A kernel
  // test never names shipped content, so both are made up; what is real
  // is that ONE of them authors `labileAtK` and the other does not.
  const bean = registerMaterial(RAW_BEAN, 'raw bean', ['vegetable'], true);
  bean.setToxicity([{ type: 'lectin', amount: 400, labileAtK: 360 }]);
  const spirit = registerMaterial(SPIRIT, 'spirit', ['vegetable'], true);
  spirit.setToxicity([{ type: 'alcohol', amount: 30 }]);
  // Its own tag, so the rank-stew recipe cannot accidentally reach for
  // the sound meat standing in the same room.
  const rank = registerMaterial(RANK_MEAT, 'rank meat', ['rank'], true);
  rank.setToxicity([{ type: 'ptomaine', amount: 700 }]);
  registerMaterial(PLAIN_VEG, 'root vegetable', ['vegetable'], true);
  // The generic cooked base every derived edible blend points at.
  registerMaterial('/platform/idea/material/cooked', 'cooked fare', ['food'], true);

  store.recipes!.push(
    recipeRow('wet-simmer', 'water', 373),
    recipeRow('wet-browned', 'water', 450), // impossible: water stops at 373
    recipeRow('fried-cutlet', 'fat', 440), // fine in tallow
    recipeRow('scorched-cutlet', 'fat', 500), // past tallow's smoke point
    recipeRow('dry-roast', '', 450), // no medium, no cap
    // AC9: the same two-ingredient dish, cooked hot and cooked cold.
    beanRow('boiled-beans', 373),
    beanRow('warmed-beans', 300),
    { ...recipeRow('rank-stew', 'water', 373),
      inputSlots: [
        { slot: 'water', category: 'water', minGrade: 'fair', kind: 'bulk', measureL: 0.5 },
        { slot: 'meat', category: 'rank', minGrade: 'fair', kind: 'item', count: 1 },
      ] },
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
  ContainmentApi.move(cleanDish(), room); // the pool the meal is claimed from
});

/** A clean claimable dish at the recipes' output path. */
function cleanDish(): CraftVessel {
  const d = makeStuffAtPath(
    () => new CraftVessel(),
    DISH_T,
  ) as unknown as CraftVessel;
  (d as unknown as { interiorBulk: boolean }).interiorBulk = true;
  d.setInteriorCapacity(Quantity.of(1, 'L'));
  return d;
}

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

describe('the toxin kill is SELECTIVE (AC9)', () => {
  function item(materialPath: string): Thing {
    const t = makeStuff(() => new Thing());
    t.setMass(Quantity.of(0.3, 'kg'));
    t.setMaterial(
      StuffApi.findByTemplatePath<Material>(materialPath) as unknown as Material,
    );
    ContainmentApi.move(t, room);
    return t;
  }

  it('⭐ a heat-labile dose is destroyed once the working reaches its temperature', async () => {
    item(RAW_BEAN);
    const outcome = await craftAs(cook, {
      recipeRef: 'boiled-beans',
      makerMode: 'self',
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const payload = BulkableApi.slotFor(outcome.output, undefined)!.getPayload()!;
    expect(BlendLabel.toxicityOf(payload, null).find((t) => t.type === 'lectin')).toBeUndefined();
  });

  it('…and survives a working that never got there', async () => {
    item(RAW_BEAN);
    const outcome = await craftAs(cook, {
      recipeRef: 'warmed-beans',
      makerMode: 'self',
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const payload = BulkableApi.slotFor(outcome.output, undefined)!.getPayload()!;
    expect(BlendLabel.toxicityOf(payload, null).find((t) => t.type === 'lectin')?.amount).toBe(400);
  });

  it('⚠ alcohol authors no lability and rides into the pot honestly', async () => {
    item(SPIRIT);
    const outcome = await craftAs(cook, {
      recipeRef: 'boiled-beans',
      makerMode: 'self',
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const payload = BulkableApi.slotFor(outcome.output, undefined)!.getPayload()!;
    expect(BlendLabel.toxicityOf(payload, null).find((t) => t.type === 'alcohol')?.amount).toBe(30);
  });

  it('⚠⚠ cooking spoiled food does NOT un-poison it', async () => {
    // The ptomaine an input already grew authors no lability, because the
    // heat stops the growth and does not destroy the toxin the growth
    // produced. This is the honest-microbiology line the whole selective
    // kill exists to draw.
    const meat = item(RANK_MEAT);
    expect(meat.getMaterial()!.getToxicity()[0]!.labileAtK).toBeUndefined();
    ContainmentApi.move(makeBottle(WATER, 2), room);
    const outcome = await craftAs(cook, {
      recipeRef: 'rank-stew',
      makerMode: 'self',
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const payload = BulkableApi.slotFor(outcome.output, undefined)!.getPayload()!;
    expect(BlendLabel.toxicityOf(payload, null).find((t) => t.type === 'ptomaine')?.amount).toBe(700);
  });
});

describe('the working resets the spoilage load (P4)', () => {
  // ⚠ `Provision`, not a bare `Thing`: the spoilage gauge composes on the
  // one class that IS food by name, not on every Thing.
  function spoiled(materialPath: string, load: number): Provision {
    const t = makeStuff(() => new Provision());
    t.setMass(Quantity.of(0.4, 'kg'));
    t.setMaterial(
      StuffApi.findByTemplatePath<Material>(materialPath) as unknown as Material,
    );
    t.setMicrobialLoad(load);
    ContainmentApi.move(t, room);
    return t;
  }

  it('⭐ a real cook KILLS what the inputs brought — the dish starts sterile', async () => {
    spoiled(MEAT, 0.7);
    ContainmentApi.move(makeBottle(WATER, 2), room);
    const outcome = await craftAs(cook, {
      recipeRef: 'wet-simmer', // 373 K, over the 333 K kill
      makerMode: 'self',
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const slot = BulkableApi.slotFor(outcome.output, undefined)!;
    expect(Freshness.loadOf(slot)).toBe(0);
  });

  it('⭐⭐ the kill leaves the FORMED TOXIN behind — cooked rot is still rot', async () => {
    // Heat destroys the population; it does not destroy what the
    // population already made. Without this the load reset took the
    // derived dose with it and cooking rotten meat produced a clean
    // dinner — the exact free lunch the design says does not exist.
    // ⚠ A vegetable slot, because a sound cut of meat is already standing
    // in this room and `pickItemInputs` would reach for it first — the
    // fixture collision that makes a spoilage assertion read green for
    // the wrong reason.
    spoiled(PLAIN_VEG, 0.9);
    const outcome = await craftAs(cook, {
      recipeRef: 'boiled-beans', // 373 K, over the 333 K kill
      makerMode: 'self',
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const slot = BulkableApi.slotFor(outcome.output, undefined)!;
    // Sterile — it will keep as long as anything cooked keeps…
    expect(Freshness.loadOf(slot)).toBe(0);
    // …and poisonous, because it was rotten when it went in.
    const dose = BlendLabel.toxicityOf(slot.getPayload()!, null).find((t) => t.type === 'ptomaine');
    expect(dose).toBeTruthy();
    expect(dose!.amount).toBeGreaterThan(0);
    // ⚠ And the formed dose authors no lability, so re-heating the
    // leftovers cannot destroy it either.
    expect(dose!.labileAtK).toBeUndefined();
  });

  it('a FRESH cook leaves no formed dose at all', async () => {
    spoiled(PLAIN_VEG, 0);
    const outcome = await craftAs(cook, {
      recipeRef: 'boiled-beans',
      makerMode: 'self',
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const slot = BulkableApi.slotFor(outcome.output, undefined)!;
    expect(Freshness.loadOf(slot)).toBe(0);
    expect(
      BlendLabel.toxicityOf(slot.getPayload()!, null).some((t) => t.type === 'ptomaine'),
    ).toBe(false);
  });

  it('⚠ a lazy warm-through resets NOTHING — the load blends through', async () => {
    spoiled(PLAIN_VEG, 0.7);
    const outcome = await craftAs(cook, {
      recipeRef: 'warmed-beans', // 300 K: warm, not cooked
      makerMode: 'self',
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const slot = BulkableApi.slotFor(outcome.output, undefined)!;
    expect(Freshness.loadOf(slot)).toBeCloseTo(0.7, 4);
  });
});
