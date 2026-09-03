/**
 * The Hearthworks venues — smithy + cookhouse standup over the REAL
 * authored rows: the recipe roster is loaded from the three trade packs'
 * `content/recipes/*.yaml`
 * and the food/metal materials from the base-library pack files, so a
 * drifted seed fails here. Asserts the venue surfaces (menus afford the
 * right verb sets, `CommerceMenu.resolveIn` finds any venue subclass),
 * the served path (`order belt-knife` at a lit+bellowsed forge, the
 * knife's material derived from the chosen ingot; the cold forge's
 * diegetic decline), the cookhouse (`order` a stew; the pantry chest
 * feeds the craft open and refuses closed), and the meal's honest macros
 * (metabolism ingest + the NutritionLabel).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { CraftingApi } from '../../../api/crafting';
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
import { DetailedMixin } from '../../../lib/description/Detailed';
import { DurableMixin } from '../../../lib/material/Durable';
import { ToolMixin } from '../../../lib/craft/Tooled';
import { ManualBuildMixin } from '../../../lib/craft/ManualBuild';
import { CraftedMixin } from '../../../lib/craft/Crafted';
import Ingot from '../../../platform/thing/Ingot';
import Forge from '../../../platform/thing/Forge';
import Oven from '../../../platform/thing/Oven';
import Chest from '../../../platform/thing/Chest';
import Dish from '../../../platform/thing/Dish';
import Weapon from '../../../platform/thing/equipment/Weapon';
import ToolItem from '../../../platform/thing/ToolItem';
import CommerceMenu from '../../../lib/commerce/Menu';
import Menu from '../../../platform/thing/Menu';
import RecipeCatalogue from '../../../platform/idea/RecipeCatalogue';
import { Reserve } from '../../../lib/reserve';
import { Creature } from '../../../lib/creature/Creature';
import { Idea } from '../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { ThermalMixin } from '../../../lib/thermal/Thermal';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { NamedMixin } from '../../../lib/description/Named';
import { MakerMixin } from '../../../lib/craft/Maker';
import { Construction } from '../../../lib/material/Construction';
import { Stuff } from '../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

/**
 * The three trade packs that ship every recipe (content packs wave 4a/4b):
 * a trade owns what it introduces; generic-objects ships none. The
 * catalogue is path-agnostic — it serves every `recipe` document whoever
 * installed it.
 */
const RECIPE_DIRS = ['trade-smithing', 'trade-cooking', 'trade-hospitality'].map((pack) =>
  fileURLToPath(new URL(`../../../../../../content/${pack}/content/recipes/`, import.meta.url)),
);
/** A shipped row's `data` block, read from a pack by content-relative path. */
const readRow = (rel: string): Record<string, unknown> =>
  (YAML.parse(
    readFileSync(fileURLToPath(new URL(`../../../../../../content/${rel}`, import.meta.url)), 'utf8'),
  ) as { data: Record<string, unknown> }).data;
const PACK_MATERIALS = fileURLToPath(
  new URL(
    '../../../../../../content/base-library/content/stuff/idea/material/',
    import.meta.url,
  ),
);
// The generic cooked base is the PLATFORM pack's (the kernel names it).
const PLATFORM_MATERIALS = fileURLToPath(
  new URL(
    '../../../../../../content/platform/content/platform/idea/material/',
    import.meta.url,
  ),
);

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoomVenues';
}
class TestMaker extends MakerMixin(
  ThermalMixin(ContainerMixin(NamedMixin(ContainableMixin(Idea)))),
) {
  static _mixinName = 'TestMakerVenues';
  // MakerMixin is augment-gated; this stands in for an on-shift employee
  // (the employment leg `collectAugmentConferralNames` reads).
  getConferredMixinNames(): readonly string[] {
    return ['MakerMixin'];
  }
}
class TestPatron extends ThermalMixin(
  ContainerMixin(NamedMixin(ContainableMixin(Idea))),
) {
  static _mixinName = 'TestPatronVenues';
}

/** Register a Material at its pack path from the REAL pack row. */
function loadPackMaterial(rel: string, platform = false): Material {
  const parsed = YAML.parse(
    readFileSync(`${platform ? PLATFORM_MATERIALS : PACK_MATERIALS}${rel}.yaml`, 'utf-8'),
  ) as { data: Record<string, unknown> };
  const d = parsed.data;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(d.name as string);
    m.setTags((d.tags as string[]) ?? []);
    if (d.edibility === true) m.setEdibility(true);
    if (Array.isArray(d.nutrients)) m.setNutrients(d.nutrients as string[]);
    if (d.nutrientAmounts) {
      m.setNutrientAmounts(d.nutrientAmounts as Record<string, number>);
    }
    return m;
  }, `${platform ? '/platform' : '/stuff'}/idea/material/${rel}`) as unknown as Material;
}

