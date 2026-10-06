/**
 * ⛔⛔ **A recipe used to launder the dose, and this is the test that would
 * have caught it.**
 *
 * `applyBulkOutput`'s authored-material branch set the output's material,
 * its amount and the maker — and nothing else. So a recipe was the one
 * way matter could move in this game **without its concentrations moving
 * with it**: vatting two badly-cut bottles of whisky produced one bottle
 * that read clean, and every pour-side anti-laundering guard
 * (`DissolvedToxins`, `Contamination`, `Freshness`) could be walked
 * straight around by anyone with a recipe.
 *
 * The slate said blending "needs no new mechanism" because the
 * two-bulk-input shape already shipped (`dry-vermouth`). That was true of
 * the SLOTS and false of the payload, and it is the fact that made W0 a
 * kernel wave.
 *
 * Three things under test:
 *
 *   1. **The fold** — two doses in, the volume-weighted dose out, the
 *      arithmetic computed here by hand.
 *   2. **`imparts`** — what the WORKING adds on top, additively, because
 *      a kiln that puts 30 mg/L of smoke in the malt does that whether
 *      you kilned one litre or twenty.
 *   3. **The appearance** — a recipe's `outputAppearance` reaching an
 *      authored-material output at all, which it never did before.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CraftingApi } from '../../../../api/crafting';
import type { CraftRequest } from '../../../../api/crafting';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { BulkableApi } from '../../../../api/bulk';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { WorldClockApi } from '../../../../api/worldclock';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Quantity } from '../../../../lib/quantity';
import Material from '../../../../lib/material/Material';
import Tool from '../../../thing/Tool';
import CraftVessel from '../../../thing/CraftVessel';
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
  static _mixinName = 'TestRoomBlendPayload';
}
class TestDistiller extends EmployedMixin(
  NamedMixin(ContainableMixin(Idea)),
) {
  static _mixinName = 'TestDistillerBlendPayload';
  isFulfilling(): boolean {
    return true;
  }
}

const MALT_MAT = '/test/material/malt-whisky';
const GRAIN_MAT = '/test/material/grain-whisky';
const BLEND_MAT = '/test/material/blended-whisky';
const BOTTLE = '/test/thing/blend-bottle';

let store: Record<string, Record<string, unknown>[]>;
let room: TestRoom;
let distiller: TestDistiller;
let catalogue: RecipeCatalogue;

function registerMaterial(path: string, name: string, tags: string[]): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setEdibility(true);
    m.setAppearance(`${name}, as the material row describes it`);
    return m;
  }, path);
}

/** A filled source vessel with an authored payload. */
async function sourceBottle(
  materialPath: string,
  litres: number,
  payload: Record<string, unknown>,
): Promise<CraftVessel> {
  const v = makeStuff(() => new CraftVessel());
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(2, 'L'));
  const material = await StuffApi.singleton<Material>(materialPath);
  const slot = BulkableApi.slotFor(v, undefined)!;
  slot.setMaterial(material);
  slot.setAmount(Quantity.of(litres, 'L'));
  slot.setPayload(payload as never);
  v.setGradeBand('fine');
  ContainmentApi.move(v, room);
  return v;
}

