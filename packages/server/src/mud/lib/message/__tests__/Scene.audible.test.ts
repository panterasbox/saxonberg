/**
 * Scene.toAudible — the discrete-event cross-room push delivery mode.
 *
 * Drives `MessageApi.scene(actor).toAudible(...).send()` directly and
 * asserts the fan-out: one frame per gathered hearing sensor, same-room
 * full body vs faint directional body, the threshold drop, and the
 * modality gate (no-hearing sensor excluded). The modality gate runs in
 * `SensorMixin.filterMessage` via `PerceptionApi.canPerceive`, spied
 * here so bare test sensors need no BodyPlan.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageApi } from '../../../api/message';
import { PerceptionApi } from '../../../api/perception';
import { SensorMixin } from '../Sensor';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import CartesianLocation from '../../location/CartesianLocation';
import CartesianZone from '../../location/CartesianZone';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../perception/modalities/__tests__/test-helpers';
import type { MessageFrame } from '@saxonberg/types';

class RecordingEar extends SensorMixin(ContainableMixin(Idea)) {
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}
// A pure emitter — Containable so Scene.toAudible accepts it as actor.
class Emitter extends ContainableMixin(Idea) {}
// A carrier (Container + Containable) to test enclosing-room resolution.
class Holder extends ContainerMixin(ContainableMixin(Idea)) {}

function room(zone: CartesianZone, x: number, y: number): CartesianLocation {
  const loc = makeStuff(() => new CartesianLocation());
  zone.addLocation(loc, x, y, 0);
  return loc;
}
function earIn(loc: CartesianLocation): RecordingEar {
  const e = makeStuff(() => new RecordingEar());
  ContainmentApi.move(e, loc);
  return e;
}
function pushAudible(
  emitter: Emitter,
  db: number,
  body: string,
  descriptor: string,
): void {
  MessageApi.scene(emitter)
    .topic('world.perception.ambient.sound')
    .modality('hearing')
    .meta({ acousticDb: db })
    .toAudible(body, { descriptor })
    .send();
}

describe('Scene.toAudible — cross-room push', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
    buildAllModalities();
    vi.spyOn(PerceptionApi, 'canPerceive').mockReturnValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('fans one frame per hearing sensor with attenuated directional bodies', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = room(zone, 0, 0);
    const b = room(zone, 0, 1);
    await a.addBidirectionalExit(b, 'north');
    const earA = earIn(a);
    const earB = earIn(b);
    const emitter = makeStuff(() => new Emitter());
    ContainmentApi.move(emitter, a);

    pushAudible(emitter, 110, 'A sharp whistle rings out!', 'whistle');

    // same room: exactly one frame, full body.
    expect(earA.received).toHaveLength(1);
    expect(earA.received[0]!.body).toBe('A sharp whistle rings out!');
    // adjacent: exactly one frame, faint directional body.
    expect(earB.received).toHaveLength(1);
    const faint = earB.received[0]!.body;
    expect(faint).toContain('north');
    expect(faint).toContain('whistle');
    expect(faint.toLowerCase()).toContain('faint');
  });

  it('drops recipients below the hearing threshold', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = room(zone, 0, 0);
    const b = room(zone, 0, 1);
    await a.addBidirectionalExit(b, 'north');
    const earA = earIn(a);
    const earB = earIn(b);
    const emitter = makeStuff(() => new Emitter());
    ContainmentApi.move(emitter, a);

    // 25 dB → one hop (-20 dB) lands at 5 dB, below the 10 dB floor.
    pushAudible(emitter, 25, 'a quiet click', 'click');

    expect(earA.received).toHaveLength(1);
    expect(earB.received).toHaveLength(0);
  });

  it('excludes a sensor with no hearing (modality gate)', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = room(zone, 0, 0);
    const earHear = earIn(a);
    const earDeaf = earIn(a);
    vi.spyOn(PerceptionApi, 'canPerceive').mockImplementation(
      (viewer) => (viewer as unknown) !== (earDeaf as unknown),
    );
    const emitter = makeStuff(() => new Emitter());
    ContainmentApi.move(emitter, a);

    pushAudible(emitter, 110, 'a blast', 'blast');

    expect(earHear.received).toHaveLength(1);
    expect(earDeaf.received).toHaveLength(0);
  });

  it('resolves the source room even when the emitter is carried', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = room(zone, 0, 0);
    const earA = earIn(a);
    const holder = makeStuff(() => new Holder());
    ContainmentApi.move(holder, a);
    const emitter = makeStuff(() => new Emitter());
    ContainmentApi.move(emitter, holder); // in a hand, not the room

    pushAudible(emitter, 110, 'a shrill blast', 'blast');

    // The room sensor still hears it — enclosingLocation walked up.
    expect(earA.received).toHaveLength(1);
    expect(earA.received[0]!.body).toBe('a shrill blast');
  });
});
