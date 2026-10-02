/**
 * Served path, end to end: a patron orders a martini off the menu, the
 * fulfilling bartender crafts it from the bar's stock, the drink is handed
 * over, the patron drinks it — and feels it (BAC rises). Exercises the real
 * Apis: Menu.resolveOrder → CraftingApi.craft (clone + fill + stamp +
 * consume) → the bulk drink path → metabolism. ("metabolism is already
 * shipped" — this asserts the crafted drink plugs into it.)
 */

import "../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CraftingApi } from '../api/crafting';
import { StuffApi } from '../api/stuff';
import { ContainmentApi } from '../api/containment';
import { MixinApi } from '../api/mixin';
import { BulkableApi } from '../api/bulk';
import { ExecutionContextApi } from '../api/execution-context';
import { WorldClockApi } from '../api/worldclock';
import '../platform/idea/WorldClockRegistry';
import { PersistenceManager } from '../../backend/PersistenceManager';
import { Quantity } from '../lib/quantity';
import Material from '../lib/material/Material';
import Condition from '../platform/idea/Condition';
import type { ToxinBehavior } from '../lib/metabolism/Metabolic';
import { Creature } from '../lib/creature/Creature';
import GradedReceptacle from '../platform/thing/GradedReceptacle';
import Tool from '../platform/thing/Tool';
import CraftVessel from '../platform/thing/CraftVessel';
import Menu from '../platform/thing/Menu';
import RecipeCatalogue from '../platform/idea/RecipeCatalogue';
import { Idea } from '../lib/stuff/Idea';
import { ContainerMixin } from '../lib/spatial/Container';
import { ContainableMixin } from '../lib/spatial/Containable';
import { NamedMixin } from '../lib/description/Named';
import { EmployedMixin } from '../lib/employment/Employed';
import { makeStuff, makeStuffAtPath } from '../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import BusinessEntity from '../platform/idea/Business';

const SCALE = 12;
let real = 0;
function advance(c: Creature, gameSec: number, chunkSec = 3000): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    c.getReserve('endurance');
    remaining -= s;
  }
}

const ALCOHOL: ToxinBehavior = {
  toxinType: 'alcohol',
  storeRaw: true,
  absorptionRate: 0.5,
  clearanceRate: 0.12,
  potency: 1,
  bands: [
    { threshold: 0.03, severity: 1 },
    { threshold: 0.08, severity: 2 },
  ],
};
const ALCOHOL_PATH = '/platform/idea/Condition/metabolism/alcohol';
function ensureAlcoholCondition(): void {
  if (StuffApi.findByTemplatePath(ALCOHOL_PATH)) return;
  makeStuffAtPath(() => {
    const c = new Condition();
    c.setName('intoxicated');
    c.setToxinBehavior(ALCOHOL);
    return c;
  }, ALCOHOL_PATH);
}

const GIN = '/stuff/idea/material/spirit/gin';
const VERMOUTH = '/stuff/idea/material/spirit/vermouth';
const MARTINI_MAT = '/stuff/idea/material/cocktail/martini';
const GLASS = '/trade/hospitality/thing/coupe';
const DAVE = '/world/lounge/dave-test';
const SELF = '/world/lounge/self-test';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoom';
}
const TEST_HOUSE = '/world/lounge/idea/business-served-test';

class TestBartender extends EmployedMixin(NamedMixin(ContainableMixin(Idea))) {
  static _mixinName = 'TestBartender';
  // ⭐ Stands in for an on-shift holder of a `fulfills` seat. The real
  // read is three conditions (on shift · the seat marks `fulfills` · the
  // house operates where you stand) and is proved as a truth table in
  // `lib/employment/__tests__/conferral.test.ts`; here the fulfiller is
  // scenery, so the seam is stubbed exactly as the old `MakerMixin`
  // conferral was.
  isFulfilling(): boolean {
    return true;
  }
}

