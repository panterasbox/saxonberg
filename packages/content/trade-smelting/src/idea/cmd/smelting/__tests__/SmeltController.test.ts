/**
 * SmeltController — ⚠⚠ **the first test the smelt has ever had.**
 *
 * The shipped coverage (`src/__tests__/smelt.test.ts`) asserts
 * `Ore.metalFractionOf` arithmetic and scans the shipped rows; it never
 * dispatches the controller. So nothing noticed that the verb was
 * afforded by no class, that the furnace row was a bare `Forge` and
 * therefore not a `Container`, and that the controller's own guard
 * (`isFurnace && isContainer`) could not have passed against one. The
 * smelt could not have run in a booted world, and the metal chain's
 * four-business loop has never closed.
 *
 * This file dispatches it: the charge in, the bar out, the fuel gone.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SmeltController from '../SmeltController';
import SmeltingFurnace from '../../../../thing/SmeltingFurnace';
import Bloom from '../../../../thing/Bloom';
import Ore from '@saxonberg/content-trade-mining/src/thing/Ore';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Ingot from '@saxonberg/server/mud/platform/thing/Ingot';
import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { Reserve } from '@saxonberg/server/mud/lib/reserve';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import {
  TestActor,
  standUpBranchHarness,
  makeContext,
  completeStep,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

const MALACHITE = '/stuff/idea/material/mineral/malachite';
const GOETHITE = '/stuff/idea/material/mineral/goethite';
const COPPER = '/stuff/idea/material/element/copper';
const IRON = '/stuff/idea/material/element/iron';
const CARBON = '/stuff/idea/material/element/carbon';
const STEEL = '/stuff/idea/material/alloy/steel';
const CAST_IRON = '/stuff/idea/material/alloy/cast-iron';
const BLOOM_IRON = '/stuff/idea/material/alloy/bloom-iron';
const CHARCOAL_M = '/stuff/idea/material/organic/charcoal';
const LIMESTONE_M = '/stuff/idea/material/rock/limestone';
const COAL_M = '/stuff/idea/material/mineral/coal';
const SOUR_IRON = '/stuff/idea/material/alloy/sulfurous-iron';
const SOUR_ROW = '/trade/smelting/thing/hot-short-bloom';
const INGOT_ROW = '/trade/smelting/thing/copper-ingot';
const BLOOM_ROW = '/trade/smelting/thing/iron-bloom';
const STEEL_ROW = '/trade/smelting/thing/steel-ingot';
const PIG_ROW = '/trade/smelting/thing/cast-iron-pig';
const SLAG_ROW = '/trade/smelting/thing/slag';

/**
 * The product rows, as the smelt discovers them: by `_materialPath`,
 * under the trade's own `thing/` namespace. ⚠ The fixture mirrors the
 * shipped rows rather than reaching for them, because the LOOKUP is what
 * is under test — an author adds tin by authoring a row, and this is the
 * seam that has to keep being true when they do.
 */
const PRODUCT_ROWS: ReadonlyArray<[string, string]> = [
  [INGOT_ROW, COPPER],
  [BLOOM_ROW, BLOOM_IRON],
  [STEEL_ROW, STEEL],
  [PIG_ROW, CAST_IRON],
  // ⚠ The coal outcome (extraction build) — discovered by material like
  // every other product, never listed anywhere in the controller.
  [SOUR_ROW, SOUR_IRON],
];

let seq = 0;
let templateRows: Array<Record<string, unknown>> = [];
let room: TestActor;
let actor: TestActor;
let furnace: SmeltingFurnace;

/** An ore lot: `count` lumps of `kgEach` at `grade`, of `mineral`. */
function lump(kgEach: number, count: number, grade: number, mineral = MALACHITE): Ore {
  const o = makeStuff(() => new Ore());
  stampTemplatePathForTest(
    o,
    mineral === MALACHITE
      ? '/world/terminus/rejection/thing/copper-ore'
      : '/world/terminus/rejection/thing/iron-ore',
  );
  o.setQuantity(count);
  o.setGrade(grade);
  (o as unknown as { _materialPath: string })._materialPath = mineral;
  o.setMass(Quantity.of(kgEach, 'kg'));
  return o;
}

