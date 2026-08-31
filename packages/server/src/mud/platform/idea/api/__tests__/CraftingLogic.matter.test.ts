/**
 * Matter, not mark (farming A4) — the gather predicate admits a Crafted
 * discrete whose MATERIAL is edible.
 *
 * A harvested lime carries a maker's mark (Provision rides CraftedMixin
 * since the fruit cycle), and the shipped predicate excluded everything
 * Crafted as "capital or a made form" — which would have priced grown
 * produce out of every recipe. The distinction is the material, not a
 * flag (the D3 precedent, verbatim from the crafted-bulkable branch):
 *
 *   - a marked LIME still feeds the press;
 *   - a marked KNIFE (crafted, inedible) never does — the anvil never
 *     feeds the forge;
 *   - a marked ROAST gathers — leftovers feeding the next dish is
 *     deliberate.
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
import Thing from '../../../../lib/stuff/Thing';
import { CraftedMixin } from '../../../../lib/craft/Crafted';
import Provision from '../../../thing/Provision';
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
  static _mixinName = 'TestRoomMatter';
}
class TestCook extends MakerMixin(NamedMixin(ContainableMixin(Idea))) {
  static _mixinName = 'TestCookMatter';
  getConferredMixinNames(): readonly string[] {
    return ['MakerMixin'];
  }
}
/** Crafted NON-FOOD — the marked knife's shape (capital, not matter). */
class MarkedGear extends CraftedMixin(ContainableMixin(Thing)) {
  static _mixinName = 'MarkedGearMatter';
}

const LIME_MAT = '/trade/farming/idea/material/lime';
const MEAT_MAT = '/stuff/idea/material/food/roast';
const STEEL_MAT = '/stuff/idea/material/metal/steel';
const JUICE_MAT = '/stuff/idea/material/juice/lime-juice';
const GLASS = '/trade/hospitality/thing/juice-bottle';
const COOK = '/test/cook-matter';

let store: Record<string, Record<string, unknown>[]>;

function registerMaterial(
  path: string,
  name: string,
  tags: string[],
  edible: boolean,
): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setEdibility(edible);
    return m;
  }, path);
}

function makeTool(cap: string) {
  const t = makeStuff(() => new ToolItem());
  t.setCapabilities([cap]);
  return t;
}

async function craftAs(principal: Stuff, req: CraftRequest) {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(principal);
    return CraftingApi.craft(req);
  }) as ReturnType<typeof CraftingApi.craft>;
}

