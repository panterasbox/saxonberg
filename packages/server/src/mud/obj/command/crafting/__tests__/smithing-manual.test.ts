/**
 * The by-hand smithing path — heat / hammer / quench over the workpiece
 * (the ingot IS the build buffer). Covers: heat latches the reached K
 * (and declines with no fire); hammer declines without a hammer/anvil
 * and banks the forming work once; quench reverse-matches and mints the
 * recipe output (material + mass flowed from the workpiece, workpiece
 * consumed); an off-spec build (heat too low for the knife's 1400 K)
 * mints the generic worked lump with `recipeId ''`; and a barge-in
 * mid-step leaves the buffer partial.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import HeatController from '../HeatController';
import HammerController from '../HammerController';
import QuenchController from '../QuenchController';
import { SchedulerApi } from '../../../../api/scheduler';
import { WorldClockApi } from '../../../../api/worldclock';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { MixinApi } from '../../../../api/mixin';
import { Quantity } from '../../../../lib/quantity';
import Material from '../../../../lib/material/Material';
import Ingot from '../../../Ingot';
import Casting from '../../../Casting';
import { ExecutionContextApi } from '../../../../api/execution-context';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import {
  TestActor,
  TestKnife,
  IRON,
  standUpBranchHarness,
  makeContext,
  ref,
  completeStep,
  makeLitForge,
  makeTool,
} from './branch-fixtures';

/** Run a controller execute with `actor` tagged as the acting author. */
async function executeAs(
  who: Stuff,
  fn: () => void | Promise<void>,
): Promise<void> {
  await ExecutionContextApi.runRoot(null, 'test', async () => {
    ExecutionContextApi.tagActingAuthor(who);
    await fn();
  });
}
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

let seq = 0;
let room: TestActor;
let actor: TestActor;

function makeIngot(massKg = 0.5): Ingot {
  const i = makeStuff(() => new Ingot());
  i.setMass(Quantity.of(massKg, 'kg'));
  i.setMaterial(
    StuffApi.findByTemplatePath<Material>(IRON) as unknown as Material,
  );
  return i;
}

beforeEach(async () => {
  await standUpBranchHarness();
  room = makeStuff(() => new TestActor());
  actor = makeStuffAtPath(() => new TestActor(), `/obj/Avatar/smith-${seq++}`);
  ContainmentApi.move(actor, room);
});

afterEach(() => {
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
});