/** A bar of metal stock going back into the fire to carburize. */
function bar(materialPath: string, kg = 0.5, carbon = 0): Ingot {
  const i = makeStuff(() => new Ingot());
  i.setMaterial(StuffApi.findByTemplatePath<Material>(materialPath) as Material);
  i.setMass(Quantity.of(kg, 'kg'));
  if (carbon > 0) i.setFractionOf(CARBON, carbon);
  return i;
}

/** A basket of charcoal — a Tangible whose material is fuel + carbon. */
function basket(): Thing {
  const b = makeStuff(() => new Thing());
  b.setMass(Quantity.of(8, 'kg'));
  b.setMaterial(
    StuffApi.findByTemplatePath<Material>(CHARCOAL_M) as unknown as Material,
  );
  return b;
}

/**
 * A lit smelting furnace at charcoal heat, standing in the room.
 *
 * ⚠ The numbers are Rejection's own, and they are the design: 1420 K on
 * charcoal alone (melts copper, will not reduce iron) and 1590 K with
 * the bellows (reduces iron, below iron's 1811 K melting point, above
 * the 1420 K eutectic). A fixture that kept the old 1.5 multiplier would
 * hold 2130 K and every ferrous run would pour — which is exactly the
 * bug the retune fixes, so the fixture must not paper over it.
 */
function makeFurnace(bellows: boolean): SmeltingFurnace {
  return makeStuff(() => {
    const f = new SmeltingFurnace();
    f.setBurnTemperatureK(1420);
    f.setBellowsMultiplier(1.12);
    f.setReserve(
      new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null),
    );
    f.setBellowsActive(bellows);
    return f;
  });
}

async function smelt(): Promise<ReturnType<typeof makeContext>> {
  const context = makeContext(actor, room, 'smelt');
  await ExecutionContextApi.runRoot(null, 'test', async () => {
    ExecutionContextApi.tagActingAuthor(actor);
    // `smelt.yaml` binds the furnace; a controller test skips the binder.
    await makeStuff(() => new SmeltController()).execute(
      { furnace: { stuff: furnace, raw: 'furnace' } } as never,
      context,
    );
  });
  return context;
}

/**
 * Advance past the engagement AND let the tap finish.
 *
 * ⚠ `completeStep` drains one macrotask, which was enough while the run
 * was pure arithmetic. The tap now DISCOVERS its product row
 * (`Template.findDescendants` — a store read), so the pour is several
 * awaits past the completion and a single drain lands between the
 * destruct and the clone: the furnace reads empty and the test would
 * report "no bar" for a run that worked.
 */
async function tap(): Promise<void> {
  await completeStep(200_000);
  for (let i = 0; i < 8; i++) await new Promise<void>((r) => setTimeout(r, 0));
}

function declinedFor(context: ReturnType<typeof makeContext>): string | undefined {
  return context.getNotes().find((n) => n.kind === 'controller-rejected')?.reason;
}

/** A poured product: the mass is the whole assertion, so narrow to it. */
type Massed = Stuff & { getMass(): Quantity<'kg'>; getMaterial(): Material | null };

/** Everything the furnace holds, by the template path it was cloned from. */
function productsIn(f: SmeltingFurnace): Map<string, Massed[]> {
  const out = new Map<string, Massed[]>();
  for (const item of f.getContents() as Stuff[]) {
    if (!MixinApi.isTangible(item)) continue;
    const path = item.getTemplatePath() ?? '';
    out.set(path, [...(out.get(path) ?? []), item as Massed]);
  }
  return out;
}

