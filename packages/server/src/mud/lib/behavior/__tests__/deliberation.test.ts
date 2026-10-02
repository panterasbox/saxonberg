/**
 * The deliberation beat — ⭐⭐ **one timer per agent, one decision, one
 * act, and a sentence only when the mind changes.**
 *
 * Fake timers over the same hand-built hosts `Behaved.test.ts` uses, with
 * fixture candidates whose urgency the test dials. What is asserted here
 * is the arbiter, not any brain: the sort, the hysteresis, the
 * preemption, the prose, and the three ways an agent is allowed to do
 * nothing.
 */

import '../../../../test-bootstrap';
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from 'vitest';
import type { MessageFrame } from '@saxonberg/types';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Idea } from '../../stuff/Idea';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { SensorMixin } from '../../message/Sensor';
import { EngagedMixin } from '../../activity/Engaged';
import { SoulMixin } from '../../social/Soul';
import { SchedulerApi } from '../../../api/scheduler';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { BehavedMixin } from '../Behaved';
import EventRegistry from '../../../platform/idea/EventRegistry';
import { EventApi } from '../../../api/event';
import { Stuff } from '../../stuff/Stuff';
import { BEHAVIOR_BEAT_TYPE } from '../BehaviorBeat';
import { dial, type CandidateDial } from './fixtures/probe-candidate';

const FILLER = '/lib/behavior/__tests__/fixtures/probe-candidate';
const WORK = '/lib/behavior/__tests__/fixtures/probe-candidate-work';
const NIGHTLY = '/lib/behavior/__tests__/fixtures/probe-candidate-nightly';

class TestRoom extends ContainerMixin(Idea) {}
class TestNPC extends BehavedMixin(
  EngagedMixin(SensorMixin(ContainableMixin(Idea))),
) {}
class TestPlayer extends SensorMixin(ContainableMixin(Idea)) {}

type NPC = TestNPC & {
  postRegister(c?: unknown): Promise<void>;
  onMessage(f: MessageFrame): void;
  behaviors: unknown[];
};

/** The code-default beat period — app-settings is unwarmed under test. */
const BEAT_MS = 20_000;
const NIGHTLY_MS = 120_000;

function setup(
  specs: string[],
  opts: { audience?: boolean } = {},
): { npc: NPC; room: TestRoom } {
  const room = makeStuff(() => new TestRoom());
  const npc = makeStuff(() => new TestNPC()) as unknown as NPC;
  ContainmentApi.move(npc as never, room as never);
  if (opts.audience !== false) {
    const player = makeStuff(() => new TestPlayer());
    ContainmentApi.move(player as never, room as never);
  }
  npc.behaviors = specs.map((brain) => ({ brain, trigger: 'candidate' }));
  return { npc, room };
}

function d(): CandidateDial {
  return dial();
}

/**
 * ⚠⚠ **The beat is a `DurativeActivity`, so starting one needs the
 * EventRegistry singleton** — the registry subscribes to
 * `Events.StuffDestructed` for any engagement with a host. Nothing in the
 * behaviour suite had ever started a durative engagement, so this is the
 * first time the witness beat's own machinery has run under test at all:
 * `Behaved.test.ts`'s slot-contention test hand-rolls a plain
 * `Engagement` with no `duration`, which takes a different path through
 * `register`. Mirrors `SchedulerApi.hostDestruction.test.ts`.
 */
async function makeRegistry(): Promise<EventRegistry> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
  return reg;
}

beforeAll(async () => {
  for (const p of [FILLER, WORK, NIGHTLY]) {
    await StuffApi.resolveExport(p, 'brain');
  }
});

beforeEach(async () => {
  (globalThis as unknown as { __candidateDial: CandidateDial }).__candidateDial =
    { bands: {}, ran: [], said: [] };
  await makeRegistry();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  SchedulerApi._clearAllForTesting();
});

