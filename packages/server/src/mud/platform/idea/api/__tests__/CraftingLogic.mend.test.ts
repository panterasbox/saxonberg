/**
 * CraftingLogic — a mend can be done BADLY (repair W2: D1, D8, D9, D10).
 *
 * Per part, under the trade that made the part, at the hand's band, by a
 * table — never rolled. An untrained mend comes back short and a grade
 * down, and again; a competent one comes back sound; two hands of one band
 * get one result; a split haft is never mended, and a worn one is mended
 * only as well as the hand's carpentry; a broken iron head is re-made at
 * its recipe's heat, and a name it bore goes with the old iron. The
 * diagnosis is the same ladder and changes nothing.
 */

import "../../../../../test-bootstrap";
import { chargeHot } from '../../../../lib/fire/__tests__/burner-fuel';
import type { Burner } from '../../../../lib/fire/Burner';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CraftingApi } from '../../../../api/crafting';
import type { RepairOutcome, DiagnoseOutcome } from '../../../../api/crafting';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { WorldClockApi } from '../../../../api/worldclock';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Quantity } from '../../../../lib/quantity';
import Material from '../../../../lib/material/Material';
import Scrap from '../../../thing/Scrap';
import Forge from '../../../thing/Forge';
import Tool from '../../../thing/Tool';
import Timber from '../../../thing/Timber';
import Ingot from '../../../thing/Ingot';
import RecipeCatalogue from '../../RecipeCatalogue';
import JointCatalogue from '../../JointCatalogue';
import { Template } from '../../../../lib/stuff/Template';
import { Idea } from '../../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ThermalMixin } from '../../../../lib/thermal/Thermal';
import { AdvancementMixin } from '../../../../lib/advancement/Advancement';
import type { CompetenceBandName } from '../../../../lib/advancement/CompetenceBand';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { TemplatePaths } from '../../../../lib/paths';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoomMend';
}
/** A hand whose bands the test sets, discipline by discipline. */
class TestHand extends ThermalMixin(ContainerMixin(ContainableMixin(AdvancementMixin(Idea)))) {
  static _mixinName = 'TestHandMend';
  public bands: Record<string, CompetenceBandName> = {};
  public override async competenceBandFor(discipline: string): Promise<CompetenceBandName> {
    return this.bands[discipline] ?? 'untrained';
  }
}

const IRON = '/stuff/idea/material/_test/md-iron';
const ASH = '/stuff/idea/material/_test/md-ash';
const PICK = '/x/thing/pick';
const HEAD = '/x/thing/pick-head';
const HAFT = '/x/thing/pick-haft';

let room: TestRoom;
let recipes: Record<string, unknown>[];

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

function mat(path: string): Material {
  return StuffApi.findByTemplatePath<Material>(path) as unknown as Material;
}

function hand(bands: Record<string, CompetenceBandName>, name: string): TestHand {
  const h = makeStuff(() => new TestHand());
  h.bands = bands;
  stampTemplatePathForTest(h, `/x/agent/${name}`);
  ContainmentApi.move(h, room);
  return h;
}

function hotForge(): Forge {
  return makeStuff(() => {
    const f = new Forge();
    f.setBurnTemperatureK(1300);
    chargeHot(f as unknown as Stuff & Burner, 40);
    return f;
  });
}

function stock(material: string, units: number): Scrap {
  const s = makeStuff(() => new Scrap());
  s.setMass(Quantity.of(0.1, 'kg'));
  s.setMaterial(mat(material));
  s.setQuantity(units);
  return s;
}

function tool(caps: string[]): Tool {
  const t = makeStuff(() => new Tool());
  t.setMaterial(mat(IRON));
  t.setMass(Quantity.of(1, 'kg'));
  t.setCapabilities(caps);
  return t;
}

/** A found pick: head + haft wedged, read off its bill at defaults. */
function pick(): Tool {
  const t = makeStuff(() => new Tool());
  t.setKeywords(['pick']);
  t.setMass(Quantity.of(2.6, 'kg'));
  (t as unknown as { setGradeBand(b: string): void }).setGradeBand('fine');
  t.setBill({
    parts: [
      { part: 'head', template: HEAD, count: 1, role: 'structural', material: IRON, name: 'Old Bess' },
      { part: 'haft', template: HAFT, count: 1, role: 'structural', material: ASH },
    ],
    joints: [{ key: 'hafting', method: 'wedged', members: ['head', 'haft'] }],
  });
  t.ensureParts();
  for (const l of t.getParts()) l.grade = 'fine';
  return t;
}

function as<T>(who: Stuff, fn: () => Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(who);
    return fn();
  }) as unknown as Promise<T>;
}

