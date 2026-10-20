/**
 * ⭐⭐ The mould decides the SHAPE, the piece's own heat history the CURE
 * (rubber build; ceramics M1 made the cure a heat transition). The
 * contract this file pins, for the moulding build that owns the seam
 * (moulding-slate § 5):
 *
 *  1. compounded stock standing in a mould in a lit chamber reaches its
 *     rung and the mould mints the cast, in the mould, worn by one cast;
 *  2. the same stock loose in the chamber is cured IN PLACE — the same
 *     piece, its material swapped (identity is kept);
 *  3. a broken mould casts a lump;
 *  4. a cast's grade is the weaker of the mould's and the cure's.
 *
 * And the cure itself: the stock's OWN agent fraction (milled in at the
 * tub — `fractionOf`, never a sum over the chamber), the heat and the time
 * decide the material. `fire` decides nothing: it holds the chamber and
 * settles it.
 */

import '../../../../../../test-bootstrap';
import { chargeHot } from '../../../../../lib/fire/__tests__/burner-fuel';
import type { Burner } from '../../../../../lib/fire/Burner';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import FireController from '../FireController';
import WorldClockRegistry from '../../../WorldClockRegistry';
import Oven from '../../../../thing/Oven';
import Casting from '../../../../thing/Casting';
import Garment from '../../../../thing/equipment/Garment';
import Mould from '../../../../thing/Mould';
import Material from '../../../../../lib/material/Material';
import { Grade } from '../../../../../lib/craft/Grade';
import { Quantity } from '../../../../../lib/quantity';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import type { CommandContext } from '../../../../../api/command';
import {
  TestActor,
  standUpBranchHarness,
  makeContext,
  completeStep,
} from '../../crafting/__tests__/branch-fixtures';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../../../../lib/security/__tests__/test-setup';

const FEED = '/stuff/idea/material/_mould/feed';
const AGENT = '/stuff/idea/material/_mould/agent';
const CURED = '/stuff/idea/material/_mould/cured';
const OVER = '/stuff/idea/material/_mould/over';
const SCORCHED = '/stuff/idea/material/_mould/scorched';
const CAST_ROW = '/stuff/thing/_mould/boot';
const LUMP_ROW = '/stuff/thing/_mould/lump';
const STOCK_ROW = '/stuff/thing/_mould/stock';

let room: TestActor;
let actor: TestActor;
let kiln: Oven;

function material(path: string, tags: string[], extra?: (m: Material) => void): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setTags(tags);
    m.setKeywords([path.split('/').pop()!]);
    (m as unknown as { castTemplate: string }).castTemplate = LUMP_ROW; // a public row field, no setter
    extra?.(m);
    return m;
  }, path);
}

function makeKiln(holdK: number): Oven {
  return makeStuff(() => {
    const o = new Oven();
    o.setBurnTemperatureK(holdK);
    o.setBellowsMultiplier(1);
    chargeHot(o as unknown as Stuff & Burner, 40);
    o.setBellowsActive(false);
    o._setLit(true);
    return o;
  });
}

/** A piece of compounded stock: the feedstock with `agent` of the agent milled in. */
function stockOf(agent: number, kg = 0.2): Casting {
  const t = makeStuff(() => new Casting());
  stampTemplatePathForTest(t, STOCK_ROW);
  t.setMass(Quantity.of(kg, 'kg'));
  t.setMaterial(StuffApi.findByTemplatePath<Material>(FEED) as unknown as Material);
  t.setAlloying([
    { materialPath: FEED, fraction: 1 - agent },
    { materialPath: AGENT, fraction: agent },
  ]);
  return t;
}

function mould(grade = 'fine'): Mould {
  const m = makeStuff(() => new Mould());
  m.setCastTemplate(CAST_ROW);
  (m as unknown as { setGradeBand(b: string): void }).setGradeBand(grade);
  return m;
}

