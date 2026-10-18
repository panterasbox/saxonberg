/**
 * The sharpen ritual — gates (no whetstone / broken whetstone /
 * non-edged target all decline), the Audible rasp at the start, the hone
 * at completion, the whetstone's own wear, and an abort restoring
 * nothing. Sharpening is the keenness axis ONLY — condition untouched.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SharpenController from '../SharpenController';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Weapon from '@saxonberg/server/mud/platform/thing/equipment/Weapon';
import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import Whetstone from '../../../../thing/Whetstone';
import { Construction } from '@saxonberg/server/mud/lib/material/Construction';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import {
  TestActor,
  standUpBranchHarness,
  makeContext,
  ref,
  completeStep,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

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

/**
 * ⚠ **Stand in for the BINDER.** `sharpen`'s `stone` is a declared arg
 * defaulting to `reachable:[capability.whetstone]`, so the binder finds
 * the stone and the controller just reads it. A hand-built model skips
 * the binder, so the harness resolves it the same way the view would —
 * the first carried thing offering `whetstone`.
 */
function boundStone(): { stuff: unknown; raw: string } | undefined {
  const held = (actor as unknown as { getContents(): unknown[] }).getContents();
  const found = held.find((i) => {
    const t = i as { hasCapability?(c: string): boolean };
    return typeof t.hasCapability === 'function' && t.hasCapability('whetstone');
  });
  return found === undefined ? undefined : { stuff: found, raw: 'whetstone' };
}

async function sharpen(blade: Weapon | Tool): Promise<CommandContext> {
  const ctx = makeContext(actor, room, 'sharpen knife');
  const stone = boundStone();
  makeStuff(() => new SharpenController()).execute(
    {
      blade: ref(blade, 'knife'),
      ...(stone ? { stone } : {}),
    } as never,
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

  it('⭐ every EDGED TOOL takes a hone — a billhook by its form (repair D3)', async () => {
    const hook = makeStuff(() => new Tool());
    hook.setConstruction(Construction.of('bladed'));
    hook.setMass(Quantity.of(0.6, 'kg'));
    hook.setKeenness(0.3);
    ContainmentApi.move(hook, actor);
    ContainmentApi.move(makeStone(), actor);
    expect(rejected(await sharpen(hook))).toBe(false);
    await completeStep(SHARPEN_MS);
    expect(hook.getKeenness()).toBe(1);
    // …and a hammer has none.
    const hammer = makeStuff(() => new Tool());
    ContainmentApi.move(hammer, actor);
    expect(rejected(await sharpen(hammer))).toBe(true);
  });

  it('⭐⭐ a WHOLE hones its edged part — the axe\'s head, not its haft (AC 11)', async () => {
    const axe = makeStuff(() => new Tool());
    axe.setMass(Quantity.of(2.4, 'kg'));
    axe.setBill({
      parts: [
        { part: 'head', template: '/x/axe-head', count: 1, role: 'structural', form: 'bladed' },
        { part: 'helve', template: '/x/helve', count: 1, role: 'structural' },
      ],
    });
    axe.ensureParts();
    axe.setLineKeenness('head', 0.2);
    ContainmentApi.move(axe, actor);
    ContainmentApi.move(makeStone(), actor);
    expect(axe.getKeennessBand()).toBe('blunted');
    expect(rejected(await sharpen(axe))).toBe(false);
    await completeStep(SHARPEN_MS);
    expect(axe.lineKeenness('head')).toBe(1);
    expect(axe.getLine('helve')!.keenness).toBeUndefined();
  });
});