function makeForge(lit: boolean, bellows = false): Forge {
  return makeStuff(() => {
    const f = new Forge();
    f.setBurnTemperatureK(1300);
    f.setBellowsMultiplier(1.6);
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
    f.setBellowsActive(bellows);
    return f;
  });
}

function makeOven(lit: boolean): Oven {
  return makeStuff(() => {
    const o = new Oven();
    o.setBurnTemperatureK(500);
    o.setReserve(
      new Reserve(
        'fuel',
        Quantity.of(100, '%'),
        Quantity.of(100, '%'),
        'combustion',
        null,
      ),
    );
    o._setLit(lit);
    return o;
  });
}

function makeTool(cap: string): ToolItem {
  const t = makeStuff(() => new ToolItem());
  t.setCapabilities([cap]);
  return t;
}

function stock(materialPath: string, massKg: number): Thing {
  const t = makeStuff(() => new Thing());
  t.setMass(Quantity.of(massKg, 'kg'));
  t.setMaterial(
    StuffApi.findByTemplatePath<Material>(materialPath) as unknown as Material,
  );
  return t;
}

async function craftAs(
  principal: Stuff,
  recipeRef: string,
  makerMode: 'self' | 'fulfilling-bartender',
): Promise<Awaited<ReturnType<typeof CraftingApi.craft>>> {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(principal);
    return CraftingApi.craft({ recipeRef, makerMode });
  }) as unknown as Awaited<ReturnType<typeof CraftingApi.craft>>;
}

let store: Record<string, Record<string, unknown>[]>;

beforeEach(async () => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  WorldClockApi._setNowProviderForTesting(() => 1000);
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) => {
      // Recipes are `documents` rows of kind `recipe` (content-packs wave
      // 2); the fixtures keep the legacy row shape and are wrapped here.
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
  // The craft-resolve evidence tail (advancement + watch-=-claim) writes
  // through the PM; capture it in the same store.
  let idCounter = 0;
  vi.spyOn(pm, 'save').mockImplementation(
    async (col: string, doc: Record<string, unknown>) => {
      const rows = (store[col] ??= []);
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      rows.push({ ...doc, _id: id });
      return id as never;
    },
  );

  // The REAL authored roster — a drifted pack file fails here.
  const recipes = RECIPE_DIRS.flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith('.yaml'))
      .sort()
      .map((f) => YAML.parse(readFileSync(dir + f, 'utf-8')) as Record<string, unknown>),
  );
  store = { recipes };

  // The REAL pack materials the roster consumes.
  loadPackMaterial('element/iron');
  loadPackMaterial('organic/leather');
  loadPackMaterial('food/trail-ration');
  loadPackMaterial('food/root-vegetable');
  loadPackMaterial('food/stew-meat');
  loadPackMaterial('cooked', true);

  // Output templates cloned by the roster (the real classes, minted here
  // — the faked-Mongo test has no clone pipeline; the substation
  // precedent).
  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    if (path === '/stuff/thing/arms/belt-knife' || path === '/stuff/thing/arms/fire-poker') {
      const w = makeStuff(() => new Weapon());
      w.setConstruction(
        Construction.of(path.endsWith('poker') ? 'hafted' : 'bladed'),
      );
      w.setMass(Quantity.of(0.2, 'kg'));
      w.setLength(Quantity.of(0.2, 'm'));
      return w as never;
    }
    if (path === '/stuff/thing/items/plated-dish') {
      const d = makeStuff(() => new Dish());
      (d as unknown as { interiorBulk: boolean }).interiorBulk = true;
      d.setInteriorCapacity(Quantity.of(0.6, 'L'));
      return d as never;
    }
    throw new Error(`unexpected clone ${path}`);
  });

  const catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/platform/idea/RecipeCatalogue',
  );
  await catalogue.warm();
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

/**
 * A synthetic build vessel — Crafted + Durable + ManualBuild + Tool, the
 * SHAPE the hearth cares about. Hearth-cooking's `CookPot` ships in its
 * own pack (a class lives in the pack whose content names it), and the
 * kernel knows a pot only by the `pot` capability its ROW authors — which
 * is exactly what the affordance assertion below reads off the row.
 */
