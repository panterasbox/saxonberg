/**
 * CraftingLogic — a part's OWN state rides its line (repair W0: D1, D2,
 * D3, D18). A worn, honed, named, mended part fitted into a whole carries
 * its wear, edge, name and mends in; minted back out, it carries them away
 * again — never forced sound, never a self-record on the loose part. And
 * the trade a line is mended under is derivable from what the world holds.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CraftingApi } from '../../../../api/crafting';
import type { CraftOutcome, FitOutcome, SalvageOutcome } from '../../../../api/crafting';
import { StuffApi } from '../../../../api/stuff';
import { MixinApi } from '../../../../api/mixin';
import { ContainmentApi } from '../../../../api/containment';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { WorldClockApi } from '../../../../api/worldclock';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Quantity } from '../../../../lib/quantity';
import Material from '../../../../lib/material/Material';
import Good from '../../../../lib/stuff/Good';
import { AssembledMixin } from '../../../../lib/craft/Assembled';
import { KeenMixin } from '../../../../lib/material/Keen';
import { CraftedMixin } from '../../../../lib/craft/Crafted';
import { DurableMixin } from '../../../../lib/material/Durable';
import type { MendRecord } from '../../../../lib/material/Durable';
import { ConstructedMixin } from '../../../../lib/material/Constructed';
import { NamedMixin } from '../../../../lib/description/Named';
import RecipeCatalogue from '../../RecipeCatalogue';
import JointCatalogue from '../../JointCatalogue';
import { Template } from '../../../../lib/stuff/Template';
import { Idea } from '../../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ThermalMixin } from '../../../../lib/thermal/Thermal';
import { TemplatePaths } from '../../../../lib/paths';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

/** A family-shaped part: an edge, a name seat, mends, a recipe mark. */
class TestPart extends AssembledMixin(
  NamedMixin(KeenMixin(CraftedMixin(DurableMixin(ConstructedMixin(Good))))),
) {
  static _mixinName = 'TestPartState';
}
/** A pail's shape: assembled, durable, never named. */
class TestPail extends AssembledMixin(DurableMixin(Good)) {}

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoomPartState';
}
class TestSmith extends ThermalMixin(ContainerMixin(ContainableMixin(Idea))) {
  static _mixinName = 'TestSmithPartState';
}

const IRON = '/stuff/idea/material/_test/ps-iron';
const ASH = '/stuff/idea/material/_test/ps-ash';
const AXE = '/x/thing/axe';
const HEAD = '/x/thing/axe-head';
const HAFT = '/x/thing/axe-haft';

let room: TestRoom;
let smith: TestSmith;

function registerMaterial(path: string, name: string, tags: string[]): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setHardness(Quantity.of(tags.includes('metal') ? 600 : 40, 'MPa'));
    m.setToughness(Quantity.of(tags.includes('metal') ? 200 : 60, 'MJ/m³'));
    return m;
  }, path);
}

function part(path: string, material: string, keywords: string[], form = ''): TestPart {
  const t = makeStuff(() => new TestPart());
  t.setMaterial(StuffApi.findByTemplatePath<Material>(material) as unknown as Material);
  t.setMass(Quantity.of(1, 'kg'));
  t.setKeywords(keywords);
  if (form) t.setConstructionForm(form);
  (t as unknown as { _stampTemplatePath?(p: string): void });
  return t;
}

function axeRow(): TestPart {
  const t = makeStuff(() => new TestPart());
  t.setKeywords(['axe']);
  t.setBill({
    parts: [
      { part: 'head', template: HEAD, count: 1, role: 'structural', material: IRON, form: 'bladed' },
      { part: 'haft', template: HAFT, count: 1, role: 'structural', material: ASH },
    ],
    joints: [{ key: 'hafting', method: 'wedged', members: ['head', 'haft'] }],
  });
  return t;
}

const MEND: MendRecord = {
  at: 500,
  by: '/x/agent/berta',
  byName: 'Berta',
  band: 'expert',
  discipline: 'smithing',
  kind: 'mended',
  result: 'sound',
};

function as<T>(fn: () => Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(smith);
    return fn();
  }) as unknown as Promise<T>;
}