/** A charge: one piece of stock carrying `agent` sulfur, into `into`. */
function charge(into: Stuff, agent: number): Casting {
  const piece = stockOf(agent);
  ContainmentApi.move(piece as never, into as never);
  return piece;
}

async function fire(hold?: string): Promise<CommandContext> {
  const context = makeContext(actor, room, 'fire');
  await ExecutionContextApi.runRoot(null, 'test', async () => {
    ExecutionContextApi.tagActingAuthor(actor);
    await makeStuff(() => new FireController()).execute(
      { kiln: { stuff: kiln, raw: 'kiln' }, hold } as never,
      context,
    );
  });
  return context;
}

/** Run the hold out and drain the completion chain. */
async function draw(holdS = 1800): Promise<void> {
  await completeStep(holdS * 1000 + 10_000);
  for (let i = 0; i < 12; i++) await new Promise<void>((r) => setTimeout(r, 0));
}

function declinedFor(context: CommandContext): string | undefined {
  return context.getNotes().find((n) => n.kind === 'controller-rejected')?.reason;
}

const materialPathOf = (s: Stuff): string | null =>
  (s as unknown as { getMaterial(): Material | null }).getMaterial()?.getTemplatePath() ?? null;

beforeEach(async () => {
  await standUpBranchHarness();
  // ⭐ The heat history needs a world clock a body can FIND: the harness
  // clears the registry's index entry after minting its clock, and a body
  // that finds no clock is idle (thermal's own guard).
  makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
  material(AGENT, ['_agent']);
  material(CURED, ['_cured']);
  material(OVER, ['_over']);
  material(SCORCHED, ['_scorched']);
  material(FEED, ['_feed'], (m) => {
    // ⭐ A light charge (a fifth of a kilo, low heat capacity) so it is at
    // the chamber's heat within a minute — the hold is the cure, not the
    // warm-up.
    m.setSpecificHeat(Quantity.of(400, 'J/(kg·K)'));
    m.setHeatTransitions([
      {
        key: 'cure',
        referenceK: 418,
        zK: 12,
        fullDoseS: 1800,
        agent: { material: AGENT, optimum: 0.03, over: 0.2 },
        scorchAboveK: 455,
        ladder: [{ atDegree: 0.6, becomes: CURED }],
        over: OVER,
        scorched: SCORCHED,
        discipline: 'chemistry',
      },
    ]);
  });

  const realClone = StuffApi.clone;
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    if (path === CAST_ROW || path === LUMP_ROW) {
      // The cast is a graded garment, as the real goods are; the lump a casting.
      const p = path === CAST_ROW ? makeStuff(() => new Garment()) : makeStuff(() => new Casting());
      stampTemplatePathForTest(p, path);
      p.setMass(Quantity.of(1, 'kg'));
      p.setShortDescription(path === CAST_ROW ? 'pair of boots' : 'lump');
      return p;
    }
    return realClone.call(StuffApi, path);
  }) as never);

  room = makeStuff(() => new TestActor());
  actor = makeStuffAtPath(() => new TestActor(), '/platform/agent/Avatar/vulcanizer-1');
  ContainmentApi.move(actor, room);
  kiln = makeKiln(418);
  ContainmentApi.move(kiln, room);
});

afterEach(() => vi.restoreAllMocks());