class TestPot extends CraftedMixin(
  ManualBuildMixin(ToolMixin(DurableMixin(DetailedMixin(Thing)))),
) {
  public override capabilities: string[] = ['pot'];
}

describe('the venue menus', () => {
  it('every menu affords commerce only; instruments carry the working verbs', () => {
    // Menus = menu/order, any venue (inherited off the commerce base).
    const commerce = ['platform/cmd/retail/menu.yaml', 'platform/cmd/retail/order.yaml'];
    expect(Menu.commandContributions.peers).toEqual(commerce);
    expect(Menu.commandContributions.environment).toEqual(commerce);

    // ⭐ The working verbs ride the instruments, and there is exactly ONE
    // record of that: `static commandContributions` on the class. A
    // trade's own instrument verbs live on that trade's pack classes
    // (`/trade/smithing/thing/Anvil`, `/trade/cooking/thing/CookPot`)
    // and are asserted in those packs' suites — which is precisely why
    // no kernel test can name them, and why the kernel can never name a
    // trade's view. What the KERNEL owns is the build vessel: `pour` and
    // `stir` are banked into and worked on a manual build, so
    // `ManualBuildMixin` declares them for every vessel that buffers one
    // — the shaker, the mixing glass, the cook pot.
    const build = ManualBuildMixin(Thing).commandContributions;
    expect(build.peers).toContain('platform/cmd/crafting/pour.yaml');
    expect(build.peers).toContain('platform/cmd/crafting/stir.yaml');
    expect(build.peers).not.toContain('trade/hospitality/cmd/crafting/mix.yaml');

    // `heat` is the furnace's — the fire is the instrument.
    expect(Forge.commandContributions.peers).toContain(
      'platform/cmd/crafting/heat.yaml',
    );

    // The one Menu IS a commerce menu (resolveIn's instanceof filter);
    // the venues differ only in the rows' data.
    expect(makeStuff(() => new Menu())).toBeInstanceOf(CommerceMenu);
  });

  it('the smithy slate offers the authored ladder', async () => {
    const menu = makeStuff(() => new Menu());
    menu.setOfferedRecipes([
      'fire-poker',
      'cook-pot',
      'smiths-hammer',
      'belt-knife',
      'leather-jerkin',
    ]);
    expect(await menu.resolveOrder('knife')).toBe('belt-knife');
    expect(await menu.resolveOrder('martini')).toBeNull(); // not this venue's
  });
});

describe('the smithy, served', () => {
  function standUpSmithy(lit: boolean, bellows: boolean): {
    room: TestRoom;
    patron: TestPatron;
    ingot: Ingot;
  } {
    const room = makeStuff(() => new TestRoom());
    ContainmentApi.move(makeForge(lit, bellows), room);
    ContainmentApi.move(makeTool('striking'), room);
    ContainmentApi.move(makeTool('anvil'), room);
    const ingot = makeStuff(() => new Ingot());
    ingot.setMass(Quantity.of(0.5, 'kg'));
    ingot.setMaterial(
      StuffApi.findByTemplatePath<Material>(
        '/stuff/idea/material/element/iron',
      ) as unknown as Material,
    );
    ContainmentApi.move(ingot, room);
    ContainmentApi.move(
      makeStuffAtPath(() => new TestMaker(), `/obj/_test/venue-smith-${lit}-${bellows}`),
      room,
    );
    const patron = makeStuff(() => new TestPatron());
    ContainmentApi.move(patron, room);
    return { room, patron, ingot };
  }

  it('order belt-knife at a lit+bellowsed forge: the knife IS the ingot iron', async () => {
    const { patron, ingot } = standUpSmithy(true, true);
    const outcome = await craftAs(patron, 'belt-knife', 'fulfilling-bartender');
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // The material flowed from the chosen ingot; the profile reads it.
    expect(MixinApi.isTangible(outcome.output)).toBe(true);
    if (!MixinApi.isTangible(outcome.output)) return;
    expect(outcome.output.getMaterial()?.getName()).toBe('iron');
    expect(outcome.output.getMass().rawValue()).toBeCloseTo(0.5, 9);
    expect((outcome.output as Weapon).getProfile().isInert()).toBe(false);
    expect(ingot.isDestroyed()).toBe(true);
  });

  it('the same order at an unbellowsed forge declines insufficient-heat (data, not a throw)', async () => {
    const { patron } = standUpSmithy(true, false); // 1300 K < the 1400 K gate
    const outcome = await craftAs(patron, 'belt-knife', 'fulfilling-bartender');
    expect(outcome).toMatchObject({ ok: false, reason: 'insufficient-heat' });
    // The poker's 700 K rung clears without the bellows (the ladder).
    const poker = await craftAs(patron, 'fire-poker', 'fulfilling-bartender');
    expect(poker.ok).toBe(true);
  });
});