const mend = (who: Stuff, item: Stuff): Promise<RepairOutcome> =>
  as(who, () => CraftingApi.repair({ item }));

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
  registerMaterial(IRON, 'iron', ['metal', 'ferrous']);
  registerMaterial(ASH, 'ash', ['wood', 'organic']);
  vi.spyOn(Template, 'findByClass').mockImplementation(async (cls: string) =>
    cls === '/platform/idea/Joint'
      ? ([
          {
            path: '/platform/idea/Joint/wedged',
            class: cls,
            data: {
              key: 'wedged', portability: 'hand', competence: null, reversible: 'effort',
              strength: 0.6, structuralRecovery: 1, fastenerRecovery: 0, tightenable: true,
              failure: 'parted',
            },
          },
        ] as never)
      : ([] as never),
  );
  vi.spyOn(Template, 'findByPath').mockImplementation(async (p: string) => {
    if (p === HEAD) return { path: p, class: '/platform/thing/Tool', data: { mass: 1.8 } } as never;
    if (p === HAFT) return { path: p, class: '/platform/thing/Timber', data: { mass: 0.8 } } as never;
    return null as never;
  });
  makeStuffAtPath(() => new JointCatalogue(), TemplatePaths.jointCatalogue);
  const item = (slot: string, category: string) => ({ slot, category, minGrade: 'poor', kind: 'item', count: 1 });
  recipes = [
    { recipeId: 'pick', name: 'pick', keywords: ['pick'], discipline: 'mining', inputSlots: [item('head', 'metal'), item('haft', 'wood')], toolCapabilities: [], outputTemplate: PICK, outputApplication: 'tangible' },
    { recipeId: 'pick-head', name: 'pick head', keywords: ['pick-head'], discipline: 'smithing', requiresHeatK: 1200, inputSlots: [item('stock', 'metal')], toolCapabilities: ['striking', 'anvil'], outputTemplate: HEAD, outputApplication: 'tangible' },
    { recipeId: 'pick-haft', name: 'pick haft', keywords: ['pick-haft'], discipline: 'carpentry', inputSlots: [item('stock', 'wood')], toolCapabilities: ['cutting'], outputTemplate: HAFT, outputApplication: 'tangible' },
  ];
  await makeStuffAtPath(() => new RecipeCatalogue(), '/platform/idea/RecipeCatalogue').warm();
  room = makeStuff(() => new TestRoom());
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

/** A worn head in a hot smithy with iron to hand. */
function wornHead(): Tool {
  ContainmentApi.move(hotForge(), room);
  ContainmentApi.move(stock(IRON, 40), room);
  const p = pick();
  p.getLine('head')!.condition = 0.4;
  ContainmentApi.move(p, room);
  return p;
}

