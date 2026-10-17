/**
 * ⭐⭐ `fire` asks the MOULD for its shape, and the FEEDSTOCK for its cure
 * (rubber build, D8–D10). The contract this file pins, for the moulding
 * build that owns the seam afterwards (moulding-slate § 5):
 *
 *  1. a charge loaded in a mould standing in the chamber comes out in the
 *     mould's shape, in the mould, and the mould wears by one cast;
 *  2. the same charge loose in the chamber comes out as its material's
 *     own lump;
 *  3. a broken mould casts a lump;
 *  4. a cast's grade is the weaker of the mould's and the cure's.
 *
 * And the cure itself: the charge's sulfur fraction, the heat and the time
 * decide the material — none of it a word in the controller, all of it a
 * spec this file invents on its own feedstock.
 */

import '../../../../../../test-bootstrap';
import { chargeHot } from '../../../../../lib/fire/__tests__/burner-fuel';
import type { Burner } from '../../../../../lib/fire/Burner';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import FireController from '../FireController';
import Oven from '../../../../thing/Oven';
import Casting from '../../../../thing/Casting';
import Garment from '../../../../thing/equipment/Garment';
import Mould from '../../../../thing/Mould';
import Good from '../../../../../lib/stuff/Good';
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
  branchRecipeRows,
} from '../../crafting/__tests__/branch-fixtures';
import RecipeCatalogue from '../../../RecipeCatalogue';
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

function lumpOf(path: string, kg: number): Good {
  const t = makeStuff(() => new Good());
  t.setMass(Quantity.of(kg, 'kg'));
  t.setMaterial(StuffApi.findByTemplatePath<Material>(path) as unknown as Material);
  return t;
}

function mould(grade = 'fine'): Mould {
  const m = makeStuff(() => new Mould());
  m.setCastTemplate(CAST_ROW);
  (m as unknown as { setGradeBand(b: string): void }).setGradeBand(grade);
  return m;
}

/** A charge: `feedKg` of feedstock and `agentKg` of agent, into `into`. */
function charge(into: Stuff, feedKg: number, agentKg: number): void {
  ContainmentApi.move(lumpOf(FEED, feedKg) as never, into as never);
  if (agentKg > 0) ContainmentApi.move(lumpOf(AGENT, agentKg) as never, into as never);
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
  const harness = await standUpBranchHarness();
  material(AGENT, ['_agent']);
  material(CURED, ['_cured']);
  material(OVER, ['_over']);
  material(SCORCHED, ['_scorched']);
  material(FEED, ['_feed'], (m) =>
    m.setCrosslinking({
      agent: '_agent',
      referenceK: 418,
      zK: 12,
      fullDoseS: 1800,
      agentOptimum: 0.03,
      agentOver: 0.2,
      scorchAboveK: 455,
      products: { under: FEED, cured: CURED, over: OVER, scorched: SCORCHED },
    }),
  );
  harness.store['recipes'] = [
    ...branchRecipeRows(),
    {
      recipeId: 'test-cure',
      name: 'Test cure',
      keywords: ['testcure'],
      inputSlots: [
        { slot: 'feed', category: '_feed', minGrade: 'poor', kind: 'item', count: 1 },
        { slot: 'agent', category: '_agent', minGrade: 'poor', kind: 'item', count: 1 },
      ],
      toolCapabilities: [],
      outputTemplate: LUMP_ROW,
      outputMaterial: '',
      outputApplication: 'tangible',
      requiresHeatK: 400,
      holdS: 1800,
      maxHeatK: 455,
      difficulty: 'standard',
      discipline: 'chemistry',
    },
  ];
  const catalogue = StuffApi.findByTemplatePath<RecipeCatalogue>('/platform/idea/RecipeCatalogue')!;
  catalogue.invalidateCache();
  await catalogue.warm();

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
  it('a charge in a mould comes out in the mould, in its shape, of the cure\'s material', async () => {
    const m = mould();
    ContainmentApi.move(m as never, kiln as never);
    charge(m, 0.97, 0.03);
    expect(m.holdsCast()).toBe(false); // ⚠ a charge is not a cast
    const before = m.getCondition();
    const context = await fire();
    expect(declinedFor(context)).toBeUndefined();
    await draw();
    const cast = m.getContents().find((c) => c.getTemplatePath() === CAST_ROW);
    expect(cast).toBeDefined();
    expect(materialPathOf(cast!)).toBe(CURED);
    expect(m.holdsCast()).toBe(true);
    expect(m.getCondition()).toBeLessThan(before);
    // the charge is gone
    expect(m.getContents().filter((c) => materialPathOf(c) === FEED)).toHaveLength(0);
  });

  it('the same charge loose in the chamber comes out as its material\'s own lump', async () => {
    charge(kiln, 0.97, 0.03);
    await fire();
    await draw();
    const out = kiln.getContents().find((c) => c.getTemplatePath() === LUMP_ROW);
    expect(out).toBeDefined();
    expect(materialPathOf(out!)).toBe(CURED);
  });

  it('a broken mould casts a lump', async () => {
    const m = mould();
    m.setCondition(0);
    ContainmentApi.move(m as never, kiln as never);
    charge(m, 0.97, 0.03);
    await fire();
    await draw();
    expect(m.getContents().some((c) => c.getTemplatePath() === LUMP_ROW)).toBe(true);
    expect(m.getContents().some((c) => c.getTemplatePath() === CAST_ROW)).toBe(false);
  });

  it('weakest link: a poor mould spoils a fine cure', async () => {
    const m = mould('poor');
    ContainmentApi.move(m as never, kiln as never);
    charge(m, 0.97, 0.03);
    await fire();
    await draw();
    const cast = m.getContents().find((c) => c.getTemplatePath() === CAST_ROW)!;
    expect((cast as unknown as { getGrade(): Grade }).getGrade().getBand()).toBe('poor');
  });
});

