/**
 * CraftingLogic — craft-resolve. Drives CraftingApi.craft against a room of
 * graded bottles + tools, asserting: happy path (clone + fill + stamp),
 * missing-tool / insufficient-input declines, grade = weakest-link,
 * conservation (exact debit), and the un-spoofable maker (derived from the
 * execution context / world, never the wire).
 *
 * Mongo is faked (recipes collection); `StuffApi.clone` is stubbed to mint
 * the output glass (the dynamic class-import isn't exercised in-process);
 * materials are registered at their paths so `singleton` resolves them.
 */

import "../../../../../test-bootstrap";
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
import GradedReceptacle from '../../../thing/GradedReceptacle';
import ToolItem from '../../../thing/ToolItem';
import CraftVessel from '../../../thing/CraftVessel';
import RecipeCatalogue from '../../RecipeCatalogue';
import { Idea } from '../../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../lib/description/Named';
import { MakerMixin } from '../../../../lib/craft/Maker';
import { Stuff } from '../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoom';
}
class TestBartender extends MakerMixin(NamedMixin(ContainableMixin(Idea))) {
  static _mixinName = 'TestBartender';
  // MakerMixin is augment-gated; a test bartender stands in for an on-shift
  // employee by conferring the role directly (the employment leg
  // `collectAugmentConferralNames` reads), so `MixinApi.isMaker` is true.
  getConferredMixinNames(): readonly string[] {
    return ['MakerMixin'];
  }
}
class TestPatron extends NamedMixin(ContainableMixin(Idea)) {
  static _mixinName = 'TestPatron';
}

const GIN = '/stuff/idea/material/spirit/gin';
const VERMOUTH = '/stuff/idea/material/spirit/vermouth';
const RUM = '/stuff/idea/material/spirit/rum';
const MARTINI_MAT = '/stuff/idea/material/cocktail/martini';
const GLASS = '/trade/hospitality/thing/coupe';
const DAVE = '/world/lounge/dave-test';

let store: Record<string, Record<string, unknown>[]>;

function registerMaterial(path: string, name: string, tags: string[]): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    return m;
  }, path);
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

/** A clean, empty glass of the recipe's output form — the pool entry. */
function makeGlass() {
  const g = makeStuffAtPath(() => new CraftVessel(), GLASS);
  (g as unknown as { interiorBulk: boolean }).interiorBulk = true;
  g.setInteriorCapacity(Quantity.of(0.3, 'L'));
  return g;
}

function makeTool(cap: string) {
  const t = makeStuff(() => new ToolItem());
  // ⭐ The instrument authors the working it performs — the kernel keeps
  // no technique table, so a tool naming none leaves the drink `built`.
  // These are the same numbers hospitality's mixing-glass row carries.
  t.setCapabilities([
    cap === 'mixing-glass'
      ? { kind: cap, technique: { name: 'stirred', chillK: 6, dilutionL: 0.01, priority: 2 } }
      : cap,
  ]);
  return t;
}

/** Run a craft with `principal` as the acting author (the context giver). */
async function craftAs(
  principal: Stuff | null,
  req: CraftRequest,
): Promise<ReturnType<typeof CraftingApi.craft>> {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    if (principal) ExecutionContextApi.tagActingAuthor(principal);
    return CraftingApi.craft(req);
  }) as ReturnType<typeof CraftingApi.craft>;
}

let room: TestRoom;
let bartender: TestBartender;

