/**
 * ⭐ `Assaying.assayPlanFor` — the instrument takes the batch
 * (controller-liquidity W9, survey C18): the samples are HANDED OVER, into
 * the instrument, at dispatch — a customer can no longer sell, drop or
 * re-assay what is already in the fire. The fire itself is the world
 * clock's, and is not run here.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import AssayKit from '../thing/instrument/AssayKit';
import Ore from '../thing/Ore';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import {
  TestActor,
  standUpBranchHarness,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the instrument takes the batch', () => {
  it('⭐ a field kit takes the samples INTO itself and lights the fire; nothing of yours is left in hand', async () => {
    await standUpBranchHarness();
    const after = vi.spyOn(WorldClockApi, 'after').mockReturnValue({} as never);
    const room = makeStuff(() => new TestActor());
    const actor = makeStuff(() => new TestActor());
    ContainmentApi.move(actor, room);
    const kit = makeStuff(() => new AssayKit());
    ContainmentApi.move(kit, actor);
    const lump = makeStuff(() => new Ore());
    ContainmentApi.move(lump, actor);

    const plan = await kit.assayPlanFor(actor, [lump]);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const done = await plan.onComplete();
    expect(done.ok).toBe(true);
    expect(lump.getContainer()).toBe(kit);
    expect(after).toHaveBeenCalledTimes(1);
    if (done.ok) expect(done.facts).toMatchObject({ kind: 'started', count: 1, fixed: false });
  });

  it('nothing sampled is refused', async () => {
    await standUpBranchHarness();
    const actor = makeStuff(() => new TestActor());
    const kit = makeStuff(() => new AssayKit());
    const out = await kit.assayPlanFor(actor, []);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('no-samples');
  });
});
