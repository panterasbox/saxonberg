/**
 * AudibleMixin — the discrete-event emit facade.
 *
 * Exercises `emit(...)` end to end: it composes a Scene, stamps
 * `acousticDb`, and pushes through `Scene.toAudible`. The modality gate
 * (`PerceptionApi.canPerceive`) is spied so bare test ears need no
 * BodyPlan.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudibleMixin } from '../Audible';
import { MixinApi } from '../../../api/mixin';
import { PerceptionApi } from '../../../api/perception';
import { SensorMixin } from '../../message/Sensor';
import { ContainableMixin } from '../../spatial/Containable';
import CartesianLocation from '../../location/CartesianLocation';
import CartesianZone from '../../../obj/location/CartesianZone';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../modalities/__tests__/test-helpers';
import type { MessageFrame } from '@saxonberg/types';

class Whistle extends AudibleMixin(ContainableMixin(Idea)) {}
class RecordingEar extends SensorMixin(ContainableMixin(Idea)) {
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

function room(zone: CartesianZone, x: number, y: number): CartesianLocation {
  const loc = makeStuff(() => new CartesianLocation());
  zone.addLocation(loc, x, y, 0);
  return loc;
}

describe('AudibleMixin.emit', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
    buildAllModalities();
    vi.spyOn(PerceptionApi, 'canPerceive').mockReturnValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('registers as a mixin and narrows via MixinApi.isAudible', () => {
    const w = makeStuff(() => new Whistle());
    expect(MixinApi.isAudible(w)).toBe(true);
  });

  it('emits a heard frame to a same-room hearing sensor', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = room(zone, 0, 0);
    const ear = makeStuff(() => new RecordingEar());
    ContainmentApi.move(ear, a);
    const w = makeStuff(() => new Whistle());
    ContainmentApi.move(w, a);

    w.emit({
      db: 110,
      character: 'whistle',
      description: 'a sharp whistle',
      timbreHook: 'a rough trill',
    });

    expect(ear.received).toHaveLength(1);
    const frame = ear.received[0]!;
    expect(frame.topic).toBe('world.perception.ambient.sound');
    expect(frame.meta?.modality).toBe('hearing');
    expect(frame.meta?.acousticDb).toBe(110);
    // same-room full body from description + timbre.
    expect(frame.body).toContain('sharp whistle');
    expect(frame.body).toContain('rough trill');
  });

  it('reaches an adjacent room with a faint directional line', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = room(zone, 0, 0);
    const b = room(zone, 0, 1);
    await a.addBidirectionalExit(b, 'north');
    const ear = makeStuff(() => new RecordingEar());
    ContainmentApi.move(ear, b);
    const w = makeStuff(() => new Whistle());
    ContainmentApi.move(w, a);

    w.emit({ db: 110, character: 'whistle', description: 'a sharp whistle' });

    expect(ear.received).toHaveLength(1);
    const body = ear.received[0]!.body;
    expect(body).toContain('north');
    expect(body).toContain('whistle');
  });
});