beforeEach(async () => {
  store = { recipes: [] };
  StuffApi.clearAll();
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
  WorldClockApi._setNowProviderForTesting(() => 1000);

  // Stub clone to mint the output glass (avoids the dynamic class-import).
  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    if (path !== GLASS) throw new Error(`unexpected clone ${path}`);
    const g = makeStuff(() => new CraftVessel());
    (g as unknown as { interiorBulk: boolean }).interiorBulk = true;
    g.setInteriorCapacity(Quantity.of(0.3, 'L'));
    return g as never;
  });

  // Materials (registered at their paths so singleton resolves them).
  registerMaterial(GIN, 'house gin', ['gin']);
  registerMaterial(VERMOUTH, 'dry vermouth', ['vermouth']);
  registerMaterial(RUM, 'white rum', ['rum']);
  registerMaterial(MARTINI_MAT, 'martini', ['cocktail']);

  // Recipes → catalogue.
  store.recipes!.push({
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
  });
  const catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/platform/idea/RecipeCatalogue',
  );
  await catalogue.warm();

  // The room: gin (fine) + vermouth (fair) bottles, a mixing glass, Dave.
  room = makeStuff(() => new TestRoom());
  bartender = makeStuffAtPath(() => new TestBartender(), DAVE);
  ContainmentApi.move(makeBottle(GIN, 'fine', 0.7), room);
  ContainmentApi.move(makeBottle(VERMOUTH, 'fair', 0.7), room);
  ContainmentApi.move(makeTool('mixing-glass'), room);
  ContainmentApi.move(makeGlass(), room);
  ContainmentApi.move(bartender, room);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('CraftingLogic.craft', () => {
  it('crafts a stamped, graded drink and consumes inputs (conservation)', async () => {
    const gin = room.getContents().find(
      (c) => MixinApi.isGraded(c) && BulkableApi.slotFor(c, undefined)?.getMaterialPath() === GIN,
    )!;
    const outcome = await craftAs(bartender, {
      recipeRef: 'martini',
      makerMode: 'self',
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    // Output: a crafted, graded glass holding 0.07 L of martini plus the
    // 0.01 L a stirred working folds in (the `mixing-glass` technique's
    // dilution) — conservation plus the honest water.
    expect(MixinApi.isCrafted(outcome.output)).toBe(true);
    expect(outcome.grade.getBand()).toBe('fair'); // min(fine, fair)
    const outSlot = BulkableApi.slotFor(outcome.output, undefined)!;
    expect(outSlot.getMaterialPath()).toBe(MARTINI_MAT);
    expect(outSlot.getAmount().rawValue()).toBeCloseTo(0.08, 6);

    // Provenance + recipe + clock stamped.
    expect((outcome.output as unknown as { getMaker(): string }).getMaker()).toBe(DAVE);
    expect((outcome.output as unknown as { getRecipe(): string }).getRecipe()).toBe('martini');
    const craftedAt = (outcome.output as unknown as { getCraftedAt(): number }).getCraftedAt();
    expect(typeof craftedAt).toBe('number');
    expect(craftedAt).toBeGreaterThanOrEqual(0);

    // Conservation: gin debited exactly 0.06 (0.70 -> 0.64).
    expect(BulkableApi.slotFor(gin, undefined)!.getAmount().rawValue()).toBeCloseTo(0.64, 6);
  });

  it('declines with missing-tool when no shaker/mixing-glass is present', async () => {
    // Remove the mixing glass.
    for (const c of room.getContents()) {
      if (MixinApi.isTool(c)) ContainmentApi.move(c, null);
    }
    const outcome = await craftAs(bartender, {
      recipeRef: 'martini',
      makerMode: 'self',
    });
    expect(outcome).toMatchObject({ ok: false, reason: 'missing-tool', detail: 'mixing-glass' });
  });

  it('declines with insufficient-input when a category is missing', async () => {
    for (const c of room.getContents()) {
      if (MixinApi.isGraded(c) && BulkableApi.slotFor(c, undefined)?.getMaterialPath() === GIN) {
        ContainmentApi.move(c, null);
      }
    }
    const outcome = await craftAs(bartender, {
      recipeRef: 'martini',
      makerMode: 'self',
    });
    expect(outcome).toMatchObject({ ok: false, reason: 'insufficient-input', detail: 'gin' });
  });

  it('declines unknown recipes', async () => {
    const outcome = await craftAs(bartender, {
      recipeRef: 'mai-tai',
      makerMode: 'self',
    });
    expect(outcome).toMatchObject({ ok: false, reason: 'no-recipe' });
  });

  it('derives the maker from context, never the wire (self = the giver)', async () => {
    const outcome = await craftAs(bartender, {
      recipeRef: 'martini',
      makerMode: 'self',
      // a spoof attempt: there is no maker field on CraftRequest to set.
    } as CraftRequest);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect((outcome.output as unknown as { getMaker(): string }).getMaker()).toBe(DAVE);
  });

  it('with no acting author, declines no-maker', async () => {
    const outcome = await craftAs(null, {
      recipeRef: 'martini',
      makerMode: 'self',
    });
    expect(outcome).toMatchObject({ ok: false, reason: 'no-maker' });
  });

  it('order (fulfilling-bartender): maker is the present bartender, not the patron', async () => {
    const patron = makeStuffAtPath(() => new TestPatron(), '/platform/agent/Avatar/patron');
    ContainmentApi.move(patron, room);
    const outcome = await craftAs(patron, {
      recipeRef: 'martini',
      makerMode: 'fulfilling-bartender',
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // Stamped to Dave (the world-resolved maker), not the ordering patron.
    expect((outcome.output as unknown as { getMaker(): string }).getMaker()).toBe(DAVE);
  });
});