async function craftAs(principal: Stuff, recipeRef: string) {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(principal);
    return CraftingApi.craft({ recipeRef, makerMode: 'self' } as CraftRequest);
  }) as ReturnType<typeof CraftingApi.craft>;
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
      return (store[col] ?? []).filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never;
    },
  );
  WorldClockApi._setNowProviderForTesting(() => 1000);

  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    if (path !== BOTTLE) throw new Error(`unexpected clone ${path}`);
    const g = makeStuff(() => new CraftVessel());
    (g as unknown as { interiorBulk: boolean }).interiorBulk = true;
    g.setInteriorCapacity(Quantity.of(1, 'L'));
    return g as never;
  });

  registerMaterial(MALT_MAT, 'malt whisky', ['liquid', 'malt-whisky']);
  registerMaterial(GRAIN_MAT, 'grain whisky', ['liquid', 'grain-whisky']);
  registerMaterial(BLEND_MAT, 'blended whisky', ['liquid', 'blended-whisky']);

  store.recipes!.push({
    recipeId: 'vat-whisky',
    name: 'Blended Whisky',
    keywords: ['vat-whisky'],
    inputSlots: [
      { slot: 'malt', category: 'malt-whisky', minGrade: 'poor', measureL: 0.3 },
      { slot: 'grain', category: 'grain-whisky', minGrade: 'poor', measureL: 0.45 },
    ],
    toolCapabilities: ['vat'],
    outputApplication: 'bulk',
    outputTemplate: BOTTLE,
    outputMaterial: BLEND_MAT,
    outputAppearance: 'a deep amber blended whisky',
    baseGradeBand: '',
  });
  catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/platform/idea/RecipeCatalogue',
  );
  await catalogue.warm();

  room = makeStuff(() => new TestRoom());
  distiller = makeStuffAtPath(() => new TestDistiller(), '/test/distiller');
  distiller.setName('Ewan');
  ContainmentApi.move(distiller, room);
  const vat = makeStuff(() => new Tool());
  vat.setCapabilities(['vat']);
  ContainmentApi.move(vat, room);
  // ⚠ The output POOL: crafting claims a clean vessel of the output form
  // from the room; the `clone` stub above is only the mint behind it.
  const empty = makeStuffAtPath(() => new CraftVessel(), BOTTLE);
  (empty as unknown as { interiorBulk: boolean }).interiorBulk = true;
  empty.setInteriorCapacity(Quantity.of(1, 'L'));
  ContainmentApi.move(empty, room);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._setNowProviderForTesting(null);
});

describe('a recipe carries its inputs concentrations', () => {
  it('⛔ does NOT launder a dose — two bad bottles blended are not clean', async () => {
    // 0.3 L of badly-cut malt at 435 mg/L methanol, vatted with 0.45 L of
    // grain at 40 mg/L. By hand:
    //   (435 × 0.3 + 40 × 0.45) / 0.75 = (130.5 + 18) / 0.75 = 198 mg/L
    await sourceBottle(MALT_MAT, 0.3, {
      dissolvedToxins: [{ type: 'methanol', amount: 435 }],
    });
    await sourceBottle(GRAIN_MAT, 0.45, {
      dissolvedToxins: [{ type: 'methanol', amount: 40 }],
    });

    const res = await craftAs(distiller, 'vat-whisky');
    expect(res.ok, JSON.stringify(res)).toBe(true);

    const out = res.output as Stuff;
    const payload = BulkableApi.slotFor(out, undefined)!.getPayload();
    const dose = payload?.dissolvedToxins?.find((t) => t.type === 'methanol');
    expect(dose, 'the blend must carry a dose').toBeDefined();
    expect(dose!.amount).toBeCloseTo(198, 6);
  });

  it('dilutes a one-sided dose rather than keeping it at strength', async () => {
    // The same arithmetic read the other way: the clean side has no tag
    // at all, so the malt's dose is spread over the whole 0.75 L.
    //   435 × 0.3 / 0.75 = 174
    await sourceBottle(MALT_MAT, 0.3, {
      dissolvedToxins: [{ type: 'methanol', amount: 435 }],
    });
    await sourceBottle(GRAIN_MAT, 0.45, {});

    const res = await craftAs(distiller, 'vat-whisky');
    expect(res.ok).toBe(true);
    const payload = BulkableApi.slotFor(res.output as Stuff, undefined)!.getPayload();
    expect(
      payload?.dissolvedToxins?.find((t) => t.type === 'methanol')?.amount,
    ).toBeCloseTo(174, 6);
  });

  it('blends the aromatics by volume too — the blender dilutes the smoke', async () => {
    // ⭐ The same fold, and the reason a blender does it: 0.3 L of
    // heavily-peated malt at 30 mg/L into 0.45 L of clean grain reads
    //   30 × 0.3 / 0.75 = 12 mg/L — fainter, and still unmistakably peated.
    await sourceBottle(MALT_MAT, 0.3, {
      dissolvedAromatics: [{ type: 'smoke', amount: 30 }],
    });
    await sourceBottle(GRAIN_MAT, 0.45, {});

    const res = await craftAs(distiller, 'vat-whisky');
    expect(res.ok).toBe(true);
    const payload = BulkableApi.slotFor(res.output as Stuff, undefined)!.getPayload();
    expect(
      payload?.dissolvedAromatics?.find((t) => t.type === 'smoke')?.amount,
    ).toBeCloseTo(12, 6);
  });

  it('leaves a clean blend of clean inputs with no payload domains at all', async () => {
    // ⚠ Byte-identical to a pre-W0 output: no empty arrays left behind.
    await sourceBottle(MALT_MAT, 0.3, {});
    await sourceBottle(GRAIN_MAT, 0.45, {});

    const res = await craftAs(distiller, 'vat-whisky');
    expect(res.ok).toBe(true);
    const payload = BulkableApi.slotFor(res.output as Stuff, undefined)!.getPayload();
    expect(payload?.dissolvedToxins).toBeUndefined();
    expect(payload?.dissolvedAromatics).toBeUndefined();
  });

  it('stamps the recipe appearance on an authored-material output', async () => {
    // ⚠ This branch ignored `outputAppearance` entirely, so 22 shipped
    // recipes authored prose that never rendered — including
    // `crush-comb` and `spin-comb`, two recipes for ONE honey material
    // whose whole difference is how the honey looks.
    await sourceBottle(MALT_MAT, 0.3, {});
    await sourceBottle(GRAIN_MAT, 0.45, {});

    const res = await craftAs(distiller, 'vat-whisky');
    expect(res.ok).toBe(true);
    const payload = BulkableApi.slotFor(res.output as Stuff, undefined)!.getPayload();
    expect(payload?.appearance).toBe('a deep amber blended whisky');
  });

  it('still names the maker — the identity stamp is not displaced', async () => {
    await sourceBottle(MALT_MAT, 0.3, {});
    await sourceBottle(GRAIN_MAT, 0.45, {});
    const res = await craftAs(distiller, 'vat-whisky');
    expect(res.ok).toBe(true);
    const payload = BulkableApi.slotFor(res.output as Stuff, undefined)!.getPayload();
    expect(payload?.maker).toBeTruthy();
  });
});