describe('⭐⭐ the mould decides the shape', () => {
  it('stock in a mould comes out in the mould, in its shape, of the cure\'s material', async () => {
    const m = mould();
    ContainmentApi.move(m as never, kiln as never);
    charge(m, 0.03);
    expect(m.holdsCast()).toBe(false); // ⚠ a charge is not a cast
    const before = m.getCondition();
    const context = await fire('30 minutes');
    expect(declinedFor(context)).toBeUndefined();
    await draw();
    const cast = m.getContents().find((c) => c.getTemplatePath() === CAST_ROW);
    expect(cast).toBeDefined();
    expect(materialPathOf(cast!)).toBe(CURED);
    expect(m.holdsCast()).toBe(true);
    expect(m.getCondition()).toBeLessThan(before);
    // the stock is gone — it BECAME the cast
    expect(m.getContents().filter((c) => c.getTemplatePath() === STOCK_ROW)).toHaveLength(0);
  });

  it('the same stock loose in the chamber is cured in place — the same piece', async () => {
    const piece = charge(kiln, 0.03);
    await fire('30 minutes');
    await draw();
    expect(StuffApi.findById(piece.stuffId)).toBe(piece);
    expect(materialPathOf(piece)).toBe(CURED);
  });

  it('a broken mould casts a lump', async () => {
    const m = mould();
    m.setCondition(0);
    ContainmentApi.move(m as never, kiln as never);
    charge(m, 0.03);
    await fire('30 minutes');
    await draw();
    expect(m.getContents().some((c) => c.getTemplatePath() === LUMP_ROW)).toBe(true);
    expect(m.getContents().some((c) => c.getTemplatePath() === CAST_ROW)).toBe(false);
  });

  it('weakest link: a poor mould spoils a fine cure', async () => {
    const m = mould('poor');
    ContainmentApi.move(m as never, kiln as never);
    charge(m, 0.03);
    await fire('30 minutes');
    await draw();
    const cast = m.getContents().find((c) => c.getTemplatePath() === CAST_ROW)!;
    expect((cast as unknown as { getGrade(): Grade }).getGrade().getBand()).toBe('poor');
  });
});

describe('⭐⭐ the cure is the stock, the heat and the time', () => {
  it('3 % sulfur held half an hour at 418 K is cured, and fine', async () => {
    const m = mould('masterful');
    ContainmentApi.move(m as never, kiln as never);
    charge(m, 0.03);
    await fire('30 minutes');
    await draw();
    const cast = m.getContents().find((c) => c.getTemplatePath() === CAST_ROW)!;
    expect(materialPathOf(cast)).toBe(CURED);
    expect((cast as unknown as { getGrade(): Grade }).getGrade().getBand()).toBe('fine');
  });

  it('a short low-sulfur hold never reaches the rung — it stays compounded stock', async () => {
    const m = mould();
    ContainmentApi.move(m as never, kiln as never);
    const piece = charge(m, 0.01);
    await fire('10 minutes');
    await draw(600);
    expect(m.getContents().some((c) => c.getTemplatePath() === CAST_ROW)).toBe(false);
    expect(StuffApi.findById(piece.stuffId)).toBe(piece);
    expect(materialPathOf(piece)).toBe(FEED);
    const degree = piece.getHeatWork()?.conversions['cure']?.degree ?? 0;
    expect(degree).toBeGreaterThan(0);
    expect(degree).toBeLessThan(0.6);
  });

  it('a fifth of sulfur held long is the over-range material', async () => {
    const m = mould();
    ContainmentApi.move(m as never, kiln as never);
    charge(m, 0.25);
    await fire('1 hour');
    await draw(3600);
    const cast = m.getContents().find((c) => c.getTemplatePath() === CAST_ROW)!;
    expect(materialPathOf(cast)).toBe(OVER);
  });

  it('the good stock held too hot is scorched', async () => {
    kiln.setBurnTemperatureK(470);
    const m = mould();
    ContainmentApi.move(m as never, kiln as never);
    charge(m, 0.03);
    await fire('30 minutes');
    await draw();
    const cast = m.getContents().find((c) => c.getTemplatePath() === CAST_ROW)!;
    expect(materialPathOf(cast)).toBe(SCORCHED);
  });

  it('`for <how long>` that is not a duration is refused, and the stock stays', async () => {
    const m = mould();
    ContainmentApi.move(m as never, kiln as never);
    charge(m, 0.03);
    expect(declinedFor(await fire('a while'))).toBe('bad-duration');
    expect(m.getContents()).toHaveLength(1);
  });
});