let room: TestRoom;
let cook: TestCook;

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
      return (store[col] ?? []).filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never;
    },
  );
  WorldClockApi._setNowProviderForTesting(() => 1000);

  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    if (path !== GLASS) throw new Error(`unexpected clone ${path}`);
    const g = makeStuff(() => new CraftVessel());
    (g as unknown as { interiorBulk: boolean }).interiorBulk = true;
    g.setInteriorCapacity(Quantity.of(0.3, 'L'));
    return g as never;
  });

  registerMaterial(LIME_MAT, 'lime', ['lime', 'food', 'produce'], true);
  registerMaterial(MEAT_MAT, 'roast', ['meat', 'food'], true);
  registerMaterial(STEEL_MAT, 'steel', ['steel', 'ferrous'], false);
  registerMaterial(JUICE_MAT, 'lime juice', ['lime-juice'], true);
  // The derived-blend fallback a recipe with no authored outputMaterial
  // resolves (applyBulkOutput's singleton walk).
  registerMaterial('/platform/idea/material/blend', 'blend', ['blend'], true);

  store.recipes!.push(
    {
      recipeId: 'press-lime',
      name: 'Lime Juice',
      keywords: ['press-lime'],
      inputSlots: [
        { slot: 'fruit', category: 'lime', minGrade: 'fair', kind: 'item', count: 1 },
      ],
      toolCapabilities: ['juicer'],
      outputTemplate: GLASS,
      outputMaterial: JUICE_MAT,
      outputPortionL: 0.03,
      baseGradeBand: '',
    },
    {
      recipeId: 'grind-buckle',
      name: 'Ground Filings',
      keywords: ['grind-buckle'],
      inputSlots: [
        { slot: 'stock', category: 'steel', minGrade: 'fair', kind: 'item', count: 1 },
      ],
      toolCapabilities: [],
      outputTemplate: GLASS,
      baseGradeBand: '',
    },
    {
      recipeId: 'plate-roast',
      name: 'Plated Roast',
      keywords: ['plate-roast'],
      inputSlots: [
        { slot: 'meat', category: 'meat', minGrade: 'fair', kind: 'item', count: 1 },
      ],
      toolCapabilities: [],
      outputTemplate: GLASS,
      baseGradeBand: '',
    },
  );
  const catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/platform/idea/RecipeCatalogue',
  );
  await catalogue.warm();

  room = makeStuff(() => new TestRoom());
  cook = makeStuffAtPath(() => new TestCook(), COOK);
  ContainmentApi.move(cook, room);
  ContainmentApi.move(makeTool('juicer'), room);
  // The output pool: a clean glass of the output form must stand in the
  // room (crafting claims from the pool, the clone stub is the mint).
  const glass = makeStuffAtPath(() => new CraftVessel(), GLASS);
  (glass as unknown as { interiorBulk: boolean }).interiorBulk = true;
  glass.setInteriorCapacity(Quantity.of(0.3, 'L'));
  ContainmentApi.move(glass, room);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('matter, not mark — the gather predicate', () => {
  it('⭐ a MARKED lime still feeds the press, and its grade rides', async () => {
    const lime = makeStuff(() => new Provision());
    lime.setShortDescription('a lime');
    lime.setMaterial(StuffApi.findByTemplatePath<Material>(LIME_MAT)!);
    lime.setMass(Quantity.of(0.07, 'kg'));
    lime.stamp({
      maker: '/platform/agent/Avatar/somebody',
      grade: (await import('../../../../lib/craft/Grade')).Grade.of('fine'),
      recipe: '/trade/farming/thing/lime',
      craftedAt: 1,
    });
    ContainmentApi.move(lime, room);

    const outcome = await craftAs(cook, {
      recipeRef: 'press-lime',
      makerMode: 'self',
    });
    if (!outcome.ok) {
      throw new Error(`declined: ${outcome.reason} ${String((outcome as { detail?: string }).detail)}`);
    }
    // The grown grade spreads through the weakest link as ever.
    expect(outcome.grade.getBand()).toBe('fine');
    // Consumed — the lime is gone from the room.
    expect(room.getContents().includes(lime)).toBe(false);
  });

  it('a marked KNIFE never does — capital stays capital', async () => {
    const buckle = makeStuff(() => new MarkedGear());
    buckle.setShortDescription('a steel buckle');
    buckle.setMaterial(StuffApi.findByTemplatePath<Material>(STEEL_MAT)!);
    ContainmentApi.move(buckle, room);

    const outcome = await craftAs(cook, {
      recipeRef: 'grind-buckle',
      makerMode: 'self',
    });
    expect(outcome).toMatchObject({
      ok: false,
      reason: 'insufficient-input',
      detail: 'steel',
    });
    expect(room.getContents().includes(buckle)).toBe(true);
  });

  it('a marked ROAST gathers — leftovers feeding the next dish is deliberate', async () => {
    const roast = makeStuff(() => new Provision());
    roast.setShortDescription('half a roast');
    roast.setMaterial(StuffApi.findByTemplatePath<Material>(MEAT_MAT)!);
    roast.setGradeBand('exceptional');
    ContainmentApi.move(roast, room);

    const outcome = await craftAs(cook, {
      recipeRef: 'plate-roast',
      makerMode: 'self',
    });
    if (!outcome.ok) {
      throw new Error(`declined: ${outcome.reason} ${String((outcome as { detail?: string }).detail)}`);
    }
    expect(outcome.grade.getBand()).toBe('exceptional');
  });
});
