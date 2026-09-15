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
const COPPER = '/stuff/idea/material/element/copper';
const CHARCOAL_M = '/stuff/idea/material/organic/charcoal';
const INGOT_ROW = '/trade/smelting/thing/copper-ingot';
const SLAG_ROW = '/trade/smelting/thing/slag';

let seq = 0;
let room: TestActor;
let actor: TestActor;
let furnace: SmeltingFurnace;

/** An ore lot of malachite: `count` lumps of `kgEach` at `grade`. */
function lump(kgEach: number, count: number, grade: number): Ore {
  const o = makeStuff(() => new Ore());
  stampTemplatePathForTest(o, '/world/rejection/thing/copper-ore');
  o.setQuantity(count);
  o.setGrade(grade);
  (o as unknown as { _materialPath: string })._materialPath = MALACHITE;
  o.setMass(Quantity.of(kgEach, 'kg'));
  return o;
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

/** A lit smelting furnace at charcoal heat, standing in the room. */
function makeFurnace(bellows: boolean): SmeltingFurnace {
  return makeStuff(() => {
    const f = new SmeltingFurnace();
    f.setBurnTemperatureK(1420);
    f.setBellowsMultiplier(1.5);
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
    await makeStuff(() => new SmeltController()).execute({} as never, context);
  });
  return context;
}

function declinedFor(context: ReturnType<typeof makeContext>): string | undefined {
  return context.getNotes().find((n) => n.kind === 'controller-rejected')?.reason;
}

/** A poured product: the mass is the whole assertion, so narrow to it. */
type Massed = Stuff & { getMass(): Quantity<'kg'> };

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
  // The harness stubs `clone` for the crafting outputs; the smelt pours
  // two rows of its own.
  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    if (path === INGOT_ROW) {
      const i = makeStuff(() => new Ingot());
      stampTemplatePathForTest(i, INGOT_ROW);
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
  const copper = makeStuffAtPath(() => new Material(), COPPER);
  copper.setMeltingPoint(Quantity.of(1358, 'K'));
  const charcoal = makeStuffAtPath(() => new Material(), CHARCOAL_M);
  charcoal.setTags(['fuel', 'carbon', 'organic']);

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
    await completeStep(200_000);

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
    await completeStep(200_000);

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
    await completeStep(200_000);

    const products = productsIn(furnace);
    expect(products.has(INGOT_ROW)).toBe(false);
    expect(products.get(SLAG_ROW)).toHaveLength(1);
  });
});