describe('Recipe.imparts — what the working itself adds', () => {
  beforeEach(async () => {
    store.recipes!.push({
      recipeId: 'vat-smoked',
      name: 'Smoked Vatting',
      keywords: ['vat-smoked'],
      inputSlots: [
        { slot: 'malt', category: 'malt-whisky', minGrade: 'poor', measureL: 0.3 },
        { slot: 'grain', category: 'grain-whisky', minGrade: 'poor', measureL: 0.45 },
      ],
      toolCapabilities: ['vat'],
      outputApplication: 'bulk',
      outputTemplate: BOTTLE,
      outputMaterial: BLEND_MAT,
      imparts: [{ type: 'smoke', amount: 30 }],
      baseGradeBand: '',
    });
    // ⚠ Re-warm the SAME catalogue — a second one at the same path makes
    // `findByTemplatePath` throw on a singleton it finds twice.
    await catalogue.warm();
  });

  it('adds its figure at full strength, NOT volume-weighted', async () => {
    // ⭐ The distinction between blending and imparting. `imparts` is the
    // concentration in the OUTPUT, so 30 means 30 however much you made
    // — a kiln does not dilute its own smoke.
    await sourceBottle(MALT_MAT, 0.3, {});
    await sourceBottle(GRAIN_MAT, 0.45, {});
    const res = await craftAs(distiller, 'vat-smoked');
    expect(res.ok).toBe(true);
    const payload = BulkableApi.slotFor(res.output as Stuff, undefined)!.getPayload();
    expect(
      payload?.dissolvedAromatics?.find((t) => t.type === 'smoke')?.amount,
    ).toBeCloseTo(30, 6);
  });

  it('adds ON TOP of what the inputs already carried', async () => {
    // Inputs fold to 30 × 0.3 / 0.75 = 12; the working adds 30 → 42.
    await sourceBottle(MALT_MAT, 0.3, {
      dissolvedAromatics: [{ type: 'smoke', amount: 30 }],
    });
    await sourceBottle(GRAIN_MAT, 0.45, {});
    const res = await craftAs(distiller, 'vat-smoked');
    expect(res.ok).toBe(true);
    const payload = BulkableApi.slotFor(res.output as Stuff, undefined)!.getPayload();
    expect(
      payload?.dissolvedAromatics?.find((t) => t.type === 'smoke')?.amount,
    ).toBeCloseTo(42, 6);
  });
});