beforeEach(async () => {
  await standUpBranchHarness();
  // ⭐ The product rows the smelt DISCOVERS. `Template.findDescendants`
  // reads the content collection, so the fixture seeds it — and the
  // lookup under test is by `_materialPath`, never by a listed name.
  templateRows = PRODUCT_ROWS.map(([path, materialPath]) => ({
    path,
    class: '/platform/thing/Ingot',
    data: { _materialPath: materialPath },
  }));
  // ⚠ Through `PersistApi`, not the PersistenceManager: a pack imports
  // the kernel only by package specifier, and `backend/` is outside the
  // server's exports map on purpose (the import boundary `lint:imports`
  // holds).
  const realFind = PersistApi.find.bind(PersistApi);
  vi.spyOn(PersistApi, 'find').mockImplementation(
    async (collection: string, query: Record<string, unknown>) =>
      (collection === 'content' ? templateRows : await realFind(collection, query)) as never,
  );

  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    if (path === SOUR_ROW) {
      const b = makeStuff(() => new Bloom());
      stampTemplatePathForTest(b, SOUR_ROW);
      b.setMaterial(StuffApi.findByTemplatePath<Material>(SOUR_IRON) as Material);
      return b as never;
    }
    if (path === BLOOM_ROW) {
      const b = makeStuff(() => new Bloom());
      stampTemplatePathForTest(b, BLOOM_ROW);
      b.setMaterial(StuffApi.findByTemplatePath<Material>(BLOOM_IRON) as Material);
      return b as never;
    }
    const known = PRODUCT_ROWS.find(([p]) => p === path);
    if (known) {
      const i = makeStuff(() => new Ingot());
      stampTemplatePathForTest(i, path);
      i.setMaterial(StuffApi.findByTemplatePath<Material>(known[1]) as Material);
      return i as never;
    }
    if (path === SLAG_ROW) {
      const s = makeStuff(() => new Thing());
      stampTemplatePathForTest(s, SLAG_ROW);
      return s as never;
    }
    throw new Error(`unexpected clone ${path}`);
  });

  const malachite = makeStuffAtPath(() => new Material(), MALACHITE);
  // ⭐ Chemistry: two Cu in a 221.114 g/mol formula unit.
  malachite.setComposition([{ materialPath: COPPER, fraction: 0.5748 }]);
  malachite.setTags(['mineral', 'ore', 'copper']);
  // …and one Fe in an 88.851 g/mol formula unit is 0.6285.
  const goethite = makeStuffAtPath(() => new Material(), GOETHITE);
  goethite.setComposition([{ materialPath: IRON, fraction: 0.6285 }]);
  goethite.setTags(['mineral', 'ore', 'iron']);
  const copper = makeStuffAtPath(() => new Material(), COPPER);
  copper.setMeltingPoint(Quantity.of(1358, 'K'));
  copper.setTags(['element', 'metal', 'non-ferrous', 'forgeable']);
  const iron = makeStuffAtPath(() => new Material(), IRON);
  iron.setMeltingPoint(Quantity.of(1811, 'K'));
  iron.setTags(['element', 'metal', 'ferrous', 'forgeable']);
  const steel = makeStuffAtPath(() => new Material(), STEEL);
  steel.setTags(['alloy', 'metal', 'ferrous', 'forgeable']);
  steel.setComposition([
    { materialPath: IRON, fraction: 0.998 },
    { materialPath: CARBON, fraction: 0.002 },
  ]);
  makeStuffAtPath(() => new Material(), CAST_IRON).setTags(['alloy', 'metal', 'ferrous', 'brittle']);
  makeStuffAtPath(() => new Material(), BLOOM_IRON).setTags(['metal', 'ferrous', 'bloom']);
  // ⚠⚠ Hot-short iron: still ferrous, and BRITTLE — which is the tag the
  // smith's own verbs already refuse.
  makeStuffAtPath(() => new Material(), SOUR_IRON).setTags([
    'alloy',
    'metal',
    'ferrous',
    'brittle',
    'sulfurous',
  ]);
  makeStuffAtPath(() => new Material(), CARBON).setTags(['element', 'non-metal']);
  const charcoal = makeStuffAtPath(() => new Material(), CHARCOAL_M);
  charcoal.setTags(['fuel', 'carbon', 'organic']);
  // ⭐ The FLUX (extraction build) — a tag, never a row path, so dolomite
  // works the day somebody ships some.
  makeStuffAtPath(() => new Material(), LIMESTONE_M).setTags([
    'rock',
    'sedimentary',
    'carbonate',
    'flux',
  ]);
  // ⚠⚠ …and raw COAL, which reduces iron perfectly well and poisons it.
  makeStuffAtPath(() => new Material(), COAL_M).setTags([
    'mineral',
    'solid',
    'fuel',
    'carbon',
    'sulfurous',
  ]);

  room = makeStuff(() => new TestActor());
  actor = makeStuffAtPath(
    () => new TestActor(),
    `/platform/agent/Avatar/smelterman-${seq++}`,
  );
  ContainmentApi.move(actor, room);
  furnace = makeFurnace(false);
  ContainmentApi.move(furnace, room);
});

