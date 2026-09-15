/**
 * ⭐⭐ **What the anvil does with the metal chain's three ferrous
 * products**, which is three completely different things.
 *
 *  - a **bloom** is consolidated: beaten until the slag is out of it and
 *    the iron has welded to itself. It stops being a bloom and becomes a
 *    bar, and the bar weighs visibly less than what you put down.
 *  - a **bar** is forged, exactly as it always was.
 *  - a **pig of cast iron** is refused, by a verb that says what it is.
 *
 * ⚠ None of that is a special case anywhere in the kernel. The material
 * rows carry `forgeable` (or do not), so the recipe gather picks up
 * exactly what an anvil can work — silently and correctly — and the two
 * verbs a player could still point at a pig decline diegetically.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import HeatController from '@saxonberg/server/mud/platform/idea/cmd/crafting/HeatController';
import HammerController from '../HammerController';
import QuenchController from '../QuenchController';
import Bloom from '@saxonberg/content-trade-smelting/src/thing/Bloom';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Ingot from '@saxonberg/server/mud/platform/thing/Ingot';
import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import {
  TestActor,
  standUpBranchHarness,
  makeContext,
  ref,
  completeStep,
  makeLitForge,
  makeTool,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

const IRON = '/stuff/idea/material/element/iron';
const STEEL = '/stuff/idea/material/alloy/steel';
const CAST_IRON = '/stuff/idea/material/alloy/cast-iron';
const BLOOM_IRON = '/stuff/idea/material/alloy/bloom-iron';
const CARBON = '/stuff/idea/material/element/carbon';
const IRON_BAR = '/trade/smithing/thing/iron-ingot';
const STEEL_BAR = '/trade/smelting/thing/steel-ingot';
const SLAG = '/trade/smelting/thing/slag';
const PIG = '/trade/smelting/thing/cast-iron-pig';

let seq = 0;
let room: TestActor;
let actor: TestActor;

type StepController = Stuff & { execute(m: never, c: never): unknown };

async function step(
  Ctor: new () => StepController,
  target: Stuff,
  ms: number,
): Promise<void> {
  await ExecutionContextApi.runRoot(null, 'test', async () => {
    ExecutionContextApi.tagActingAuthor(actor);
    await makeStuff(() => new Ctor()).execute(
      { target: ref(target, 'it') } as never,
      makeContext(actor, room, 'step') as never,
    );
  });
  await completeStep(ms);
  // ⚠ Consolidation clones its bar from a row (a store round-trip), so
  // the completion is several awaits deep — one drain lands between the
  // destruct and the clone.
  for (let i = 0; i < 8; i++) await new Promise<void>((r) => setTimeout(r, 0));
}

function material(path: string): Material {
  return StuffApi.findByTemplatePath<Material>(path) as Material;
}

/** A bloom as the smelt makes one: mass, slag fraction and carbon. */
function bloom(massKg: number, slagFraction: number, carbon: number): Bloom {
  const b = makeStuff(() => new Bloom());
  stampTemplatePathForTest(b, '/trade/smelting/thing/iron-bloom');
  b.setMaterial(material(BLOOM_IRON));
  b.setMass(Quantity.of(massKg, 'kg'));
  b.setSlagFraction(slagFraction);
  if (carbon > 0) b.setFractionOf(CARBON, carbon);
  return b;
}

/** A pig, as the smelt makes one when the charge ran. */
function pig(): Ingot {
  const p = makeStuff(() => new Ingot());
  stampTemplatePathForTest(p, PIG);
  p.setMaterial(material(CAST_IRON));
  p.setMass(Quantity.of(1, 'kg'));
  p.setFractionOf(CARBON, 0.043);
  return p;
}

/** The things standing in the room, by the row they were cloned from. */
function inRoom(path: string): Stuff[] {
  return (room.getContents() as Stuff[]).filter((c) => c.getTemplatePath() === path);
}

