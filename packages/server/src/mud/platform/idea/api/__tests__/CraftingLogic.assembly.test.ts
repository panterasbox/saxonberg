/**
 * CraftingLogic — assembly (D3, D5, D6): the mint keeps its inputs'
 * identity, and the three lifecycle verbs read it.
 *
 * The pick walk, through the real Api: make a pick from a head and a haft
 * → the record says which input became which part → a jar splits the haft
 * → `repair` refuses NAMING the haft → `fit` a new haft keeps the head and
 * records both hands → `salvage` takes it apart by its joint and gives the
 * head back whole. And the joint half: a slack joint is tightened by
 * `repair`, consuming nothing.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CraftingApi } from '../../../../api/crafting';
import type {
  CraftOutcome,
  FitOutcome,
  RepairOutcome,
  SalvageOutcome,
} from '../../../../api/crafting';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { WorldClockApi } from '../../../../api/worldclock';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Quantity } from '../../../../lib/quantity';
import Material from '../../../../lib/material/Material';
import Scrap from '../../../thing/Scrap';
import Casting from '../../../thing/Casting';
import Tool from '../../../thing/Tool';
import Timber from '../../../thing/Timber';
import RecipeCatalogue from '../../RecipeCatalogue';
import JointCatalogue from '../../JointCatalogue';
import { Template } from '../../../../lib/stuff/Template';
import { Idea } from '../../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ThermalMixin } from '../../../../lib/thermal/Thermal';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { TemplatePaths } from '../../../../lib/paths';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoomAssembly';
}
class TestSmith extends ThermalMixin(ContainerMixin(ContainableMixin(Idea))) {
  static _mixinName = 'TestSmithAssembly';
}

const IRON = '/stuff/idea/material/_test/as-iron';
const ASH = '/stuff/idea/material/_test/as-ash';
const PICK = '/x/thing/pick';
const HEAD = '/x/thing/pick-head';
const HAFT = '/x/thing/pick-haft';

let store: Record<string, Record<string, unknown>[]>;
let room: TestRoom;
let smith: TestSmith;

function registerMaterial(path: string, name: string, tags: string[], h: number, t: number): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setHardness(Quantity.of(h, 'MPa'));
    m.setToughness(Quantity.of(t, 'MJ/m³'));
    return m;
  }, path);
}

function mat(path: string): Material {
  return StuffApi.findByTemplatePath<Material>(path) as unknown as Material;
}

function part(material: string, keywords: string[], massKg: number): Tool {
  const t = makeStuff(() => new Tool());
  t.setMaterial(mat(material));
  t.setMass(Quantity.of(massKg, 'kg'));
  t.setKeywords(keywords);
  return t;
}

function pickRow(): Tool {
  const t = makeStuff(() => new Tool());
  t.setKeywords(['pick']);
  t.setBill({
    parts: [
      { part: 'head', template: HEAD, count: 1, role: 'structural', material: IRON },
      { part: 'haft', template: HAFT, count: 1, role: 'structural', material: ASH },
    ],
    joints: [{ key: 'hafting', method: 'wedged', members: ['head', 'haft'] }],
  });
  return t;
}

function as<T>(fn: () => Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(smith);
    return fn();
  }) as unknown as Promise<T>;
}

async function makePick(): Promise<Tool> {
  ContainmentApi.move(part(IRON, ['pick-head', 'head'], 1.8), smith);
  ContainmentApi.move(part(ASH, ['pick-haft', 'haft'], 0.8), smith);
  const out = await as<CraftOutcome>(() =>
    CraftingApi.craft({ recipeRef: 'pick', makerMode: 'self' }),
  );
  if (!out.ok) throw new Error(`craft declined: ${JSON.stringify(out)}`);
  return out.output as unknown as Tool;
}

beforeEach(async () => {
  store = { recipes: [] };
  StuffApi.clearAll();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(async (col: string, query: Record<string, unknown>) => {
    if (col === 'documents' && query.kind === 'recipe') {
      return (store['recipes'] ?? []).map((d) => ({
        path: `/x/recipes/${String(d.recipeId)}`,
        owner: '/x',
        kind: 'recipe',
        data: d,
      })) as never;
    }
    return [] as never;
  });
  WorldClockApi._setNowProviderForTesting(() => 1000);
  registerMaterial(IRON, 'iron', ['metal', 'ferrous'], 600, 200);
  registerMaterial(ASH, 'ash', ['wood', 'organic'], 40, 60);

  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    if (path === PICK) return pickRow() as never;
    if (path === HEAD) return part(IRON, ['pick-head', 'head'], 1.8) as never;
    if (path === HAFT) return part(ASH, ['pick-haft', 'haft'], 0.8) as never;
    if (path === '/stuff/thing/Scrap') return makeStuff(() => new Scrap()) as never;
    if (path === '/stuff/thing/Casting') return makeStuff(() => new Casting()) as never;
    throw new Error(`unexpected clone ${path}`);
  });
  vi.spyOn(Template, 'findByClass').mockImplementation(async (cls: string) =>
    cls === '/platform/idea/Joint'
      ? ([
          {
            path: '/platform/idea/Joint/wedged',
            class: cls,
            data: {
              key: 'wedged',
              portability: 'hand',
              competence: null,
              reversible: 'effort',
              strength: 0.6,
              structuralRecovery: 1,
              fastenerRecovery: 0,
              tightenable: true,
              failure: 'parted',
            },
          },
        ] as never)
      : ([] as never),
  );
  vi.spyOn(Template, 'findByPath').mockImplementation(async (p: string) => {
    if (p === HAFT) return { path: p, class: '/platform/thing/Tool', data: { mass: 0.8 } } as never;
    if (p === PICK) return { path: p, class: '/platform/thing/Tool', data: { bill: pickRow().getBill() } } as never;
    return null as never;
  });
  makeStuffAtPath(() => new JointCatalogue(), TemplatePaths.jointCatalogue);

  store.recipes!.push({
    recipeId: 'pick',
    name: 'pick',
    keywords: ['pick'],
    inputSlots: [
      { slot: 'head', category: 'metal', minGrade: 'poor', kind: 'item', count: 1 },
      { slot: 'haft', category: 'wood', minGrade: 'poor', kind: 'item', count: 1 },
    ],
    toolCapabilities: [],
    outputTemplate: PICK,
    outputMaterial: '',
    outputApplication: 'tangible',
  });
  await makeStuffAtPath(() => new RecipeCatalogue(), '/platform/idea/RecipeCatalogue').warm();

  room = makeStuff(() => new TestRoom());
  smith = makeStuff(() => new TestSmith());
  ContainmentApi.move(smith, room);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('CraftingLogic — assembly', () => {
  it('⭐ the mint keeps which input became which part, and lands the pick in hand', async () => {
    const pick = await makePick();
    expect(pick.getContainer()).toBe(smith);
    const parts = pick.getParts();
    expect(parts.map((l) => [l.part, l.material])).toEqual([
      ['head', IRON],
      ['haft', ASH],
    ]);
    expect(pick.getJoints()).toMatchObject([{ key: 'hafting', method: 'wedged', tension: 1 }]);
    // One material and one mass, as before — the flatten still holds for the WHOLE.
    expect(pick.getMass().rawValue()).toBeCloseTo(2.6, 6);
  });

  it('⭐ a pick on a TIMBER haft (riven, seasoned) still reads what it is made of', async () => {
    ContainmentApi.move(part(IRON, ['pick-head', 'head'], 1.8), smith);
    const haft = makeStuff(() => new Timber());
    haft.setMaterial(mat(ASH));
    haft.setMass(Quantity.of(0.8, 'kg'));
    haft.setKeywords(['pick-haft', 'haft']);
    haft.setConstructionForm('riven');
    haft.setSeasonedFraction(1);
    ContainmentApi.move(haft, smith);
    const out = await as<CraftOutcome>(() =>
      CraftingApi.craft({ recipeRef: 'pick', makerMode: 'self' }),
    );
    expect(out.ok, JSON.stringify(out)).toBe(true);
    const pick = (out as unknown as { output: Tool }).output;
    expect(pick.getParts().map((l) => l.part)).toEqual(['head', 'haft']);
    expect(pick.getMarkupLong(smith)).toMatch(/made of/);
  });

  it('⭐⭐ a jar splits the HAFT; repair refuses naming it; fit replaces just it', async () => {
    const pick = await makePick();
    for (let i = 0; i < 12; i++) pick.wear(0.1, 'shock');
    expect(pick.failedLines().map((l) => l.part)).toEqual(['haft']);

    const refused = await as<RepairOutcome>(() => CraftingApi.repair({ item: pick }));
    expect(refused).toMatchObject({ ok: false, reason: 'part-failed', detail: 'haft' });

    const fresh = part(ASH, ['pick-haft', 'haft'], 0.8);
    ContainmentApi.move(fresh, smith);
    const fitted = await as<FitOutcome>(() => CraftingApi.fit({ part: fresh, whole: pick }));
    expect(fitted).toMatchObject({ ok: true, arm: 'replace', part: 'haft', replaced: 1, returned: null });
    expect(fresh.isDestroyed()).toBe(true);
    expect(pick.isBroken()).toBe(false);
    expect(pick.getLine('head')!.failed).toBe(0);
    expect(pick.getLine('haft')!.condition).toBe(1);
  });

  it('⭐ fit refuses a thing of ONE piece — there is no line in it (repair D4)', async () => {
    const whetstone = part(ASH, ['whetstone'], 0.3);
    const haft = part(ASH, ['pick-haft', 'haft'], 0.8);
    ContainmentApi.move(haft, smith);
    const out = await as<FitOutcome>(() => CraftingApi.fit({ part: haft, whole: whetstone }));
    expect(out).toMatchObject({ ok: false, reason: 'no-line', detail: 'one-piece' });
    expect(haft.isDestroyed()).toBe(false);
  });

  it('⭐ a slack joint is TIGHTENED by repair — consuming nothing', async () => {
    const pick = await makePick();
    pick.slackenJoint('hafting', 0.7);
    const out = await as<RepairOutcome>(() => CraftingApi.repair({ item: pick }));
    expect(out).toMatchObject({ ok: true, rung: 'tightened', costKg: 0, named: 'hafting' });
    expect(pick.slackJoints()).toEqual([]);
  });

  it('⭐ salvage takes it apart BY ITS JOINT: the head comes back whole', async () => {
    const pick = await makePick();
    const out = await as<SalvageOutcome>(() => CraftingApi.salvage({ item: pick }));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.recoveredParts).toEqual([
      { part: 'head', count: 1, of: 1 },
      { part: 'haft', count: 1, of: 1 },
    ]);
    const heads = out.outputs.filter((o) => (o as Stuff & { hasKeyword?(k: string): boolean }).hasKeyword?.('head'));
    expect(heads).toHaveLength(1);
    expect(out.recoveredKg).toBeLessThanOrEqual(2.6 + 1e-9);
  });

  it('a split haft does not come back — it goes down the melt-down by mass', async () => {
    const pick = await makePick();
    for (let i = 0; i < 12; i++) pick.wear(0.1, 'shock');
    const out = await as<SalvageOutcome>(() => CraftingApi.salvage({ item: pick }));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.recoveredParts).toEqual([
      { part: 'head', count: 1, of: 1 },
      { part: 'haft', count: 0, of: 1 },
    ]);
  });
});

describe('⭐ the grain rides the carve — no act raises integrity', () => {
  const CARVED = '/x/thing/carved-haft';
  const RAIL = '/x/thing/hewn-rail';
  function timber(form: string, keywords: string[], kg = 1): Timber {
    const t = makeStuff(() => new Timber());
    t.setMaterial(mat(ASH));
    t.setMass(Quantity.of(kg, 'kg'));
    t.setKeywords(keywords);
    t.setConstructionForm(form);
    t.setSeasonedFraction(1);
    return t;
  }
  beforeEach(async () => {
    const clone = StuffApi.clone as unknown as { getMockImplementation(): (p: string) => unknown };
    const prior = clone.getMockImplementation();
    vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
      // The rows: a haft authored riven, a rail authored hewn.
      // The part row is a fifth of the stock it is carved from.
      if (path === CARVED) return timber('riven', ['carved-haft'], 0.2) as never;
      if (path === RAIL) return timber('hewn', ['hewn-rail']) as never;
      return prior(path) as never;
    });
    for (const [id, out] of [['carved-haft', CARVED], ['hewn-rail', RAIL]] as const) {
      store.recipes!.push({
        recipeId: id,
        name: id,
        keywords: [id],
        inputSlots: [{ slot: 'stock', category: 'wood', minGrade: 'poor', kind: 'item', count: 1 }],
        toolCapabilities: [],
        outputTemplate: out,
        outputMaterial: '',
        outputApplication: 'tangible',
      });
    }
    await StuffApi.findByTemplatePath<RecipeCatalogue>('/platform/idea/RecipeCatalogue')!.warm();
  });

  async function carve(recipe: string, stockForm: string): Promise<Timber> {
    ContainmentApi.move(timber(stockForm, ['stock', 'board']), smith);
    const out = await as<CraftOutcome>(() => CraftingApi.craft({ recipeRef: recipe, makerMode: 'self' }));
    if (!out.ok) throw new Error(JSON.stringify(out));
    return out.output as unknown as Timber;
  }

  it('⭐ a haft carved from a SAWN board is sawn — the saw cut the fibres', async () => {
    expect((await carve('carved-haft', 'sawn')).getConstructionForm()).toBe('sawn');
  });
  it('⭐ a CARVING is the stock cut down — its row\'s size, the rest shavings (the browser walk)', async () => {
    ContainmentApi.move(timber('sawn', ['stock', 'board']), smith);
    const carved = await as<CraftOutcome>(() =>
      CraftingApi.craft({ recipeRef: 'carved-haft', makerMode: 'self', subtractive: true }),
    );
    if (!carved.ok) throw new Error(JSON.stringify(carved));
    expect((carved.output as unknown as Timber).getMass().rawValue()).toBeCloseTo(0.2, 6);
  });

  it('…and an ordinary transform still conserves what went in', async () => {
    expect((await carve('carved-haft', 'sawn')).getMass().rawValue()).toBeCloseTo(1, 6);
  });

  it('a haft carved from a riven blank is riven, as its row says', async () => {
    expect((await carve('carved-haft', 'riven')).getConstructionForm()).toBe('riven');
  });
  it('a rail hewn from a riven blank is hewn — the row can lower it', async () => {
    expect((await carve('hewn-rail', 'riven')).getConstructionForm()).toBe('hewn');
  });
  it('…and a rail from a sawn board is sawn — the input cannot be raised', async () => {
    expect((await carve('hewn-rail', 'sawn')).getConstructionForm()).toBe('sawn');
  });
});

describe('⭐ fit matches a part to a line by ROW LINEAGE — a quartered board is a board', () => {
  const BETTER = '/x/thing/better-haft';
  it('a part whose row extends the line\'s row fits it, whatever it is called', async () => {
    const findByPath = Template.findByPath as unknown as { getMockImplementation(): (p: string) => unknown };
    const prior = findByPath.getMockImplementation();
    vi.spyOn(Template, 'findByPath').mockImplementation(async (p: string) =>
      p === BETTER ? ({ path: p, class: '/platform/thing/Tool', extends: HAFT, data: {} } as never) : (prior(p) as never),
    );
    const pick = await makePick();
    const better = part(ASH, ['spare'], 0.8); // not called "haft"
    stampTemplatePathForTest(better, BETTER);
    ContainmentApi.move(better, smith);
    const out = await as<FitOutcome>(() => CraftingApi.fit({ part: better, whole: pick }));
    expect(out.ok, JSON.stringify(out)).toBe(true);
  });

  it('an unrelated row that is not called by the part\'s name does not fit', async () => {
    const pick = await makePick();
    const stray = part(ASH, ['spare'], 0.8);
    stampTemplatePathForTest(stray, '/x/thing/stray');
    ContainmentApi.move(stray, smith);
    const out = await as<FitOutcome>(() => CraftingApi.fit({ part: stray, whole: pick }));
    expect(out.ok).toBe(false);
  });
});

/**
 * ⭐⭐ INTERCHANGEABLE (ceramics D27, S18): a part CAST from an impression of
 * the line's own kind is the same shape as the one it replaces, so it drops
 * into the old joint — no instrument, no band, no joint re-made. Derived
 * from the cast's provenance; nothing is authored.
 */
