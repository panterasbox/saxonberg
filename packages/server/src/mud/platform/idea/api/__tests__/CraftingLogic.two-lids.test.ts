/**
 * ⭐⭐ **THE TWO LIDS** (placement build, D21) — one room, two closable
 * holders, opposite intent, and the SAME rule serving both.
 *
 * The larder is a `Chest` seeded OPEN, because the craft gather walk
 * descends one level into open room containers and that is what makes
 * `cook` work at home. The icebox is seeded SHUT, because a box holds
 * cold by being shut — so its contents are deliberately out of the
 * gather walk, out of reach, out of the `peers` scope and out of sight
 * until somebody opens it.
 *
 * ⚠ That is the requirements doc's stated hazard, checked rather than
 * assumed: *"an icebox that must be shut to hold its cold must not
 * break [the open larder], which is the opposite requirement and needs
 * stating plainly rather than discovering."* This build adds no site
 * for it — every one of those four reads the same `isOpen()`, which is
 * the whole reason the two can sit side by side and disagree.
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
import Good from '../../../../lib/stuff/Good';
import { CraftedMixin } from '../../../../lib/craft/Crafted';
import Provision from '../../../thing/Provision';
import Tool from '../../../thing/Tool';
import CraftVessel from '../../../thing/CraftVessel';
import Chest from '../../../thing/Chest';
import Icebox from '../../../thing/Icebox';
import { PerceptionApi } from '../../../../api/perception';
import RecipeCatalogue from '../../RecipeCatalogue';
import { Idea } from '../../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../lib/description/Named';
import { EmployedMixin } from '../../../../lib/employment/Employed';
import { Stuff } from '../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoomMatter';
}
class TestCook extends EmployedMixin(NamedMixin(ContainableMixin(Idea))) {
  static _mixinName = 'TestCookMatter';
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
/** Crafted NON-FOOD — the marked knife's shape (capital, not matter). */
class MarkedGear extends CraftedMixin(ContainableMixin(Good)) {
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
  const t = makeStuff(() => new Tool());
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

describe('the two lids — an open larder and a shut icebox in one room', () => {
  /** An ingredient the shipped `plate-roast` recipe accepts. */
  function roast(): Provision {
    const r = makeStuff(() => new Provision());
    r.setShortDescription('half a roast');
    r.setMaterial(StuffApi.findByTemplatePath<Material>(MEAT_MAT)!);
    r.setGradeBand('exceptional');
    return r;
  }

  it('⭐ the OPEN larder\'s contents gather; the SHUT icebox\'s do not', async () => {
    const larder = makeStuff(() => new Chest());
    larder.setOpen(true);
    ContainmentApi.move(larder, room);
    const icebox = makeStuffAtPath(() => new Icebox(), '/test/two-lids-icebox');
    icebox.setOpen(false);
    ContainmentApi.move(icebox, room);

    // The only meat in the room is inside the SHUT icebox.
    const chilled = roast();
    ContainmentApi.move(chilled, icebox);

    const declined = await craftAs(cook, {
      recipeRef: 'plate-roast',
      makerMode: 'self',
    });
    expect(declined).toMatchObject({ ok: false, reason: 'insufficient-input' });
    // ⭐ And the refusal is about the MEAT, not about the box: the
    // player is told what is missing, and opening the lid is the act
    // that answers it.
    expect(chilled.isDestroyed()).toBe(false);

    // Open it, and the same roast gathers.
    icebox.setOpen(true);
    const ok = await craftAs(cook, {
      recipeRef: 'plate-roast',
      makerMode: 'self',
    });
    expect(ok.ok).toBe(true);
  });

  it('the larder is untouched — meat in an OPEN chest gathers, as it always has', async () => {
    const larder = makeStuff(() => new Chest());
    larder.setOpen(true);
    ContainmentApi.move(larder, room);
    const icebox = makeStuffAtPath(
      () => new Icebox(),
      '/test/two-lids-icebox-b',
    );
    icebox.setOpen(false);
    ContainmentApi.move(icebox, room);

    ContainmentApi.move(roast(), larder);
    const outcome = await craftAs(cook, {
      recipeRef: 'plate-roast',
      makerMode: 'self',
    });
    expect(outcome.ok).toBe(true);
  });

  it('⭐ canReach agrees with the gather walk, both ways', () => {
    const larder = makeStuff(() => new Chest());
    larder.setOpen(true);
    ContainmentApi.move(larder, room);
    const icebox = makeStuffAtPath(
      () => new Icebox(),
      '/test/two-lids-icebox-c',
    );
    icebox.setOpen(false);
    ContainmentApi.move(icebox, room);

    const inLarder = roast();
    ContainmentApi.move(inLarder, larder);
    const inIcebox = roast();
    ContainmentApi.move(inIcebox, icebox);

    const actor = cook as unknown as Stuff;
    expect(PerceptionApi.canReach(actor, inLarder as unknown as Stuff)).toBe(
      true,
    );
    expect(PerceptionApi.canReach(actor, inIcebox as unknown as Stuff)).toBe(
      false,
    );
    // The BOX itself is always reachable — you can always open it.
    expect(PerceptionApi.canReach(actor, icebox as unknown as Stuff)).toBe(
      true,
    );

    icebox.setOpen(true);
    expect(PerceptionApi.canReach(actor, inIcebox as unknown as Stuff)).toBe(
      true,
    );
  });
});
