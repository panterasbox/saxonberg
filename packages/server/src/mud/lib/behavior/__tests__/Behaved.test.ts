/**
 * Engine tests for BehavedMixin + the path-resolved brain seam. Uses
 * fixture "probe" brains (which log fires to globalThis) on minimal
 * hand-built hosts, so the engine's wiring / cadence / presence-gating /
 * per-fire re-resolve / witness dispatch / slot contention are exercised
 * without a full Character clone.
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import type { MessageFrame } from '@saxonberg/types';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Idea } from '../../stuff/Idea';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { SensorMixin } from '../../message/Sensor';
import { EngagedMixin } from '../../activity/Engaged';
import type { Engagement } from '../../../api/scheduler';
import { SchedulerApi } from '../../../api/scheduler';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { BehavedMixin } from '../Behaved';

const PROBE = '/lib/behavior/__tests__/fixtures/probe';
const GUARDED = '/lib/behavior/__tests__/fixtures/probe-guarded';

class TestRoom extends ContainerMixin(Idea) {}
class TestNPC extends BehavedMixin(
  EngagedMixin(SensorMixin(ContainableMixin(Idea)))
) {}
class TestPlayer extends SensorMixin(ContainableMixin(Idea)) {}

type NPC = TestNPC & {
  postRegister(c?: unknown): Promise<void>;
  onMessage(f: MessageFrame): void;
  behaviors: unknown[];
};

interface ProbeFire {
  subject: string | null;
  source: string;
}
function fires(): ProbeFire[] {
  return (globalThis as unknown as { __probeFires: ProbeFire[] }).__probeFires;
}
function guardedFires(): number {
  return (globalThis as unknown as { __guardedFires: number }).__guardedFires;
}

function movementFrame(): MessageFrame {
  return {
    id: 'mf1',
    topic: 'world.narration.movement',
    body: 'someone arrives.',
    meta: { timestamp: 0 },
  };
}

beforeAll(async () => {
  // Warm both fixture brain paths so postRegister's resolveExport is a
  // synchronous registry hit under fake timers.
  await StuffApi.resolveExport(PROBE, 'brain');
  await StuffApi.resolveExport(GUARDED, 'brain');
});

beforeEach(() => {
  (globalThis as unknown as { __probeFires: ProbeFire[] }).__probeFires = [];
  (globalThis as unknown as { __guardedFires: number }).__guardedFires = 0;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('StuffApi.resolveExport (the brain-path seam)', () => {
  it('resolves a named class-expression export by path', () => {
    const cls = StuffApi.resolveExportSync(PROBE, 'brain') as {
      label: string;
    } | null;
    expect(cls).not.toBeNull();
    expect(cls?.label).toBe('probe');
  });

  it('returns null for an unresolvable path', async () => {
    expect(await StuffApi.resolveExport('/lib/behavior/nope', 'brain')).toBeNull();
    expect(StuffApi.resolveExportSync('/lib/behavior/nope', 'brain')).toBeNull();
  });

  it('returns null for an invalid (non-/lib) path', async () => {
    expect(await StuffApi.resolveExport('/etc/passwd', 'brain')).toBeNull();
  });
});

describe('cadence wiring + presence gating', () => {
  it('does not fire in an empty room, fires once a player is present', async () => {
    vi.useFakeTimers();
    const room = makeStuff(() => new TestRoom());
    const npc = makeStuff(() => new TestNPC()) as unknown as NPC;
    ContainmentApi.move(npc as never, room as never);
    npc.behaviors = [{ brain: PROBE, trigger: 'cadence:1s' }];
    await npc.postRegister();

    await vi.advanceTimersByTimeAsync(3000);
    expect(fires().length).toBe(0); // presence-gated, no audience

    const player = makeStuff(() => new TestPlayer());
    ContainmentApi.move(player as never, room as never);
    await vi.advanceTimersByTimeAsync(3000);
    expect(fires().length).toBeGreaterThan(0);
    expect(fires()[0]?.source).toBe('cadence');
  });

  it('re-resolves the brain on every fire (HMR seam)', async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(StuffApi, 'resolveExportSync');
    const room = makeStuff(() => new TestRoom());
    const npc = makeStuff(() => new TestNPC()) as unknown as NPC;
    const player = makeStuff(() => new TestPlayer());
    ContainmentApi.move(npc as never, room as never);
    ContainmentApi.move(player as never, room as never);
    npc.behaviors = [{ brain: PROBE, trigger: 'cadence:1s' }];
    await npc.postRegister();

    await vi.advanceTimersByTimeAsync(3000);
    const fired = fires().length;
    expect(fired).toBeGreaterThan(0);
    // One resolveExportSync per fire — proves no captured reference.
    expect(spy.mock.calls.filter((c) => c[0] === PROBE).length).toBe(fired);
  });
});

describe('witness dispatch (arrival)', () => {
  it('fires an arrival brain with the new occupant as subject', async () => {
    const room = makeStuff(() => new TestRoom());
    const npc = makeStuff(() => new TestNPC()) as unknown as NPC;
    ContainmentApi.move(npc as never, room as never);
    npc.behaviors = [{ brain: PROBE, trigger: 'arrival' }];
    await npc.postRegister(); // seen-set seeded empty (no players yet)

    const player = makeStuff(() => new TestPlayer());
    ContainmentApi.move(player as never, room as never);
    npc.onMessage(movementFrame());

    const arrival = fires().find((f) => f.source === 'witness');
    expect(arrival).toBeDefined();
    expect(arrival?.subject).toBe((player as unknown as { stuffId: string }).stuffId);
  });
});

describe('slot contention (requiresFree yields while a slot is occupied)', () => {
  it('a cadence brain yields while attention is occupied, resumes after', async () => {
    vi.useFakeTimers();
    const room = makeStuff(() => new TestRoom());
    const npc = makeStuff(() => new TestNPC()) as unknown as NPC;
    ContainmentApi.move(npc as never, room as never);
    npc.behaviors = [{ brain: GUARDED, trigger: 'cadence:1s' }]; // not presence-gated
    await npc.postRegister();

    await vi.advanceTimersByTimeAsync(3000);
    const before = guardedFires();
    expect(before).toBeGreaterThan(0);

    // Occupy `attention` with a sustained engagement (no completion timer).
    const occupier: Engagement = {
      engagementId: '',
      type: 'test-occupier',
      actor: npc as never,
      startedAt: 0,
      slots: new Set(['attention']),
      interruptibleBy: new Set(),
      cancelable: true,
      onStart() {},
      onAbort() {},
    };
    SchedulerApi.start(occupier);

    await vi.advanceTimersByTimeAsync(3000);
    expect(guardedFires()).toBe(before); // yielded — attention occupied

    SchedulerApi.cancel(occupier, 'cancelled');
    await vi.advanceTimersByTimeAsync(3000);
    expect(guardedFires()).toBeGreaterThan(before); // resumed
  });
});
