/**
 * Gus's crossing-ritual brain (Phase 5). Proves the two load-bearing
 * rules from the character sheet:
 *
 *   1. **Tally is a DEED, decoupled from the performance.** The mark
 *      lands on the witnessed arrival itself (synchronously in `act`),
 *      so an aborted / never-run ceremony still keeps the count.
 *   2. **The busy-hub batch.** Two simultaneous arrivals collapse to ONE
 *      performance, but each still tallies (N arrivals → N marks).
 *
 * Plus the key integration proof — the whistle blast during the ritual
 * is a real cross-room `Audible` emit HEARD by a hearing sensor in the
 * adjacent arrival-gate room — and that a departure (plain `greets`)
 * never tallies.
 *
 * The unit tests drive `brain.act` directly with a real host (a Container
 * carrying a real `CrossingLog` + `Watch`) and spy emission helpers, the
 * `brains.test.ts` shape one cardinality up. The integration tests drive
 * the full `BehavedMixin` witness path (move a player, `onMessage`), the
 * `Behaved.test.ts` + `Audible.test.ts` harnesses fused.
 */

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
import CartesianLocation from '../../location/CartesianLocation';
import CartesianZone from '../../location/CartesianZone';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { PerceptionApi } from '../../../api/perception';
import { ScheduleApi } from '../../../api/schedule';
import { SchedulerApi } from '../../../api/scheduler';
import { EventApi } from '../../../api/event';
import EventRegistry from '../../../obj/EventRegistry';
import { Stuff as StuffClass } from '../../stuff/Stuff';
import { BehavedMixin } from '../Behaved';
import { brain as ritual } from '../crossing-ritual';
import type { BrainContext } from '../brain';
import CrossingLog from '../../../domain/eternal/university-avenue/CrossingLog';
import Watch from '../../../obj/Watch';
import Whistle from '../../../domain/eternal/university-avenue/Whistle';
import { installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../perception/modalities/__tests__/test-helpers';
import type { Stuff } from '../../stuff/Stuff';

const RITUAL = '/lib/behavior/crossing-ritual';
const GREETS = '/lib/behavior/greets';

class TestNPC extends BehavedMixin(
  EngagedMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea))))
) {}
class TestPlayer extends SensorMixin(ContainableMixin(Idea)) {}
class RecordingEar extends SensorMixin(ContainableMixin(Idea)) {
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

type NPC = TestNPC & {
  postRegister(c?: unknown): Promise<void>;
  onMessage(f: MessageFrame): void;
  behaviors: unknown[];
};

function movementFrame(): MessageFrame {
  return {
    id: 'mf1',
    topic: 'world.narration.movement',
    body: 'someone arrives.',
    meta: { timestamp: 0 },
  };
}

/** A spied BrainContext over a real host, its `state` shareable across fires. */
function ritualCtx(
  host: Stuff,
  state: Record<string, unknown>,
  config: Record<string, unknown> = {}
): BrainContext & {
  say: ReturnType<typeof vi.fn>;
  emote: ReturnType<typeof vi.fn>;
  emoteFree: ReturnType<typeof vi.fn>;
} {
  const subject = makeStuff(() => new TestPlayer()) as unknown as Stuff;
  return {
    host,
    config,
    state,
    perceived: { frame: movementFrame() as never, subject },
    trigger: { source: 'witness', raw: 'arrival' },
    say: vi.fn(),
    emote: vi.fn(async () => undefined),
    emoteFree: vi.fn(),
  };
}

/** A Gus stand-in carrying a real CrossingLog + Watch (+ optional Whistle). */
function makeGus(withWhistle = false): { gus: Stuff; log: CrossingLog } {
  const gus = makeStuff(() => new TestNPC()) as unknown as Stuff;
  const log = makeStuff(() => new CrossingLog());
  const watch = makeStuff(() => new Watch());
  ContainmentApi.move(log as never, gus as never);
  ContainmentApi.move(watch as never, gus as never);
  if (withWhistle) {
    const whistle = makeStuff(() => new Whistle());
    ContainmentApi.move(whistle as never, gus as never);
  }
  return { gus, log };
}

describe('crossing-ritual brain (unit — tally decoupling + batch)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('declares its label + slot claims (idle chatter yields to it)', () => {
    expect(ritual.label).toBe('crossing-ritual');
    expect(ritual.claims).toEqual(['voice', 'attention']);
  });

  it('tallies on the witnessed arrival itself — decoupled, survives an aborted performance', () => {
    const { gus, log } = makeGus();
    const before = log.getMarks().length;
    const ctx = ritualCtx(gus, {});

    ritual.act(ctx);

    // The DEED fired synchronously, before any timer advance.
    expect(log.getMarks().length).toBe(before + 1);
    expect(ctx.say).not.toHaveBeenCalled();

    // Abort the scheduled performance outright, then let time pass.
    const handle = (ctx.state as { batchHandle?: { id: string } }).batchHandle;
    if (handle) ScheduleApi.cancel(handle as never);
    vi.advanceTimersByTime(5000);

    // Performance never ran — yet the mark stands.
    expect(ctx.say).not.toHaveBeenCalled();
    expect(log.getMarks().length).toBe(before + 1);
  });

  it('two simultaneous arrivals → ONE batched performance but TWO marks', async () => {
    const { gus, log } = makeGus();
    const before = log.getMarks().length;
    const state: Record<string, unknown> = {};
    const ctx1 = ritualCtx(gus, state);
    const ctx2 = ritualCtx(gus, state); // SAME per-(host,spec) state

    ritual.act(ctx1);
    ritual.act(ctx2);

    // Both tallied immediately.
    expect(log.getMarks().length).toBe(before + 2);
    // No performance yet (still inside the coalescing window).
    expect(ctx1.say).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(4000);

    // Exactly ONE performance: the headline `say` fired once, batch-worded.
    expect(ctx1.say).toHaveBeenCalledTimes(1);
    expect(String(ctx1.say.mock.calls[0]?.[0])).toContain('the lot of you');
    // The performance rides the standard reactable helpers (Vocal/Soul →
    // ReactionApi.noteReactableAct), so a player can `react` to it.
    expect(ctx1.emoteFree).toHaveBeenCalled();
    // Still two marks — the batch never collapsed the count.
    expect(log.getMarks().length).toBe(before + 2);
  });

  it('a lone arrival speaks the solo headline', async () => {
    const { gus } = makeGus();
    const ctx = ritualCtx(gus, {});
    ritual.act(ctx);
    await vi.advanceTimersByTimeAsync(4000);
    expect(ctx.say).toHaveBeenCalledTimes(1);
    expect(String(ctx.say.mock.calls[0]?.[0])).not.toContain('the lot of you');
  });
});