function registerMaterial(
  path: string,
  name: string,
  tags: string[],
  alcoholDose?: number,
): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setEdibility(true);
    if (alcoholDose !== undefined) {
      m.setToxicity([{ type: 'alcohol', amount: alcoholDose }]);
    }
    return m;
  }, path);
}

function makeBottle(materialPath: string, band: string) {
  const b = makeStuff(() => new GradedReceptacle());
  (b as unknown as { interiorBulk: boolean }).interiorBulk = true;
  (b as unknown as { interiorMaterial: string }).interiorMaterial = materialPath;
  b.setInteriorCapacity(Quantity.of(1, 'L'));
  b.setInteriorAmount(Quantity.of(0.7, 'L'));
  b.setGradeBand(band);
  return b;
}

let store: Record<string, Record<string, unknown>[]>;
let room: TestRoom;
let menu: Menu;

beforeEach(async () => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  real = 100000;
  WorldClockApi._setNowProviderForTesting(() => real);
  store = {
    recipes: [
      {
        recipeId: 'martini',
        name: 'Gin Martini',
        keywords: ['martini'],
        inputSlots: [
          { slot: 'base', category: 'gin', minGrade: 'fair', measureL: 0.06 },
          { slot: 'mod', category: 'vermouth', minGrade: 'fair', measureL: 0.01 },
        ],
        toolCapabilities: ['mixing-glass'],
        outputTemplate: GLASS,
        outputMaterial: MARTINI_MAT,
        baseGradeBand: '',
      },
    ],
  };
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
  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    if (path !== GLASS) throw new Error(`unexpected clone ${path}`);
    const g = makeStuff(() => new CraftVessel());
    (g as unknown as { interiorBulk: boolean }).interiorBulk = true;
    g.setInteriorCapacity(Quantity.of(0.3, 'L'));
    return g as never;
  });
  ensureAlcoholCondition();
  registerMaterial(GIN, 'house gin', ['gin'], 19);
  registerMaterial(VERMOUTH, 'dry vermouth', ['vermouth'], 7);
  registerMaterial(MARTINI_MAT, 'martini', ['cocktail'], 26);

  const catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/platform/idea/RecipeCatalogue',
  );
  await catalogue.warm();

  room = makeStuff(() => new TestRoom());
  const dave = makeStuffAtPath(() => new TestBartender(), DAVE);
  ContainmentApi.move(dave, room);
  // ⭐⭐ The fixture needs a HOUSE. Under the agent-coordination build, WHICH
  // able maker serves is the house's decision — `resolveMaker` hands the able
  // set to `house.callFor(...)` — so a maker with no resolvable organization
  // is refused rather than served. The old resolver picked the lowest
  // identity path with no house involved at all, which handed every tie to
  // the player.
  const house = makeStuffAtPath(() => new BusinessEntity(), TEST_HOUSE);
  house.positions = [
    { key: 'bartender', label: 'tending bar', wageRate: 1, fulfills: ['mixology'] },
  ];
  house.setCall('rota');
  (dave as unknown as { employments: unknown[] }).employments = [
    {
      organizationPath: TEST_HOUSE,
      positionKey: 'bartender',
      status: 'on-shift',
      hiredAt: 0,
      onShiftSince: 0,
    },
  ];
  ContainmentApi.move(makeBottle(GIN, 'fine'), room);
  ContainmentApi.move(makeBottle(VERMOUTH, 'fair'), room);
  // The glass pool: one clean coupe of the recipe's output form in reach.
  const coupe = makeStuffAtPath(() => new CraftVessel(), GLASS);
  (coupe as unknown as { interiorBulk: boolean }).interiorBulk = true;
  coupe.setInteriorCapacity(Quantity.of(0.3, 'L'));
  ContainmentApi.move(coupe, room);
  const tool = makeStuff(() => new Tool());
  tool.setCapabilities(['mixing-glass']);
  ContainmentApi.move(tool, room);
  menu = makeStuff(() => new Menu());
  menu.setOfferedRecipes(['martini']);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe("Dave's Bar — order, drink, feel it", () => {
  it('a patron orders a martini, drinks it, and their BAC rises', async () => {
    // The patron orders off the menu (resolve gates on the offer).
    const patron = makeStuff(() => new Creature());
    patron.setMass(Quantity.of(70, 'kg'));
    ContainmentApi.move(patron, room);

    const recipeId = await menu.resolveOrder('martini');
    expect(recipeId).toBe('martini');

    const outcome = await ExecutionContextApi.runRoot(null, 'test', () => {
      ExecutionContextApi.tagActingAuthor(patron); // the patron is the giver
      return CraftingApi.craft({
        recipeRef: recipeId!,
        makerMode: 'fulfilling-bartender',
      });
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    // Maker is the bartender, not the ordering patron.
    expect((outcome.output as unknown as { getMaker(): string }).getMaker()).toBe(DAVE);

    // Hand it over and drink it (the bulk drink path).
    const drink = outcome.output;
    if (MixinApi.isContainable(drink)) ContainmentApi.move(drink, patron);
    const before = patron.getBAC().rawValue();

    const slot = BulkableApi.slotFor(drink, undefined)!;
    const material = slot.getMaterial();
    const res = BulkableApi.transfer(slot, null, { kind: 'all' });
    BulkableApi.ingest(patron, material, res.applied);

    advance(patron, 1800); // ~30 game-min: the dose absorbs
    expect(patron.getBAC().rawValue()).toBeGreaterThan(before);
  });
});

/**
 * ⭐⭐ **Somebody else if anybody else; otherwise yourself.**
 *
 * `presentFulfillers` used to exclude the asker outright, which read as
 * modest and was in fact a dead end: the distilling yard's own hand, stood
 * on its own floor in its own seat, asking a room containing nobody else,
 * got "there's no one on hand to make that" — so `cellars`' crush leg could
 * never have worked. The asker is now the LAST answer, never the first, so
 * a patron in a staffed bar is still never served by themselves.
 */
describe('resolveMaker — the asker is the last fulfiller, not an excluded one', () => {
  it('somebody else serves when somebody else is there', async () => {
    const asker = makeStuffAtPath(() => new TestBartender(), SELF);
    (asker as unknown as { employments: unknown[] }).employments = [
      {
        organizationPath: TEST_HOUSE,
        positionKey: 'bartender',
        status: 'on-shift',
        hiredAt: 0,
        onShiftSince: 0,
      },
    ];
    ContainmentApi.move(asker, room);

    const outcome = await ExecutionContextApi.runRoot(null, 'test', () => {
      ExecutionContextApi.tagActingAuthor(asker);
      return CraftingApi.craft({
        recipeRef: 'martini',
        makerMode: 'fulfilling-bartender',
      });
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(
      (outcome.output as unknown as { getMaker(): string }).getMaker(),
    ).toBe(DAVE);
  });

  it('and the only able person in the room, asked, is the answer', async () => {
    // Nobody else able is present — the fallback leg, and the only reason
    // a lone hand can work its own station on its own ask.
    const dave = StuffApi.findByTemplatePath(DAVE);
    if (dave) StuffApi.destruct(dave);

    const asker = makeStuffAtPath(() => new TestBartender(), SELF);
    (asker as unknown as { employments: unknown[] }).employments = [
      {
        organizationPath: TEST_HOUSE,
        positionKey: 'bartender',
        status: 'on-shift',
        hiredAt: 0,
        onShiftSince: 0,
      },
    ];
    ContainmentApi.move(asker, room);

    const outcome = await ExecutionContextApi.runRoot(null, 'test', () => {
      ExecutionContextApi.tagActingAuthor(asker);
      return CraftingApi.craft({
        recipeRef: 'martini',
        makerMode: 'fulfilling-bartender',
      });
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(
      (outcome.output as unknown as { getMaker(): string }).getMaker(),
    ).toBe(SELF);
  });
});