async function makeAxe(): Promise<TestPart> {
  ContainmentApi.move(part(HEAD, IRON, ['axe-head', 'head'], 'bladed'), smith);
  ContainmentApi.move(part(HAFT, ASH, ['axe-haft', 'haft']), smith);
  const out = await as<CraftOutcome>(() =>
    CraftingApi.craft({ recipeRef: 'axe', makerMode: 'self' }),
  );
  if (!out.ok) throw new Error(`craft declined: ${JSON.stringify(out)}`);
  return out.output as unknown as TestPart;
}

let recipes: Record<string, unknown>[];

beforeEach(async () => {
  StuffApi.clearAll();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(async (col: string, query: Record<string, unknown>) => {
    if (col === 'documents' && query.kind === 'recipe') {
      return recipes.map((d) => ({
        path: `/x/recipes/${String(d.recipeId)}`,
        owner: '/x',
        kind: 'recipe',
        data: d,
      })) as never;
    }
    return [] as never;
  });
  WorldClockApi._setNowProviderForTesting(() => 1000);
  registerMaterial(IRON, 'iron', ['metal']);
  registerMaterial(ASH, 'ash', ['wood']);
  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    if (path === AXE) return axeRow() as never;
    if (path === HEAD) return part(HEAD, IRON, ['axe-head', 'head'], 'bladed') as never;
    if (path === HAFT) return part(HAFT, ASH, ['axe-haft', 'haft']) as never;
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
    if (p === HAFT || p === HEAD) return { path: p, class: '/x/TestPart', data: { mass: 1 } } as never;
    if (p === AXE) return { path: p, class: '/x/TestPart', data: { bill: axeRow().getBill() } } as never;
    return null as never;
  });
  makeStuffAtPath(() => new JointCatalogue(), TemplatePaths.jointCatalogue);
  recipes = [
    {
      recipeId: 'axe',
      name: 'axe',
      keywords: ['axe'],
      discipline: 'carpentry',
      inputSlots: [
        { slot: 'head', category: 'metal', minGrade: 'poor', kind: 'item', count: 1 },
        { slot: 'haft', category: 'wood', minGrade: 'poor', kind: 'item', count: 1 },
      ],
      toolCapabilities: [],
      outputTemplate: AXE,
      outputMaterial: '',
      outputApplication: 'tangible',
    },
    {
      recipeId: 'axe-head',
      name: 'axe head',
      keywords: ['axe-head'],
      discipline: 'smithing',
      inputSlots: [{ slot: 'stock', category: 'metal', minGrade: 'poor', kind: 'item', count: 1 }],
      toolCapabilities: [],
      outputTemplate: HEAD,
      outputMaterial: '',
      outputApplication: 'tangible',
    },
  ];
  await makeStuffAtPath(() => new RecipeCatalogue(), '/platform/idea/RecipeCatalogue').warm();
  room = makeStuff(() => new TestRoom());
  smith = makeStuff(() => new TestSmith());
  ContainmentApi.move(smith, room);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('repair W0 — a part carries its own state in and out of a whole', () => {
  it('⭐ the recipe index answers which recipe MAKES a row (D1)', () => {
    const cat = StuffApi.findByTemplatePath<RecipeCatalogue>('/platform/idea/RecipeCatalogue')!;
    expect(cat.recipeFor(HEAD)?.getRecipeId()).toBe('axe-head');
    expect(cat.recipeFor(HEAD)?.getDiscipline()).toBe('smithing');
    expect(cat.recipeFor('/x/thing/nothing-makes-this')).toBeNull();
  });

  it('⭐⭐ a worn, dulled, named, mended head fitted in reads the same on the line, and minted out again', async () => {
    const axe = await makeAxe();
    const head = part(HEAD, IRON, ['axe-head', 'head'], 'bladed');
    head.setCondition(0.4);
    head.setKeenness(0.3);
    head.setName('Brightwater');
    head.recordMend(MEND);
    head.setRecipe('axe-head');
    ContainmentApi.move(head, smith);
    const fitted = await as<FitOutcome>(() => CraftingApi.fit({ part: head, whole: axe }));
    expect(fitted).toMatchObject({ ok: true, arm: 'replace', part: 'head' });
    const line = axe.getLine('head')!;
    expect(line.condition).toBeCloseTo(0.4, 9);
    expect(line.keenness).toBeCloseTo(0.3, 9);
    expect(line.name).toBe('Brightwater');
    expect(line.mends).toEqual([MEND]);
    expect(line.recipe).toBe('axe-head');
    // The whole bears the name and the edge of its part.
    expect(axe.getName()).toBe('Brightwater');
    expect(axe.getKeenness()).toBeCloseTo(0.3, 9);
    expect(axe.getMends()).toEqual([MEND]);

    // Taken apart, the head carries all of it away.
    const out = await as<SalvageOutcome>(() => CraftingApi.salvage({ item: axe }));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const back = out.outputs.find((o) => (o as TestPart).hasKeyword('head')) as TestPart;
    expect(back).toBeDefined();
    expect(back.getCondition()).toBeCloseTo(0.4, 9);
    expect(back.getKeenness()).toBeCloseTo(0.3, 9);
    expect(back.getName()).toBe('Brightwater');
    expect(back.getMends()).toEqual([MEND]);
    expect(back.getRecipe()).toBe('axe-head');
    // ⛔ never a self-record on a loose part
    expect(back.isOnePiece()).toBe(true);
  });

  it('⭐ a crafted whole is NAMELESS — the bill\'s found-default name is never read by the mint', async () => {
    const axe = await makeAxe();
    expect(axe.getName()).toBe('');
    expect(axe.getLine('head')!.form).toBe('bladed');
  });

  it('⭐ the whole\'s edge is its edged part\'s: hone and dull route to the line (D3)', async () => {
    const axe = await makeAxe();
    expect(axe.edgedLines().map((l) => l.part)).toEqual(['head']);
    axe.dull(0.5);
    expect(axe.lineKeenness('head')).toBeCloseTo(0.5, 9);
    expect(axe.lineKeenness('haft')).toBe(1);
    expect(axe.getKeennessBand()).toBe('dulled');
    axe.hone();
    expect(axe.getKeenness()).toBe(1);
  });

  it('⭐ a FOUND thing reads its bill\'s form and name — the heirloom shape (D18)', () => {
    const found = makeStuff(() => new TestPart());
    found.setBill({
      parts: [
        { part: 'blade', template: HEAD, count: 1, role: 'structural', material: IRON, form: 'bladed', name: 'Brightwater' },
        { part: 'grip', template: HAFT, count: 1, role: 'structural', material: ASH },
      ],
    });
    found.setShortDescription('an old sword');
    expect(found.getName()).toBe('Brightwater');
    // The name is `Named`'s, so it is the presentation — which is what a
    // typed `Brightwater` binds against (the scope walk scores the name).
    expect(MixinApi.isNamed(found)).toBe(true);
    expect(found.getPresentation()).toBe('Brightwater');
    expect(found.edgedLines().map((l) => l.part)).toEqual(['blade']);
  });

  it('⭐ a thing with no bill is ONE piece, says so, and keeps its name on itself', () => {
    const knife = makeStuff(() => new TestPart());
    knife.setShortDescription('a knife');
    expect(knife.isOnePiece()).toBe(true);
    expect(knife.getParts()).toEqual([]);
    expect(knife.getMarkupLong(knife)).toMatch(/It is one piece\./);
    knife.setName('Sting');
    expect(knife.getName()).toBe('Sting');
    expect(knife.getPresentation()).toBe('Sting');
    expect(MixinApi.isAssembled(knife)).toBe(true);
  });

  it('⚠⚠ restoring the host\'s own empty name never wipes the PART\'s — the restart that lost Brightwater', () => {
    // The Hydrator restores `Named.name` through `setName`. A sword whose
    // name lives in its blade saves its own field as '' — and restoring
    // that '' used to clear the blade's name on every restart.
    const found = makeStuff(() => new TestPart());
    found.setBill({
      parts: [
        { part: 'blade', template: HEAD, count: 1, role: 'structural', material: IRON, form: 'bladed', name: 'Brightwater' },
        { part: 'grip', template: HAFT, count: 1, role: 'structural', material: ASH },
      ],
    });
    found.ensureParts();
    found.setName(''); // as the restore applies the saved own field
    expect(found.getName()).toBe('Brightwater');
    expect(found.getLine('blade')!.name).toBe('Brightwater');
  });

  it('⚠ a host that does not compose Named bears no name, and naming it is a no-op', () => {
    const pail = makeStuff(() => new TestPail());
    pail.setName('Bucket Bess');
    expect(pail.getName()).toBe('');
    expect(MixinApi.isNamed(pail)).toBe(false);
  });
});