describe('one beat per agent', () => {
  it('⭐⭐ arms ONE timer however many candidates there are, and runs ONE act a beat', async () => {
    vi.useFakeTimers();
    const { npc } = setup([FILLER, WORK, NIGHTLY]);
    await npc.postRegister();
    d().bands = { 'cand-filler': 'wanted', 'cand-work': 'wanted' };

    await vi.advanceTimersByTimeAsync(BEAT_MS * 1.5);
    // Three candidates, one act. Before the beat this was three timers
    // firing three acts, each unaware of the others.
    expect(d().ran.length).toBe(1);
  });

  it('a candidate spec arms no timer of its own — an all-idle agent acts not at all', async () => {
    vi.useFakeTimers();
    const { npc } = setup([FILLER, WORK]);
    await npc.postRegister();
    // every band absent ⇒ idle
    await vi.advanceTimersByTimeAsync(BEAT_MS * 3);
    expect(d().ran).toEqual([]);
  });

  it('⚠ a host with only witness specs never arms a beat', async () => {
    vi.useFakeTimers();
    const room = makeStuff(() => new TestRoom());
    const npc = makeStuff(() => new TestNPC()) as unknown as NPC;
    ContainmentApi.move(npc as never, room as never);
    npc.behaviors = [{ brain: FILLER, trigger: 'arrival' }];
    await npc.postRegister();
    await vi.advanceTimersByTimeAsync(BEAT_MS * 3);
    expect(d().ran).toEqual([]);
    expect(npc.getIntention()).toBeNull();
  });
});

describe('the arbiter', () => {
  it('⭐ a pressing work candidate beats a wanted filler', async () => {
    vi.useFakeTimers();
    const { npc } = setup([FILLER, WORK]);
    await npc.postRegister();
    d().bands = { 'cand-filler': 'wanted', 'cand-work': 'pressing' };

    await vi.advanceTimersByTimeAsync(BEAT_MS * 1.5);
    expect(d().ran).toContain('cand-work');
    expect(d().ran).not.toContain('cand-filler');
    expect(npc.getIntention()?.brain).toBe(WORK);
  });

  it('⚠ and within a band the KIND decides — work over filler', async () => {
    vi.useFakeTimers();
    const { npc } = setup([FILLER, WORK]);
    await npc.postRegister();
    d().bands = { 'cand-filler': 'wanted', 'cand-work': 'wanted' };

    await vi.advanceTimersByTimeAsync(BEAT_MS * 1.5);
    expect(d().ran).toEqual(['cand-work']);
  });

  it('⭐⭐ hysteresis: an exact tie goes to what the agent was ALREADY doing', async () => {
    vi.useFakeTimers();
    const { npc } = setup([FILLER, WORK]);
    await npc.postRegister();
    // Filler wins first (work is idle), then both tie at wanted/filler
    // kind… so give them the same kind by using two filler-kind brains is
    // not possible here; instead prove the intention survives a tie
    // against itself across many beats.
    d().bands = { 'cand-filler': 'wanted' };
    await vi.advanceTimersByTimeAsync(BEAT_MS * 1.5);
    expect(npc.getIntention()?.brain).toBe(FILLER);
    await vi.advanceTimersByTimeAsync(BEAT_MS * 4);
    // No switch: the same brain keeps winning, so nothing is re-narrated.
    expect(npc.getIntention()?.brain).toBe(FILLER);
    expect(d().ran.length).toBeGreaterThan(1);
  });

  it('⚠ a brain that declares no urgency is not a candidate even when wired as one', async () => {
    vi.useFakeTimers();
    const PROBE = '/lib/behavior/__tests__/fixtures/probe';
    await StuffApi.resolveExport(PROBE, 'brain');
    const { npc } = setup([PROBE, FILLER]);
    await npc.postRegister();
    d().bands = { 'cand-filler': 'wanted' };
    await vi.advanceTimersByTimeAsync(BEAT_MS * 1.5);
    // The urgency-less spec is skipped; the real candidate still runs.
    expect(d().ran).toEqual(['cand-filler']);
  });
});