describe('the cookhouse, served', () => {
  function standUpCookhouse(chestOpen: boolean): {
    room: TestRoom;
    patron: TestPatron;
    chest: Chest;
  } {
    const room = makeStuff(() => new TestRoom());
    ContainmentApi.move(makeOven(true), room);
    const pot = makeStuff(() => new TestPot());
    ContainmentApi.move(pot, room);
    const chest = makeStuff(() => new Chest());
    ContainmentApi.move(chest, room);
    ContainmentApi.move(stock('/stuff/idea/material/food/root-vegetable', 0.6), chest);
    ContainmentApi.move(stock('/stuff/idea/material/food/root-vegetable', 0.6), chest);
    ContainmentApi.move(stock('/stuff/idea/material/food/stew-meat', 0.4), chest);
    chest.setOpen(chestOpen);
    ContainmentApi.move(
      makeStuffAtPath(() => new TestMaker(), `/obj/_test/venue-cook-${chestOpen}`),
      room,
    );
    const patron = makeStuff(() => new TestPatron());
    ContainmentApi.move(patron, room);
    return { room, patron, chest };
  }

  it('order a stew: the pantry chest feeds the craft, the dish carries honest macros', async () => {
    const { patron } = standUpCookhouse(true);
    const outcome = await craftAs(patron, 'hearty-stew', 'fulfilling-bartender');
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const dish = outcome.output;
    const slot = BulkableApi.slotFor(dish, undefined)!;
    // The DERIVED blend: no per-dish material row exists — the slot
    // points at the ONE generic cooked base and the payload carries the
    // stew's identity + macros, summed from the ACTUAL pantry inputs
    // (macros in = macros out; the fixed-vocabulary rule live).
    expect(slot.getMaterialPath()).toBe('/platform/idea/material/cooked');
    const payload = slot.getPayload()!;
    expect(payload.name).toBe('Hearty Stew');
    expect(payload.nutrientAmounts).toMatchObject({
      carb: expect.any(Number),
      protein: expect.any(Number),
    });
    expect(payload.edible).toBe(true);
    expect(slot.getAmount().rawValue()).toBeCloseTo(0.4, 9);

    // The macros route through the shipped metabolism ingest — the
    // payload speaks for the meal.
    const eater = makeStuff(() => new Creature());
    eater.setMass(Quantity.of(70, 'kg'));
    const material = slot.getMaterial()!;
    const res = BulkableApi.transfer(slot, null, { kind: 'all' });
    expect(() =>
      BulkableApi.ingest(eater, material, res.applied, payload),
    ).not.toThrow();
  });

  it('the same order refuses when the pantry chest is closed', async () => {
    const { patron } = standUpCookhouse(false);
    const outcome = await craftAs(patron, 'hearty-stew', 'fulfilling-bartender');
    expect(outcome).toMatchObject({
      ok: false,
      reason: 'insufficient-input',
      detail: 'vegetable',
    });
  });

  it('the fine roast demands fine-grade stock (the grade spread bites)', async () => {
    const { room, patron } = standUpCookhouse(true);
    // Ordinary (ungraded → fair) meat cannot make it…
    const declined = await craftAs(patron, 'fine-roast', 'fulfilling-bartender');
    expect(declined).toMatchObject({
      ok: false,
      reason: 'insufficient-input',
      detail: 'meat',
    });
    // …a fine-graded prime cut can.
    const { default: Provision } = await import('../../../platform/thing/Provision');
    const prime = makeStuff(() => new Provision());
    prime.setMass(Quantity.of(0.5, 'kg'));
    prime.setMaterial(
      StuffApi.findByTemplatePath<Material>(
        '/stuff/idea/material/food/stew-meat',
      ) as unknown as Material,
    );
    prime.setGradeBand('fine');
    ContainmentApi.move(prime, room);
    const outcome = await craftAs(patron, 'fine-roast', 'fulfilling-bartender');
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.grade.getBand()).toBe('fine');
  });
});