beforeEach(async () => {
  await standUpBranchHarness();
  for (const [path, name, tags] of [
    [IRON, 'iron', ['metal', 'ferrous', 'forgeable']],
    [STEEL, 'steel', ['alloy', 'metal', 'ferrous', 'forgeable']],
    [CAST_IRON, 'cast iron', ['alloy', 'metal', 'ferrous', 'brittle']],
    [BLOOM_IRON, 'bloom iron', ['metal', 'ferrous', 'bloom']],
  ] as const) {
    const m = makeStuffAtPath(() => new Material(), path);
    m.setName(name);
    m.setTags([...tags]);
  }

  // The rows consolidation clones. ⚠ The harness already stubs `clone`
  // for the crafting outputs; this layers the metal rows over it.
  const inner = (StuffApi.clone as unknown as {
    getMockImplementation(): (p: string) => Promise<unknown>;
  }).getMockImplementation();
  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    if (path === IRON_BAR || path === STEEL_BAR) {
      const bar = makeStuff(() => new Ingot());
      stampTemplatePathForTest(bar, path);
      bar.setMaterial(material(path === STEEL_BAR ? STEEL : IRON));
      return bar as never;
    }
    if (path === SLAG) {
      const s = makeStuff(() => new Thing());
      stampTemplatePathForTest(s, SLAG);
      return s as never;
    }
    // ⚠ A pig clones itself when it CRACKS: the two halves are the same
    // row at half the mass each.
    if (path === PIG) return pig() as never;
    return (await inner(path)) as never;
  });

  room = makeStuff(() => new TestActor());
  actor = makeStuffAtPath(() => new TestActor(), `/platform/agent/Avatar/smith-${seq++}`);
  ContainmentApi.move(actor, room);
  ContainmentApi.move(makeLitForge(true), room);
  ContainmentApi.move(makeTool('striking'), room);
  ContainmentApi.move(makeTool('anvil'), room);
});

afterEach(() => {
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐⭐ a bloom is consolidated at the anvil', () => {
  it('⭐⭐ the first blow leaves a BAR, and the slag on the floor', async () => {
    const b = bloom(1.3, 0.3 / 1.3, 0.0013);
    ContainmentApi.move(b, room);
    await step(HeatController, b, 4000);
    await step(HammerController, b, 5000);

    // The bloom is gone; a wrought bar is standing in its place.
    expect(b.isDestroyed()).toBe(true);
    const bars = inRoom(IRON_BAR);
    expect(bars).toHaveLength(1);
    // ⭐ And it weighs LESS. That difference is the lesson: a player who
    // has done this once knows why a bar costs what a bar costs.
    expect(MixinApi.isTangible(bars[0]!) && bars[0]!.getMass().rawValue())
      .toBeCloseTo(1.0, 3);
    // …because the rest of it is lying there.
    const slag = inRoom(SLAG);
    expect(slag).toHaveLength(1);
    expect(MixinApi.isTangible(slag[0]!) && slag[0]!.getMass().rawValue())
      .toBeCloseTo(0.3, 3);
  });

  it('⭐ the carbon survives the beating — it is dissolved in the iron, the slag is not', async () => {
    const b = bloom(1.3, 0.3 / 1.3, 0.0013);
    ContainmentApi.move(b, room);
    await step(HeatController, b, 4000);
    await step(HammerController, b, 5000);
    const bar = inRoom(IRON_BAR)[0]!;
    expect(MixinApi.isAlloyed(bar) && bar.fractionOf(CARBON)).toBeCloseTo(0.0013, 8);
  });

  it('⭐⭐ a RICH bloom beats straight into steel — natural steel, and nobody designed it', async () => {
    // 1.56 % carbon is what three baskets on three lumps actually gives.
    const b = bloom(1.3, 0.3 / 1.3, 0.0156);
    ContainmentApi.move(b, room);
    await step(HeatController, b, 4000);
    await step(HammerController, b, 5000);

    expect(inRoom(IRON_BAR)).toHaveLength(0);
    const steel = inRoom(STEEL_BAR);
    expect(steel).toHaveLength(1);
    expect(MixinApi.isTangible(steel[0]!) && steel[0]!.getMaterial()!.getName())
      .toBe('steel');
    expect(MixinApi.isAlloyed(steel[0]!) && steel[0]!.fractionOf(CARBON))
      .toBeCloseTo(0.0156, 8);
  });

  it('⚠ hammering cannot double the metal, and it cannot halve it either', async () => {
    const b = bloom(1.3, 0.3 / 1.3, 0.0013);
    ContainmentApi.move(b, room);
    await step(HeatController, b, 4000);
    await step(HammerController, b, 5000);
    const bar = inRoom(IRON_BAR)[0]!;
    const before = MixinApi.isTangible(bar) ? bar.getMass().rawValue() : 0;

    // The bloom is gone, so a second blow lands on the BAR — ordinary
    // forming work, which squeezes nothing.
    await step(HeatController, bar, 4000);
    await step(HammerController, bar, 5000);
    expect(MixinApi.isTangible(bar) && bar.getMass().rawValue()).toBeCloseTo(before, 9);
    expect(inRoom(SLAG)).toHaveLength(1);
  });
});