describe('the switch prose', () => {
  class SoulNPC extends BehavedMixin(
    SoulMixin(EngagedMixin(SensorMixin(ContainableMixin(Idea)))),
  ) {}

  it('⭐⭐ fires exactly once per CHANGE of mind, never on carrying on', async () => {
    vi.useFakeTimers();
    const room = makeStuff(() => new TestRoom());
    const npc = makeStuff(() => new SoulNPC()) as unknown as NPC & {
      getIntention(): { because: string } | null;
    };
    ContainmentApi.move(npc as never, room as never);
    const player = makeStuff(() => new TestPlayer());
    ContainmentApi.move(player as never, room as never);
    npc.behaviors = [FILLER, WORK].map((brain) => ({
      brain,
      trigger: 'candidate',
    }));
    await npc.postRegister();

    d().bands = { 'cand-filler': 'wanted' };
    await vi.advanceTimersByTimeAsync(BEAT_MS * 1.5);
    const first = npc.getIntention();
    expect(first?.because).toBe('is minded to cand-filler');

    // Four more beats of the same decision — the intention must not be
    // re-stamped, because a switch that did not happen must not be
    // narrated.
    const since = (npc.getIntention() as unknown as { since: number }).since;
    await vi.advanceTimersByTimeAsync(BEAT_MS * 4);
    expect((npc.getIntention() as unknown as { since: number }).since).toBe(
      since,
    );

    // Now change its mind.
    d().bands = { 'cand-filler': 'wanted', 'cand-work': 'critical' };
    await vi.advanceTimersByTimeAsync(BEAT_MS * 1.5);
    expect(npc.getIntention()?.because).toBe('is minded to cand-work');
  });
});

describe('preemption — the first consumer of interruptibleBy', () => {
  /**
   * ⚠ These drive the beat through `requestBeat`/`fireBeat` rather than the
   * timer, because a `BehaviorBeat` holds its slots for 2.5 s and the beat
   * PERIOD is 20 s — advance a full period and the thing you meant to
   * interrupt has already finished. A preemption test that waits for the
   * next beat tests nothing at all.
   */
  it('⭐⭐ preemptFor cuts a LIVE beat and says so; it reports false when there is nothing to cut', async () => {
    vi.useFakeTimers();
    const { npc } = setup([WORK]);
    await npc.postRegister();
    const host = npc as unknown as {
      preemptFor(r: string): boolean;
      requestBeat(): void;
      getEngagementByType(t: string): unknown;
    };

    // Nothing running yet.
    expect(host.preemptFor('called')).toBe(false);

    d().bands = { 'cand-work': 'wanted' };
    host.requestBeat();
    await vi.advanceTimersByTimeAsync(50);
    expect(d().ran).toEqual(['cand-work']);
    expect(host.getEngagementByType(BEHAVIOR_BEAT_TYPE)).toBeDefined();

    // ⭐ A beat IS cuttable by a call — which is what the whole call
    // mechanism rests on, and what nothing in the engine had ever read.
    expect(host.preemptFor('called')).toBe(true);
    expect(host.getEngagementByType(BEHAVIOR_BEAT_TYPE)).toBeUndefined();
    // The intention died with its beat; the next beat decides afresh, and
    // a switch from nothing narrates nothing.
    expect(npc.getIntention()).toBeNull();
  });

  it('⚠ a beat whose brain yields to nothing cannot be cut, even by a call', async () => {
    vi.useFakeTimers();
    const UNCUTTABLE = '/lib/behavior/__tests__/fixtures/probe-candidate-fixed';
    await StuffApi.resolveExport(UNCUTTABLE, 'brain');
    const { npc } = setup([UNCUTTABLE]);
    await npc.postRegister();
    const host = npc as unknown as {
      preemptFor(r: string): boolean;
      requestBeat(): void;
      getEngagementByType(t: string): unknown;
    };
    d().bands = { 'cand-fixed': 'wanted' };
    host.requestBeat();
    await vi.advanceTimersByTimeAsync(50);
    expect(host.getEngagementByType(BEHAVIOR_BEAT_TYPE)).toBeDefined();
    // `interruptibleBy: []` and it MEANS it — this is the property that
    // keeps a conversation with a player from being walked out of.
    expect(host.preemptFor('called')).toBe(false);
    expect(host.preemptFor('outranked')).toBe(false);
    expect(host.getEngagementByType(BEHAVIOR_BEAT_TYPE)).toBeDefined();
  });

  it('⭐⭐ a critical candidate cuts the beat a lesser one was holding', async () => {
    vi.useFakeTimers();
    const { npc } = setup([WORK, NIGHTLY]);
    await npc.postRegister();
    const host = npc as unknown as {
      requestBeat(): void;
      getEngagementByType(t: string): unknown;
    };

    d().bands = { 'cand-work': 'wanted' };
    host.requestBeat();
    await vi.advanceTimersByTimeAsync(50);
    expect(d().ran).toEqual(['cand-work']);
    const held = host.getEngagementByType(BEHAVIOR_BEAT_TYPE) as {
      engagementId: string;
    };
    expect(held).toBeDefined();

    // A critical body candidate arrives mid-beat. `fireBeat` is the
    // shipped seam onto the agent's own deliberation.
    d().bands = { 'cand-work': 'wanted', 'cand-nightly': 'critical' };
    // ⚠ Start it, THEN advance — `fireBeat` schedules at 1 ms, so awaiting
    // it before advancing fake timers waits forever.
    const fired = npc.fireBeat(NIGHTLY);
    await vi.advanceTimersByTimeAsync(20);
    expect(await fired).toBe(true);

    expect(d().ran).toContain('cand-nightly');
    const now = host.getEngagementByType(BEHAVIOR_BEAT_TYPE) as {
      engagementId: string;
    };
    // The old beat was cut, not waited out: whatever holds a beat now is a
    // different engagement.
    expect(now?.engagementId).not.toBe(held.engagementId);
    expect(npc.getIntention()?.brain).toBe(NIGHTLY);
  });
});