describe('the by-hand smithing path', () => {
  it('heat latches the reached K; declines with no fire', async () => {
    const ingot = makeIngot();
    ContainmentApi.move(ingot, room);

    // No fire → diegetic decline, nothing latched.
    const cold = makeContext(actor, room, 'heat ingot');
    await executeAs(actor, () =>
      makeStuff(() => new HeatController()).execute(
        { target: ref(ingot, 'ingot') } as never,
        cold,
      ),
    );
    expect(
      cold.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
    expect(ingot.getHeatedToK()).toBe(0);

    // A lit, bellowsed forge → the step latches 2080 K at completion.
    ContainmentApi.move(makeLitForge(true), room);
    await executeAs(actor, () =>
      makeStuff(() => new HeatController()).execute(
        { target: ref(ingot, 'ingot') } as never,
        makeContext(actor, room, 'heat ingot'),
      ),
    );
    expect(ingot.getHeatedToK()).toBe(0); // not at dispatch —
    await completeStep(4000);
    expect(ingot.getHeatedToK()).toBeCloseTo(2080, 6); // — at completion
  });

  it('hammer declines without hammer/anvil, banks the forming work once', async () => {
    const ingot = makeIngot();
    ContainmentApi.move(ingot, room);
    ContainmentApi.move(makeLitForge(true), room);
    await executeAs(actor, () =>
      makeStuff(() => new HeatController()).execute(
        { target: ref(ingot, 'ingot') } as never,
        makeContext(actor, room, 'heat ingot'),
      ),
    );
    await completeStep(4000);

    // No hammer/anvil → decline.
    const bare = makeContext(actor, room, 'hammer ingot');
    await executeAs(actor, () =>
      makeStuff(() => new HammerController()).execute(
        { target: ref(ingot, 'ingot') } as never,
        bare,
      ),
    );
    expect(
      bare.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
    expect(ingot.isBuildEmpty()).toBe(true);

    // Hammer + anvil in reach → the forming work banks the workpiece once.
    ContainmentApi.move(makeTool('striking'), room);
    ContainmentApi.move(makeTool('anvil'), room);
    for (let i = 0; i < 2; i++) {
      await executeAs(actor, () =>
        makeStuff(() => new HammerController()).execute(
          { target: ref(ingot, 'ingot') } as never,
          makeContext(actor, room, 'hammer ingot'),
        ),
      );
      await completeStep(5000);
    }
    const contributions = ingot.getContributions();
    expect(contributions).toHaveLength(1); // hammering more never multiplies
    expect(contributions[0]).toMatchObject({ kind: 'item', count: 1 });
    expect(contributions[0]!.tags).toContain('ferrous');
  });

  it('quench mints the recipe-matched knife: material flowed, workpiece consumed', async () => {
    const ingot = makeIngot(0.5);
    ContainmentApi.move(ingot, room);
    ContainmentApi.move(makeLitForge(true), room); // 2080 K ≥ the 1400 gate
    ContainmentApi.move(makeTool('striking'), room);
    ContainmentApi.move(makeTool('anvil'), room);

    for (const [Ctor, ms] of [
      [HeatController, 4000],
      [HammerController, 5000],
      [QuenchController, 2500],
    ] as const) {
      await executeAs(actor, () =>
        makeStuff(() => new Ctor()).execute(
          { target: ref(ingot, 'ingot') } as never,
          makeContext(actor, room, 'step'),
        ),
      );
      await completeStep(ms);
    }

    // The knife: in the maker's hands, iron, the ingot's mass, stamped.
    const knife = actor.getContents().find((c) => c instanceof TestKnife);
    expect(knife).toBeDefined();
    if (!knife || !MixinApi.isTangible(knife)) return;
    expect(knife.getMaterial()?.getName()).toBe('iron');
    expect(knife.getMass().rawValue()).toBeCloseTo(0.5, 9);
    expect((knife as unknown as { getRecipe(): string }).getRecipe()).toBe(
      'belt-knife',
    );
    expect(ingot.isDestroyed()).toBe(true);
  });

  it('an off-spec build (heat too low) mints the generic worked lump', async () => {
    const ingot = makeIngot(0.5);
    ContainmentApi.move(ingot, room);
    ContainmentApi.move(makeLitForge(false), room); // 1300 K < the 1400 gate
    ContainmentApi.move(makeTool('striking'), room);
    ContainmentApi.move(makeTool('anvil'), room);

    for (const [Ctor, ms] of [
      [HeatController, 4000],
      [HammerController, 5000],
      [QuenchController, 2500],
    ] as const) {
      await executeAs(actor, () =>
        makeStuff(() => new Ctor()).execute(
          { target: ref(ingot, 'ingot') } as never,
          makeContext(actor, room, 'step'),
        ),
      );
      await completeStep(ms);
    }

    const lump = actor.getContents().find((c) => c instanceof Casting);
    expect(lump).toBeDefined();
    if (!lump || !MixinApi.isTangible(lump)) return;
    expect(lump.getMaterial()?.getName()).toBe('iron'); // matter conserved
    expect(lump.getMass().rawValue()).toBeCloseTo(0.5, 9);
    expect(MixinApi.isCrafted(lump)).toBe(false); // no mark on a lump
    expect(ingot.isDestroyed()).toBe(true);
  });

  it('a barge-in mid-step leaves the buffer partial', async () => {
    const ingot = makeIngot();
    ContainmentApi.move(ingot, room);
    ContainmentApi.move(makeLitForge(true), room);
    await executeAs(actor, () =>
      makeStuff(() => new HeatController()).execute(
        { target: ref(ingot, 'ingot') } as never,
        makeContext(actor, room, 'heat ingot'),
      ),
    );
    // Barge in before the heat completes: nothing latches.
    SchedulerApi.cancelAll(actor);
    await completeStep(4000);
    expect(ingot.getHeatedToK()).toBe(0);
    expect(ingot.isBuildEmpty()).toBe(true);
    expect(ingot.isDestroyed()).toBe(false);
  });
});