afterEach(() => {
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the furnace the smelt needs', () => {
  it('⚠⚠ is a CONTAINER — the shipped bare Forge was not, so the guard could never pass', () => {
    expect(MixinApi.isFurnace(furnace)).toBe(true);
    expect(MixinApi.isContainer(furnace)).toBe(true);
  });

  it('⭐ affords `smelt` on the class — the ONE record of verb affordances', () => {
    const afforded = (SmeltingFurnace as unknown as {
      commandContributions: { peers: string[]; environment: string[] };
    }).commandContributions;
    expect(afforded.peers).toContain('trade/smelting/cmd/smelting/smelt.yaml');
    expect(afforded.environment).toContain('trade/smelting/cmd/smelting/smelt.yaml');
  });
});

describe('dispatching the smelt', () => {
  it('⭐⭐ taps a bar of Σ(mass × grade × metal fraction) and slag for the rest', async () => {
    // 3 lumps of 1.4 kg at grade 0.07 — Rejection's own oxide cap.
    ContainmentApi.move(lump(1.4, 3, 0.07), furnace);
    ContainmentApi.move(basket(), furnace);
    ContainmentApi.move(basket(), furnace);

    const context = await smelt();
    expect(declinedFor(context)).toBeUndefined();
    await tap();

    const products = productsIn(furnace);
    const bars = products.get(INGOT_ROW) ?? [];
    expect(bars).toHaveLength(1);

    const chargeKg = 3 * 1.4;
    const metalKg = chargeKg * 0.07 * 0.5748;
    expect(bars[0]!.getMass().rawValue()).toBeCloseTo(Number(metalKg.toFixed(3)), 6);

    const slag = products.get(SLAG_ROW) ?? [];
    expect(slag).toHaveLength(1);
    expect(slag[0]!.getMass().rawValue()).toBeCloseTo(
      Number((chargeKg - metalKg).toFixed(3)),
      6,
    );
    // …and there is always more slag than metal, because a lump of ore
    // is mostly not ore.
    expect(slag[0]!.getMass().rawValue()).toBeGreaterThan(bars[0]!.getMass().rawValue());
  });

  it('⭐⭐ consumes EVERY basket — a charge has a ratio, or it has no carbon decision', async () => {
    ContainmentApi.move(lump(1.4, 3, 0.07), furnace);
    const baskets = [basket(), basket(), basket(), basket()];
    for (const b of baskets) ContainmentApi.move(b, furnace);

    await smelt();
    await tap();

    // It used to take `fuel.slice(0, 2)` and strand the rest, so a
    // four-basket charge was indistinguishable from a two-basket one.
    for (const b of baskets) expect(b.isDestroyed()).toBe(true);
    expect(productsIn(furnace).has(INGOT_ROW)).toBe(true);
  });

  it('declines an empty furnace, an ore-less charge and a fuel-less one, by name', async () => {
    expect(declinedFor(await smelt())).toBe('no-ore');

    ContainmentApi.move(lump(1.4, 3, 0.07), furnace);
    expect(declinedFor(await smelt())).toBe('no-fuel');

    ContainmentApi.move(basket(), furnace);
    expect(declinedFor(await smelt())).toBe('no-fuel');
  });

  it('⚠ the heat gate is the METAL’s own melting point, and it declines below it', async () => {
    furnace.setBurnTemperatureK(1200); // under copper's 1358 K
    ContainmentApi.move(lump(1.4, 3, 0.07), furnace);
    ContainmentApi.move(basket(), furnace);
    ContainmentApi.move(basket(), furnace);
    expect(declinedFor(await smelt())).toBe('too-cold');
  });

  it('⚠ a barren charge runs to slag and says so — never a token bar', async () => {
    ContainmentApi.move(lump(1.4, 3, 0), furnace);
    ContainmentApi.move(basket(), furnace);
    ContainmentApi.move(basket(), furnace);

    await smelt();
    await tap();

    const products = productsIn(furnace);
    expect(products.has(INGOT_ROW)).toBe(false);
    expect(products.get(SLAG_ROW)).toHaveLength(1);
  });
});

