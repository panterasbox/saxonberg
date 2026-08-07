/**
 * Schema-delivery tests — `shell.control`.
 *
 * The hooks fire from CommandGiverMixin's sealed surface; here we
 * invoke them through ContainmentApi.move and onConnectionAttached
 * to assert the wire frames land on the giver's Sensor (which is the
 * recipient before the client is involved — the host IS the
 * sensor).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Idea } from '../../lib/stuff/Idea';
import Location from '../../lib/stuff/Location';
import {
  CommandGiverMixin,
  type CommandGiver,
} from '../../lib/command/CommandGiver';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { SensorMixin } from '../../lib/message/Sensor';
import { ContainmentApi } from '../containment';
import { CommandApi } from '../command';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type Interactive from '../../obj/Interactive';
import type { MessageFrame } from '@saxonberg/types';

const TestGiverBase = CommandGiverMixin(
  SensorMixin(ContainerMixin(ContainableMixin(Idea)))
);

class TestGiver extends TestGiverBase {
  static override commandContributions = {
      peers: [],
    self: ['system/ping.yaml'],
    environment: [],
  };
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

const InvProviderBase = ContainableMixin(Idea);
class InvProvider extends InvProviderBase {
  static commandContributions = {
      peers: [],
    self: [],
    environment: ['system/ping.yaml'],
  };
}

const EnvProviderBase = ContainableMixin(Idea);
class EnvProvider extends EnvProviderBase {
  static commandContributions = {
      peers: ['system/ping.yaml'],
    self: [],
    environment: [],
  };
}

function commandsFrames(giver: TestGiver): MessageFrame[] {
  return giver.received.filter((f) => f.topic === 'shell.control');
}

describe('CommandGiverMixin schema-delivery', () => {
  beforeEach(() => {
    CommandApi.clearCache();
  });

  it('does not emit schema deltas before onConnectionAttached fires', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    const item = makeStuff(() => new InvProvider());
    ContainmentApi.move(item, giver);
    expect(commandsFrames(giver)).toHaveLength(0);
  });

  it('emits commands.reset on onConnectionAttached', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    giver.onConnectionAttached({} as Interactive);
    const frames = commandsFrames(giver);
    const resets = frames.filter(
      (f) => f.topic === 'shell.control'
    );
    expect(resets).toHaveLength(1);
    const payload = resets[0]!.payload as Array<{ verbs: string[] }>;
    expect(payload.some((p) => p.verbs.includes('ping'))).toBe(true);
  });

  it('emits commands.added when a containable joins inventory after connection', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    giver.onConnectionAttached({} as Interactive);
    giver.received = []; // reset baseline frames

    const item = makeStuff(() => new InvProvider());
    ContainmentApi.move(item, giver);

    const adds = commandsFrames(giver).filter(
      (f) => f.topic === 'shell.control'
    );
    expect(adds.length).toBeGreaterThan(0);
  });

  it('emits commands.removed when a containable leaves inventory after connection', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    giver.onConnectionAttached({} as Interactive);
    const item = makeStuff(() => new InvProvider());
    ContainmentApi.move(item, giver);
    giver.received = [];

    ContainmentApi.move(item, null);

    const removes = commandsFrames(giver).filter(
      (f) => f.topic === 'shell.control'
    );
    expect(removes.length).toBeGreaterThan(0);
    const payload = removes[0]!.payload as { verb?: string };
    expect(payload.verb).toBe('ping');
  });

  it('emits adds when a peer thing arrives in the giver\'s environment', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    const loc = makeStuff(() => new Location());
    ContainmentApi.move(giver, loc);
    giver.onConnectionAttached({} as Interactive);
    giver.received = [];

    const envThing = makeStuff(() => new EnvProvider());
    ContainmentApi.move(envThing, loc);

    const adds = commandsFrames(giver).filter(
      (f) => f.topic === 'shell.control'
    );
    expect(adds.length).toBeGreaterThan(0);
  });

  it('emits removes when a peer thing leaves the giver\'s environment', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    const loc = makeStuff(() => new Location());
    ContainmentApi.move(giver, loc);
    const envThing = makeStuff(() => new EnvProvider());
    ContainmentApi.move(envThing, loc);
    giver.onConnectionAttached({} as Interactive);
    giver.received = [];

    ContainmentApi.move(envThing, null);

    const removes = commandsFrames(giver).filter(
      (f) => f.topic === 'shell.control'
    );
    expect(removes.length).toBeGreaterThan(0);
  });

  it('reset is idempotent across repeat onConnectionAttached calls', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    giver.onConnectionAttached({} as Interactive);
    const before = commandsFrames(giver).length;
    giver.onConnectionAttached({} as Interactive);
    expect(commandsFrames(giver).length).toBe(before);
  });

  it('schema delta payload mirrors the YAML view', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    giver.onConnectionAttached({} as Interactive);
    const reset = commandsFrames(giver).find(
      (f) => f.topic === 'shell.control'
    )!;
    const payload = reset.payload as Array<{
      verbs: string[];
      controller: string;
      description: string;
    }>;
    const ping = payload.find((p) => p.verbs.includes('ping'));
    expect(ping).toBeDefined();
    expect(ping?.controller).toBe('/obj/command/system/PingController');
  });

  it('the giver host with no Sensor mixin would skip emits silently', () => {
    // Sanity check on the recipient gate. We don't have a non-Sensor
    // CommandGiver fixture; instead we verify CommandApi.emitSchemaDelta
    // skips when handed a non-Sensor.
    const naked = makeStuff(() => new (class extends Idea {})());
    // Should not throw and should not produce an observable side
    // effect; we just exercise the early-return path.
    expect(() =>
      CommandApi.emitSchemaDelta(naked, 'reset', [])
    ).not.toThrow();
  });
});