describe('⚠⚠ cast iron refuses, and the refusal says what it is', () => {
  it('hammer declines a pig by name', async () => {
    const p = pig();
    ContainmentApi.move(p, room);
    await step(HeatController, p, 4000);

    const context = makeContext(actor, room, 'hammer pig');
    await ExecutionContextApi.runRoot(null, 'test', async () => {
      ExecutionContextApi.tagActingAuthor(actor);
      await makeStuff(() => new HammerController()).execute(
        { target: ref(p, 'pig') } as never,
        context,
      );
    });
    expect(
      context.getNotes().find((n) => n.kind === 'controller-rejected')?.reason,
    ).toBe('unforgeable');
    // …and it is still a pig. A refusal costs nothing.
    expect(p.isDestroyed()).toBe(false);
  });

  it('⭐ the tag is what actually stops it — no verb had to be told about cast iron', () => {
    expect(material(CAST_IRON).getTags()).not.toContain('forgeable');
    expect(material(IRON).getTags()).toContain('forgeable');
    expect(material(STEEL).getTags()).toContain('forgeable');
    // …and a bloom is not forgeable either, which is why no anvil recipe
    // can take one and consolidation had to be its own act.
    expect(material(BLOOM_IRON).getTags()).not.toContain('forgeable');
  });
});

describe('⭐⭐ quench on an un-worked hot piece is a HEAT TREATMENT', () => {
  function bar(materialPath: string, carbon: number): Ingot {
    const i = makeStuff(() => new Ingot());
    stampTemplatePathForTest(i, materialPath === STEEL ? STEEL_BAR : IRON_BAR);
    i.setMaterial(material(materialPath));
    i.setMass(Quantity.of(0.5, 'kg'));
    if (carbon > 0) i.setFractionOf(CARBON, carbon);
    return i;
  }

  it('⭐ wrought iron: NOTHING, and the scene says so — quenching is not a ritual', async () => {
    const b = bar(IRON, 0);
    ContainmentApi.move(b, room);
    await step(HeatController, b, 4000);
    await step(QuenchController, b, 2500);
    expect(b.isDestroyed()).toBe(false);
    expect(b.getTemper()).toBe('none');
  });

  it('⭐⭐ steel: it HARDENS — the carbon caught where it stood', async () => {
    const b = bar(STEEL, 0.006);
    ContainmentApi.move(b, room);
    await step(HeatController, b, 4000);
    await step(QuenchController, b, 2500);
    expect(b.getTemper()).toBe('hardened');
  });

  it('⭐ …and the next HEAT anneals it back, which is why a smith quenches last', async () => {
    const b = bar(STEEL, 0.006);
    ContainmentApi.move(b, room);
    await step(HeatController, b, 4000);
    await step(QuenchController, b, 2500);
    expect(b.getTemper()).toBe('hardened');
    await step(HeatController, b, 4000);
    expect(b.getTemper()).toBe('none');
  });

  it('⚠⚠ cast iron: it CRACKS, and you have two halves of it', async () => {
    const p = pig();
    ContainmentApi.move(p, room);
    await step(HeatController, p, 4000);
    await step(QuenchController, p, 2500);

    expect(p.isDestroyed()).toBe(true);
    const halves = inRoom(PIG);
    expect(halves).toHaveLength(2);
    // Mass is conserved: nothing was lost, only broken.
    const total = halves.reduce(
      (sum, h) => sum + (MixinApi.isTangible(h) ? h.getMass().rawValue() : 0),
      0,
    );
    expect(total).toBeCloseTo(1, 6);
  });
});