describe('repair W2 — the band decides, never a roll', () => {
  it('⭐⭐ AC1: an untrained mend is short and a grade down — and again; a competent one is sound', async () => {
    const p = wornHead();
    const novice = hand({}, 'nobody');
    const first = await mend(novice, p);
    expect(first.ok, JSON.stringify(first)).toBe(true);
    if (!first.ok) return;
    expect(first.mended).toEqual([
      { part: 'head', kind: 'mended', discipline: 'smithing', band: 'untrained', result: 'short' },
    ]);
    const head = p.getLine('head')!;
    expect(head.condition).toBeCloseTo(0.6, 9);
    expect(head.grade).toBe('fair');
    // An unpractised hand leaves the joint it touched just short of tight.
    expect(p.slackJoints().map((j) => j.key)).toEqual(['hafting']);
    // Again: short again, and a grade lower again — the compounding.
    await mend(novice, p);
    expect(p.getLine('head')!.grade).toBe('poor');
    expect(p.getLine('head')!.mends).toHaveLength(2);

    const q = wornHead();
    const berta = hand({ smithing: 'expert' }, 'berta');
    const good = await mend(berta, q);
    expect(good.ok && good.mended[0]!.result).toBe('sound');
    expect(q.getLine('head')!.condition).toBe(1);
    expect(q.getLine('head')!.grade).toBe('fine');
  });

  it('⭐ AC2: two hands of one band, one part — one result', async () => {
    const a = wornHead();
    const b = wornHead();
    await mend(hand({ smithing: 'novice' }, 'ann'), a);
    await mend(hand({ smithing: 'novice' }, 'bob'), b);
    const la = a.getLine('head')!;
    const lb = b.getLine('head')!;
    expect([la.condition, la.grade]).toEqual([lb.condition, lb.grade]);
    expect(la.mends![0]!.result).toBe(lb.mends![0]!.result);
  });

  it('⭐⭐ AC3: an expert smith with no carpentry mends the head sound and the haft only short', async () => {
    const p = wornHead();
    p.getLine('haft')!.condition = 0.5;
    ContainmentApi.move(tool(['cutting']), room);
    ContainmentApi.move(stock(ASH, 40), room);
    const out = await mend(hand({ smithing: 'expert' }, 'berta'), p);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const byPart = Object.fromEntries(out.mended.map((o) => [o.part, o]));
    expect(byPart.head).toMatchObject({ discipline: 'smithing', band: 'expert', result: 'sound' });
    expect(byPart.haft).toMatchObject({ discipline: 'carpentry', band: 'untrained', result: 'short' });
    expect(p.getLine('haft')!.condition).toBeLessThan(1);
  });

  it('⭐ a split haft is never mended — the head is, and the haft wants a new one', async () => {
    const p = wornHead();
    p.getLine('haft')!.failed = 1;
    const out = await mend(hand({ smithing: 'expert', carpentry: 'expert' }, 'berta'), p);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.mended.map((o) => o.part)).toEqual(['head']);
    expect(out.skipped).toEqual([{ part: 'haft', reason: 'part-failed', detail: 'haft' }]);
    // …and with nothing else to mend, it is a refusal naming the haft.
    const q = pick();
    q.getLine('haft')!.failed = 1;
    ContainmentApi.move(q, room);
    expect(await mend(hand({ carpentry: 'expert' }, 'carp'), q)).toMatchObject({
      ok: false, reason: 'part-failed', detail: 'haft',
    });
  });

  it('⭐⭐ a broken head is re-made at its RECIPE\'s heat; its name goes, and the reforger may name it once (D9, Narsil)', async () => {
    ContainmentApi.move(stock(IRON, 80), room);
    ContainmentApi.move(tool(['striking', 'anvil']), room);
    const p = pick();
    p.getLine('head')!.failed = 1;
    ContainmentApi.move(p, room);
    expect(p.getSeatName()).toBe('Old Bess');
    // A fire that mends a worn head (900 K) is not enough to re-make one (1200 K).
    const warm = makeStuff(() => {
      const f = new Forge();
      f.setBurnTemperatureK(1000);
      chargeHot(f as unknown as Stuff & Burner, 40);
      return f;
    });
    ContainmentApi.move(warm, room);
    const berta = hand({ smithing: 'expert' }, 'berta');
    expect(await mend(berta, p)).toMatchObject({ ok: false, reason: 'insufficient-heat', detail: '1200' });
    ContainmentApi.move(hotForge(), room);
    const out = await mend(berta, p);
    expect(out.ok, JSON.stringify(out)).toBe(true);
    if (!out.ok) return;
    expect(out.rung).toBe('reforged');
    expect(p.getLine('head')).toMatchObject({ failed: 0, condition: 1 });
    expect(p.getSeatName()).toBe('');
    expect(p.getNameGrant()).toBe(berta.getIdentityPath());
  });

  it('⭐ a one-piece thing is mended under its own recipe\'s trade, and remembers who', async () => {
    ContainmentApi.move(hotForge(), room);
    ContainmentApi.move(stock(IRON, 40), room);
    const head = tool([]);
    stampTemplatePathForTest(head, HEAD);
    head.setCondition(0.5);
    ContainmentApi.move(head, room);
    const out = await mend(hand({ smithing: 'novice' }, 'nell'), head);
    expect(out.ok && out.mended[0]).toMatchObject({ discipline: 'smithing', band: 'novice', result: 'short' });
    expect(head.getCondition()).toBeCloseTo(0.75, 9);
    expect(head.getMends()[0]).toMatchObject({ by: '/x/agent/nell', kind: 'mended', result: 'short' });
    expect(head.getMarkupLong(head)).toMatch(/It is worn\. It has been mended by /);
  });

  it('⭐ the diagnosis is the same ladder and changes nothing', async () => {
    const p = wornHead();
    p.getLine('haft')!.failed = 1;
    const before = JSON.stringify(p.getParts());
    const d = await as<DiagnoseOutcome>(hand({ smithing: 'expert' }, 'berta'), () =>
      CraftingApi.diagnose({ item: p }),
    );
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.faults.map((f) => [f.part, f.kind, f.mendable])).toEqual([
      ['haft', 'failed', false],
      ['head', 'worn', true],
    ]);
    expect(d.faults[1]!.stockKg).toBeGreaterThan(0);
    expect(JSON.stringify(p.getParts())).toBe(before);
  });

  it('a stave of timber keeps its wear as stack identity — a worn one never merges a sound one', () => {
    const a = makeStuff(() => new Timber());
    const b = makeStuff(() => new Timber());
    a.setCondition(0.5);
    const meta = (Timber as unknown as { fieldMeta: Record<string, { stackIdentity?: boolean }> }).fieldMeta;
    expect(meta.condition?.stackIdentity).toBe(true);
    expect(a.getCondition()).not.toBe(b.getCondition());
  });

  it('⭐ whole bars serve a mend whose need they do not divide — the overshoot is judged against the WHOLE need', async () => {
    ContainmentApi.move(hotForge(), room);
    for (let n = 0; n < 2; n++) {
      const bar = makeStuff(() => new Ingot());
      bar.setMaterial(mat(IRON));
      bar.setMass(Quantity.of(0.5, 'kg'));
      ContainmentApi.move(bar, room);
    }
    const p = pick();
    p.getLine('head')!.condition = 0.5; // 1.8 kg × 0.5 × 0.6 = 0.54 kg wanted
    ContainmentApi.move(p, room);
    const out = await mend(hand({ smithing: 'competent' }, 'cora'), p);
    expect(out.ok, JSON.stringify(out)).toBe(true);
    expect(p.getLine('head')!.condition).toBe(1);
  });
});