describe('⭐⭐ interchangeable — a part cast to the line\'s own pattern needs no new joint', () => {
  /** A wedge joint that wants an instrument nobody here has. */
  function hardJoint(): void {
    vi.spyOn(Template, 'findByClass').mockImplementation(async (cls: string) =>
      cls === '/platform/idea/Joint'
        ? ([
            {
              path: '/platform/idea/Joint/wedged',
              class: cls,
              data: {
                key: 'wedged',
                label: 'wedged',
                portability: 'hand',
                instrument: 'drift',
                competence: null,
                reversible: 'effort',
                strength: 0.6,
                structuralRecovery: 1,
                fastenerRecovery: 0,
                tightenable: true,
                failure: 'parted',
              },
            },
          ] as never)
        : ([] as never),
    );
  }

  it('a hand-made haft is refused the joint; a haft CAST from a haft\'s impression drops in', async () => {
    hardJoint();
    const pick = await makePick();
    for (let i = 0; i < 12; i++) pick.wear(0.1, 'shock');
    const carved = part(ASH, ['pick-haft', 'haft'], 0.8);
    ContainmentApi.move(carved, smith);
    const refused = await as<FitOutcome>(() => CraftingApi.fit({ part: carved, whole: pick }));
    expect(refused).toMatchObject({ ok: false, reason: 'missing-tool' });

    const cast = part(ASH, ['pick-haft', 'haft'], 0.8);
    cast.setCastFrom({ kindPath: HAFT, takenFromIdentity: '', takenAtS: 0 });
    ContainmentApi.move(cast, smith);
    const fitted = await as<FitOutcome>(() => CraftingApi.fit({ part: cast, whole: pick }));
    expect(fitted).toMatchObject({ ok: true, arm: 'replace', part: 'haft', interchangeable: true });
  });
});
