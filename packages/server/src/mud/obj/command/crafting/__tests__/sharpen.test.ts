/**
 * The sharpen ritual — gates (no whetstone / broken whetstone /
 * non-edged target all decline), the Audible rasp at the start, the hone
 * at completion, the whetstone's own wear, and an abort restoring
 * nothing. Sharpening is the keenness axis ONLY — condition untouched.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SharpenController from '../SharpenController';
import { SchedulerApi } from '../../../../api/scheduler';
import { WorldClockApi } from '../../../../api/worldclock';
import { ContainmentApi } from '../../../../api/containment';
import { Quantity } from '../../../../lib/quantity';
import Weapon from '../../../../lib/equipment/Weapon';
import Whetstone from '../../../../lib/craft/Whetstone';
import { Construction } from '../../../../lib/material/Construction';
import type { CommandContext } from '../../../../api/command';
import {
  TestActor,
  standUpBranchHarness,
  makeContext,
  ref,
  completeStep,
} from './branch-fixtures';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';

const SHARPEN_MS = 12000;

let room: TestActor;
let actor: TestActor;

function makeBlade(keenness: number): Weapon {
  const w = makeStuff(() => new Weapon());
  w.setConstruction(Construction.of('bladed'));
  w.setMass(Quantity.of(0.2, 'kg'));
  w.setKeenness(keenness);
  return w;
}

function makeStone(): Whetstone {
  return makeStuff(() => new Whetstone());
}

async function sharpen(blade: Weapon): Promise<CommandContext> {
  const ctx = makeContext(actor, room, 'sharpen knife');
  makeStuff(() => new SharpenController()).execute(
    { blade: ref(blade, 'knife') } as never,
    ctx,
  );
  return ctx;
}

function rejected(ctx: CommandContext): boolean {
  return ctx.getNotes().some((n) => n.kind === 'controller-rejected');
}

beforeEach(async () => {
  await standUpBranchHarness();
  room = makeStuff(() => new TestActor());
  actor = makeStuff(() => new TestActor());
  ContainmentApi.move(actor, room);
});

afterEach(() => {
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
});

describe('sharpen', () => {
  it('declines with no whetstone, a broken whetstone, or no edge', async () => {
    const blade = makeBlade(0.4);
    ContainmentApi.move(blade, actor);

    // No stone at all.
    expect(rejected(await sharpen(blade))).toBe(true);

    // A broken stone offers nothing (hasCapability goes dark).
    const stone = makeStone();
    stone.setCondition(0.05);
    ContainmentApi.move(stone, actor);
    expect(rejected(await sharpen(blade))).toBe(true);

    // A working stone, but a formless target has no edge to hold.
    stone.setCondition(1);
    const mace = makeStuff(() => new Weapon());
    mace.setConstruction(Construction.of('hafted')); // blunt — no edge
    ContainmentApi.move(mace, actor);
    expect(rejected(await sharpen(mace))).toBe(true);
  });

  it('emits the rasp, hones at completion, and wears the stone', async () => {
    const blade = makeBlade(0.4);
    const stone = makeStone();
    ContainmentApi.move(blade, actor);
    ContainmentApi.move(stone, actor);
    const emit = vi.spyOn(stone, 'emit');

    const ctx = await sharpen(blade);
    expect(rejected(ctx)).toBe(false);
    // The room hears the ritual from the start.
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ character: expect.stringContaining('rasp') }),
    );
    // Not yet — the hone lands at completion.
    expect(blade.getKeenness()).toBeCloseTo(0.4, 9);

    await completeStep(SHARPEN_MS);
    expect(blade.getKeenness()).toBe(1); // keen again
    expect(stone.getCondition()).toBeLessThan(1); // the stone wears
    expect(blade.getCondition()).toBe(1); // structure untouched
  });

  it('an abort restores nothing', async () => {
    const blade = makeBlade(0.4);
    const stone = makeStone();
    ContainmentApi.move(blade, actor);
    ContainmentApi.move(stone, actor);

    await sharpen(blade);
    SchedulerApi.cancelAll(actor); // barge-in mid-ritual
    await completeStep(SHARPEN_MS);
    expect(blade.getKeenness()).toBeCloseTo(0.4, 9);
    expect(stone.getCondition()).toBe(1);
  });
});