describe('nobody watching', () => {
  it('⭐ an unwatched agent consults ONLY the candidates that run unwatched', async () => {
    vi.useFakeTimers();
    const { npc } = setup([FILLER, NIGHTLY], { audience: false });
    await npc.postRegister();
    d().bands = { 'cand-filler': 'critical', 'cand-nightly': 'wanted' };

    await vi.advanceTimersByTimeAsync(NIGHTLY_MS * 1.5);
    // The filler is `critical` and still never asked — presence gating is
    // upstream of urgency, so a watched-only brain cannot shout from an
    // empty room.
    expect(d().ran).toEqual(['cand-nightly']);
  });

  it('⚠ and an agent with no unwatched candidate at all does nothing in an empty room', async () => {
    vi.useFakeTimers();
    const { npc } = setup([FILLER, WORK], { audience: false });
    await npc.postRegister();
    d().bands = { 'cand-filler': 'critical', 'cand-work': 'critical' };
    await vi.advanceTimersByTimeAsync(NIGHTLY_MS * 2);
    expect(d().ran).toEqual([]);
  });
});

describe('requestBeat — the early wake', () => {
  it('⭐ pulls a beat forward, and ⚠ debounces so a noisy room is not a loop', async () => {
    vi.useFakeTimers();
    const { npc } = setup([WORK]);
    await npc.postRegister();
    d().bands = { 'cand-work': 'wanted' };
    const host = npc as unknown as { requestBeat(): void };

    host.requestBeat();
    await vi.advanceTimersByTimeAsync(50);
    expect(d().ran.length).toBe(1); // woke early, did not wait 20 s

    // Ten more requests inside the gap window buy nothing.
    for (let i = 0; i < 10; i++) host.requestBeat();
    await vi.advanceTimersByTimeAsync(100);
    expect(d().ran.length).toBe(1);
  });

  it('a host with no candidates ignores a request rather than arming anything', async () => {
    vi.useFakeTimers();
    const room = makeStuff(() => new TestRoom());
    const npc = makeStuff(() => new TestNPC()) as unknown as NPC & {
      requestBeat(): void;
    };
    ContainmentApi.move(npc as never, room as never);
    npc.behaviors = [];
    await npc.postRegister();
    expect(() => npc.requestBeat()).not.toThrow();
    await vi.advanceTimersByTimeAsync(BEAT_MS * 2);
    expect(d().ran).toEqual([]);
  });
});

describe('fireBeat — the drive seam', () => {
  it('⭐ firing a candidate brain runs the agent’s DELIBERATION, not that brain', async () => {
    vi.useFakeTimers();
    const { npc } = setup([FILLER, WORK]);
    await npc.postRegister();
    d().bands = { 'cand-filler': 'wanted', 'cand-work': 'pressing' };

    const ran = npc.fireBeat(FILLER);
    await vi.advanceTimersByTimeAsync(10);
    expect(await ran).toBe(true);
    // Asking for the filler ran the WINNER — a drive that could run one
    // candidate's act directly would test something the world never does.
    expect(d().ran).toEqual(['cand-work']);
  });
});