describe('⭐⭐ the cure is the charge, the heat and the time', () => {
  it('a weighed 3 % charge held its recipe\'s half hour at 418 K is cured, and fine', async () => {
    const m = mould('masterful');
    ContainmentApi.move(m as never, kiln as never);
    charge(m, 0.97, 0.03);
    await fire();
    await draw();
    const cast = m.getContents().find((c) => c.getTemplatePath() === CAST_ROW)!;
    expect(materialPathOf(cast)).toBe(CURED);
    expect((cast as unknown as { getGrade(): Grade }).getGrade().getBand()).toBe('fine');
  });

  it('a short low-sulfur cure stays the feedstock — under-cured', async () => {
    const m = mould();
    ContainmentApi.move(m as never, kiln as never);
    charge(m, 0.99, 0.01);
    await fire('10 minutes');
    await draw(600);
    const cast = m.getContents().find((c) => c.getTemplatePath() === CAST_ROW)!;
    expect(materialPathOf(cast)).toBe(FEED);
  });

  it('a heavy charge held long is the over-range material', async () => {
    const m = mould();
    ContainmentApi.move(m as never, kiln as never);
    charge(m, 0.75, 0.25);
    await fire('1 hour');
    await draw(3600);
    const cast = m.getContents().find((c) => c.getTemplatePath() === CAST_ROW)!;
    expect(materialPathOf(cast)).toBe(OVER);
  });

  it('the good charge held too hot is scorched', async () => {
    kiln.setBurnTemperatureK(470);
    const m = mould();
    ContainmentApi.move(m as never, kiln as never);
    charge(m, 0.97, 0.03);
    await fire();
    await draw();
    const cast = m.getContents().find((c) => c.getTemplatePath() === CAST_ROW)!;
    expect(materialPathOf(cast)).toBe(SCORCHED);
  });

  it('`for <how long>` that is not a duration is refused, and the charge stays', async () => {
    const m = mould();
    ContainmentApi.move(m as never, kiln as never);
    charge(m, 0.97, 0.03);
    expect(declinedFor(await fire('a while'))).toBe('bad-duration');
    expect(m.getContents()).toHaveLength(2);
  });

  it('two charged moulds are one firing too many', async () => {
    for (let i = 0; i < 2; i++) {
      const m = mould();
      ContainmentApi.move(m as never, kiln as never);
      charge(m, 0.97, 0.03);
    }
    expect(declinedFor(await fire())).toBe('mixed-charge');
  });
});