describe('crossing-ritual brain (integration — cross-room whistle + no departure tally)', () => {
  beforeAll(async () => {
    // Warm the brain paths so postRegister's resolveExport is a sync hit.
    await StuffApi.resolveExport(RITUAL, 'brain');
    await StuffApi.resolveExport(GREETS, 'brain');
  });
  beforeEach(async () => {
    // Bootstrap the EventRegistry so the framework's slot-`claims` beat
    // (`SchedulerApi.start`, which subscribes to host-destruction) works
    // — the ritual claims voice+attention, so a witness fire starts a
    // BehaviorBeat. Mirrors SchedulerApi.hostDestruction.test's helper.
    SchedulerApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    const reg = await StuffApi.create(() => {
      const r = new EventRegistry();
      StuffClass._stampTemplatePath(r, '/obj/EventRegistry');
      return r;
    });
    StuffApi.unregister(reg);
    StuffApi.register(reg);
    EventApi._setRegistryForTesting(reg);

    installV1QuantityTagTables();
    buildAllModalities();
    vi.spyOn(PerceptionApi, 'canPerceive').mockReturnValue(true);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    SchedulerApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  function room(zone: CartesianZone, x: number, y: number): CartesianLocation {
    const loc = makeStuff(() => new CartesianLocation());
    zone.addLocation(loc, x, y, 0);
    return loc;
  }

  it("the ritual's whistle blast is HEARD in the adjacent arrival-gate room", async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const crossing = room(zone, 0, 0);
    const gate = room(zone, 0, 1); // arrival-gate, to the north
    await crossing.addBidirectionalExit(gate, 'north'); // doorless → sound passes

    // A hearing sensor in the ADJACENT room.
    const ear = makeStuff(() => new RecordingEar());
    ContainmentApi.move(ear as never, gate as never);

    // Gus in the crossing, carrying his real whistle + log + watch.
    const gus = makeStuff(() => new TestNPC()) as unknown as NPC;
    ContainmentApi.move(gus as never, crossing as never);
    const log = makeStuff(() => new CrossingLog());
    const watch = makeStuff(() => new Watch());
    const whistle = makeStuff(() => new Whistle());
    ContainmentApi.move(log as never, gus as never);
    ContainmentApi.move(watch as never, gus as never);
    ContainmentApi.move(whistle as never, gus as never);
    gus.behaviors = [{ brain: RITUAL, trigger: 'arrival' }];
    await gus.postRegister();

    // A player walks in from the terminal (the south-side arrival).
    const player = makeStuff(() => new TestPlayer());
    ContainmentApi.move(player as never, crossing as never);
    gus.onMessage(movementFrame());

    // The tally is a deed — already recorded, before the performance.
    expect(log.getMarks().length).toBe(1);
    expect(ear.received).toHaveLength(0); // performance hasn't fired yet

    // Run the coalesced performance's whistle beat.
    await vi.advanceTimersByTimeAsync(500);

    expect(ear.received.length).toBeGreaterThan(0);
    const body = ear.received[0]!.body;
    expect(body).toContain('whistle');
    expect(body).toContain('north'); // faint + directional, from the source
  });

  it('a departure (plain greets) does NOT tally', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const crossing = room(zone, 0, 0);
    const gate = room(zone, 0, 1);
    await crossing.addBidirectionalExit(gate, 'north');

    const gus = makeStuff(() => new TestNPC()) as unknown as NPC;
    ContainmentApi.move(gus as never, crossing as never);
    const log = makeStuff(() => new CrossingLog());
    const watch = makeStuff(() => new Watch());
    ContainmentApi.move(log as never, gus as never);
    ContainmentApi.move(watch as never, gus as never);
    gus.behaviors = [
      { brain: RITUAL, trigger: 'arrival' },
      { brain: GREETS, trigger: 'departure', config: { lines: ['see ya'] } },
    ];
    await gus.postRegister();

    // Arrive → one tally.
    const player = makeStuff(() => new TestPlayer());
    ContainmentApi.move(player as never, crossing as never);
    gus.onMessage(movementFrame());
    expect(log.getMarks().length).toBe(1);

    // Leave (south, back to the terminal) → the courteous see-off, NO tally.
    ContainmentApi.move(player as never, gate as never);
    gus.onMessage(movementFrame());
    expect(log.getMarks().length).toBe(1); // unchanged — departure never marks
  });
});