/**
 * ⭐⭐ **The same ore, charged two ways, is two different metals.**
 *
 * Nothing below names a recipe or selects a product. Every case charges
 * a furnace and reads what came out, and the only things that differ are
 * how much charcoal went in and whether the bellows was working. The
 * numbers are the Fe–C phase diagram's, not a table somebody wrote:
 * carbon lowers iron's melting point, so past a point the charge stops
 * being reduced and starts being MELTED — and iron that melted is iron
 * you cannot forge.
 */
describe('⭐⭐ the ferrous ladder — the charge decides the metal', () => {
  /** Charge the furnace with iron ore and `baskets` of charcoal. */
  function chargeIron(lumps: number, baskets: number, grade = 0.12): void {
    ContainmentApi.move(lump(1.4, lumps, grade, GOETHITE), furnace);
    for (let i = 0; i < baskets; i++) ContainmentApi.move(basket(), furnace);
  }

  /** The one product the run left in the furnace (slag excluded). */
  function productOf(): Massed | null {
    for (const [path, items] of productsIn(furnace)) {
      if (path !== SLAG_ROW && items[0]) return items[0];
    }
    return null;
  }

  it('⚠⚠ an UNLIT furnace is refused for being cold, not for the draught', async () => {
    // ⚠⚠ **The refusal that sent players in a circle.**
    // `getHeldTemperatureK()` is `burnTemperatureK × bellows` and never
    // consults `lit`, so a stone-cold shaft reports 1420 K. The heat
    // gate therefore answered a charged-but-unlit furnace with *"it is
    // holding 1420 K … work the bellows"* — and working the bellows
    // replies *"air without fire moves nothing."* Doing exactly what the
    // game said got you nowhere, and the act that helps (`light`) was
    // named by neither.
    //
    // ⚠ Every other test in this file uses `makeFurnace`, which is LIT.
    // That is why the whole unlit branch had no coverage at all, and why
    // it took hammering at a furnace in a browser to find.
    furnace.douse();
    chargeIron(3, 2);
    const context = await smelt();
    expect(declinedFor(context)).toBe('not-lit');
    // ⚠ The REASON is the assertion, not the words: `declineStep` sends
    // its prose through `MessageApi.scene(...).toSelf(...)` and notes
    // `detail: ""`, so the sentence is not in the envelope to match on.
    // The wording was checked by smelting in a browser; what a test can
    // hold is that the two failures are told APART, which is the whole
    // fix — `not-lit` and `too-cold` used to be one branch.
    //
    // A refusal costs nothing — the charge is untouched.
    expect((furnace.getContents() as Stuff[]).length).toBe(3);
  });

  it('⭐ …and once it is lit, the bellows IS the answer again', async () => {
    furnace.ignite();
    chargeIron(3, 2);
    const context = await smelt();
    // ⭐ Lit but under the reduction temperature: back to `too-cold`, and
    // NOW "work the bellows" is advice that can actually be taken.
    expect(declinedFor(context)).toBe('too-cold');
  });

  it('⚠ without the bellows it will not REDUCE, and the refusal says why', async () => {
    chargeIron(3, 2);
    const context = await smelt();
    expect(declinedFor(context)).toBe('too-cold');
    // ⭐ A different refusal from copper's, because it is different
    // physics: iron does not want to be melted, it wants to be reduced.
    expect(context.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(true);
    // …and the ore and both baskets are still in there. A refusal costs
    // nothing, which is what makes trying it the way you learn.
    expect((furnace.getContents() as Stuff[]).length).toBe(3);
  });

  it('⭐⭐ a MODEST charge with the bellows makes a BLOOM — solid, lean, slag-shot', async () => {
    furnace.setBellowsActive(true);
    chargeIron(3, 2);
    await smelt();
    await tap();

    const product = productOf();
    expect(product?.getTemplatePath()).toBe(BLOOM_ROW);
    expect(MixinApi.isAlloyed(product!)).toBe(true);
    // Lean — the fuel barely cleared what reduction itself consumes.
    const carbon = MixinApi.isAlloyed(product!) ? product!.fractionOf(CARBON) : 0;
    expect(carbon).toBeGreaterThanOrEqual(0.0005);
    expect(carbon).toBeLessThan(0.002);
    // ⭐ And it weighs MORE than the iron in it, because the slag it was
    // reduced in is still in the holes.
    const metalKg = 3 * 1.4 * 0.12 * 0.6285;
    expect(product!.getMass().rawValue()).toBeCloseTo(Number((metalKg * 1.3).toFixed(3)), 3);
    expect((product as unknown as { getSlagFraction(): number }).getSlagFraction())
      .toBeCloseTo(0.3 / 1.3, 6);
  });

  it('⭐⭐ a HEAVY charge RUNS — and what pours is a pig you cannot forge', async () => {
    furnace.setBellowsActive(true);
    chargeIron(3, 4);
    await smelt();
    await tap();

    const product = productOf();
    expect(product?.getTemplatePath()).toBe(PIG_ROW);
    // Saturated at the eutectic — which is WHY it ran.
    const carbon = MixinApi.isAlloyed(product!) ? product!.fractionOf(CARBON) : 0;
    expect(carbon).toBeCloseTo(0.043, 6);
    // ⚠ No slag rides a pig: it melted, so the gangue separated out.
    const metalKg = 3 * 1.4 * 0.12 * 0.6285;
    expect(product!.getMass().rawValue()).toBeCloseTo(Number(metalKg.toFixed(3)), 3);
    // …and its material is not `forgeable`, which is what actually stops
    // an anvil taking it — no verb had to be told about cast iron.
    expect(product!.getMaterial()!.getTags()).not.toContain('forgeable');
    expect(product!.getMaterial()!.getTags()).toContain('brittle');
  });

  it('⭐⭐ and BETWEEN them is natural steel — a bloom rich enough to beat into it', async () => {
    furnace.setBellowsActive(true);
    chargeIron(3, 3);
    await smelt();
    await tap();

    const product = productOf();
    // Still a bloom: it never melted.
    expect(product?.getTemplatePath()).toBe(BLOOM_ROW);
    // …but carrying enough carbon to be steel once the slag is out.
    const carbon = MixinApi.isAlloyed(product!) ? product!.fractionOf(CARBON) : 0;
    expect(carbon).toBeGreaterThan(0.002);
    expect(carbon).toBeLessThan(0.021);
    // ⭐ Nobody designed this rung. It falls out of the same two lines
    // the other two cases fall out of, and it is how most pre-modern
    // steel was actually made.
  });

  it('⭐⭐ a BAR charged back in carburizes — and a second run takes it further', async () => {
    furnace.setBellowsActive(true);
    ContainmentApi.move(bar(IRON, 0.5), furnace);
    ContainmentApi.move(basket(), furnace);
    ContainmentApi.move(basket(), furnace);
    await smelt();
    await tap();

    const first = productOf();
    expect(first?.getTemplatePath()).toBe(STEEL_ROW);
    expect(MixinApi.isAlloyed(first!) && first!.fractionOf(CARBON)).toBeCloseTo(0.006, 8);
    // ⚠ Carburizing loses NO mass: nothing is being separated out, and a
    // trace of carbon is going in.
    expect(first!.getMass().rawValue()).toBeCloseTo(0.5, 6);

    // A second run on that bar takes it further — steel is made by
    // repeating a thing, not by getting one thing exactly right.
    ContainmentApi.move(basket(), furnace);
    ContainmentApi.move(basket(), furnace);
    await smelt();
    await tap();
    const second = productOf();
    expect(MixinApi.isAlloyed(second!) && second!.fractionOf(CARBON)).toBeCloseTo(0.012, 8);
  });

  it('⚠ ore and metal together is a mixed charge, and it refuses by name', async () => {
    furnace.setBellowsActive(true);
    chargeIron(3, 2);
    ContainmentApi.move(bar(IRON, 0.5), furnace);
    expect(declinedFor(await smelt())).toBe('mixed-charge');
  });

  it('⭐ the product row is DISCOVERED by material, never listed by name', async () => {
    // The smelt computes a material and then looks for the row whose
    // `_materialPath` is that material. ⚠ Asserted by taking the row
    // AWAY: an author who adds tin adds a row, so a run whose material
    // has no row must fail loudly rather than eat the charge.
    furnace.setBellowsActive(true);
    templateRows = templateRows.filter((r) => r['path'] !== BLOOM_ROW);
    chargeIron(3, 2);
    const context = await smelt();
    await tap();
    expect(declinedFor(context)).toBe('no-product-row');
  });
});

/**
 * ⭐⭐ **The flux and the sulfur — what the quarry did to the smelt.**
 *
 * Both are read off a MATERIAL TAG and neither is a recipe or a row check, so
 * the smelt gained two behaviours and learned no new nouns:
 *
 *  - **`flux`** — limestone in the charge lowers the gangue's melting point,
 *    so the waste runs OUT of the bloom instead of staying in it as sponge.
 *    30 % trapped becomes 12 %. ⚠ The metal chain shipped with `flux` named
 *    as a hole and nothing in the world producing one; this is the producer
 *    arriving, and the *demand was there first*.
 *  - **`sulfurous`** — raw coal reduces iron and poisons it. The bloom is
 *    written down to `poor` whatever else was true of the run, which is
 *    exactly why coke had to be invented and why this build ships coal as a
 *    hearth fuel rather than an iron one.
 */
describe('⭐⭐ the flux and the sulfur (extraction)', () => {
  function chargeIron(lumps: number, baskets: number, grade = 0.12): void {
    ContainmentApi.move(lump(1.4, lumps, grade, GOETHITE), furnace);
    for (let i = 0; i < baskets; i++) ContainmentApi.move(basket(), furnace);
  }

  /** A lump of limestone — a Tangible whose material carries `flux`. */
  function limestone(): Thing {
    const l = makeStuff(() => new Thing());
    l.setMass(Quantity.of(8, 'kg'));
    l.setMaterial(
      StuffApi.findByTemplatePath<Material>(LIMESTONE_M) as unknown as Material,
    );
    return l;
  }

  /** A lump of raw coal — fuel AND carbon AND sulfurous. */
  function coal(): Thing {
    const c = makeStuff(() => new Thing());
    c.setMass(Quantity.of(8, 'kg'));
    c.setMaterial(StuffApi.findByTemplatePath<Material>(COAL_M) as unknown as Material);
    return c;
  }

  function productOf(): Massed | null {
    for (const [path, items] of productsIn(furnace)) {
      if (path !== SLAG_ROW && items[0]) return items[0];
    }
    return null;
  }

  it('⭐⭐ limestone in the charge means a CLEANER bloom out of the same rock', async () => {
    // The same ore, the same fuel, the same heat — and the only difference is
    // a stone in the charge. Run it both ways and compare.
    furnace.setBellowsActive(true);
    chargeIron(3, 2);
    await smelt();
    await tap();
    const plain = productOf();
    expect(plain).not.toBeNull();
    const plainSlag =
      (plain as unknown as { getSlagFraction?(): number }).getSlagFraction?.() ?? 0;

    // A fresh furnace, and this time with limestone in it.
    furnace = makeFurnace(true);
    ContainmentApi.move(furnace, room);
    chargeIron(3, 2);
    ContainmentApi.move(limestone(), furnace);
    await smelt();
    await tap();
    const fluxed = productOf();
    expect(fluxed).not.toBeNull();
    const fluxedSlag =
      (fluxed as unknown as { getSlagFraction?(): number }).getSlagFraction?.() ?? 0;

    expect(fluxedSlag).toBeLessThan(plainSlag);
    // ⭐ And the bloom is SMALLER, which is the honest reading: the waste
    // left, it did not become metal.
    expect(fluxed!.getMass().rawValue()).toBeLessThan(plain!.getMass().rawValue());
  });

  it('the limestone is CONSUMED — it is not a tool you get back', async () => {
    furnace.setBellowsActive(true);
    chargeIron(3, 2);
    const stone = limestone();
    ContainmentApi.move(stone, furnace);
    await smelt();
    await tap();
    expect(stone.isDestroyed()).toBe(true);
  });

  it('⚠⚠ raw COAL reduces the iron and RUINS it — and it is the MATERIAL', async () => {
    // Coal carries `fuel` and `carbon`, so it satisfies the charcoal check
    // and the run happens. And it carries `sulfurous`, so what comes out is
    // hot-short iron. Two tags, one honest outcome, and no branch on the word
    // "coal" anywhere in the controller.
    //
    // ⭐⭐ **A material, not a grade, and the test is what forced that.** The
    // plan said to write the product's Graded face down to `poor` — and
    // NEITHER `Bloom` NOR `Ingot` composes `GradedMixin`, so `setGrade` was a
    // silent no-op and coal made perfectly good iron. The material is also
    // the better answer: the smith's own verbs already refuse a `brittle`
    // metal, so *"it will crack under the hammer"* is enforced rather than
    // narrated.
    furnace.setBellowsActive(true);
    ContainmentApi.move(lump(1.4, 3, 0.12, GOETHITE), furnace);
    ContainmentApi.move(coal(), furnace);
    ContainmentApi.move(coal(), furnace);
    await smelt();
    await tap();
    const bloom = productOf();
    expect(bloom).not.toBeNull();
    expect(bloom!.getMaterial()?.getTemplatePath()).toBe(SOUR_IRON);
    // …and the tag the smith's hand actually reads.
    expect(
      MixinApi.isTangible(bloom!) && bloom!.hasMaterialTag('brittle'),
    ).toBe(true);
  });

  it('…and charcoal on the same charge gives sound bloom iron', async () => {
    // The control. If this failed, the case above would be asserting that
    // every bloom is ruined rather than that a sour one is.
    furnace.setBellowsActive(true);
    chargeIron(3, 2);
    await smelt();
    await tap();
    const bloom = productOf();
    expect(bloom).not.toBeNull();
    expect(bloom!.getMaterial()?.getTemplatePath()).toBe(BLOOM_IRON);
    expect(
      MixinApi.isTangible(bloom!) && bloom!.hasMaterialTag('brittle'),
    ).toBe(false);
  });
});
