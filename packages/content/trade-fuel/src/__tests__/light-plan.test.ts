/**
 * ⭐ `CharcoalPit.lightPlan` — the clamp decides whether a burn starts
 * (controller-liquidity W9). Survey C11's two defects, pinned:
 *
 *  - "already burning" is asked of THIS clamp's watch — a kiln watched
 *    elsewhere (any `attention` engagement) used to read as adjusting this
 *    clamp, so it never lit;
 *  - a body that holds no watch is refused — it used to complete the
 *    three-day burn instantly.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CharcoalPit from '../thing/CharcoalPit';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ManualBuildStep } from '@saxonberg/server/mud/lib/craft/ManualBuildStep';
import {
  TestActor,
  standUpBranchHarness,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

let room: TestActor;
let actor: TestActor;

beforeEach(async () => {
  await standUpBranchHarness();
  room = makeStuff(() => new TestActor());
  actor = makeStuff(() => new TestActor());
  ContainmentApi.move(actor, room);
});

afterEach(() => {
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
});

function clamp(): CharcoalPit {
  const pit = makeStuff(() => new CharcoalPit());
  ContainmentApi.move(pit, room);
  return pit;
}

function watch(host: CharcoalPit, by: TestActor = actor): void {
  const step = new ManualBuildStep({
    actor: by,
    slots: ['attention'],
    durationMs: 60_000,
    onComplete: () => {},
    host,
  });
  SchedulerApi.start(step);
}

describe('the clamp decides whether a burn starts', () => {
  it('⚠ a body that holds no watch is refused, never handed a three-day burn at once', () => {
    const pit = clamp();
    const plank = makeStuff(() => new Good());
    const out = pit.lightPlan(plank);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('cannot-watch');
  });

  it('an empty clamp is refused', () => {
    const out = clamp().lightPlan(actor);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('empty-clamp');
  });

  it('⭐ watching THIS clamp is "already burning"; watching another is not', () => {
    const mine = clamp();
    const other = clamp();
    watch(other);
    const elsewhere = mine.lightPlan(actor);
    // Another clamp's watch does not stand in for this one: it is refused
    // for what it is (empty), not as "already burning".
    expect(elsewhere.ok).toBe(false);
    if (!elsewhere.ok) expect(elsewhere.reason).toBe('empty-clamp');
    const collier = makeStuff(() => new TestActor());
    ContainmentApi.move(collier, room);
    watch(mine, collier);
    const here = mine.lightPlan(collier);
    expect(here.ok).toBe(false);
    if (!here.ok) expect(here.reason).toBe('watching');
  });
});
