/**
 * Schema-delivery tests — `shell.control`.
 *
 * The hooks fire from CommandGiverMixin's sealed surface; here we
 * invoke them through ContainmentApi.move and onConnectionAttached
 * to assert the wire frames land on the giver's Sensor (which is the
 * recipient before the client is involved — the host IS the
 * sensor).
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { Idea } from '../../lib/stuff/Idea';
import Place from '../../lib/stuff/Place';
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
import type Interactive from '../../platform/idea/Interactive';
import type { MessageFrame } from '@saxonberg/types';

const TestGiverBase = CommandGiverMixin(
  SensorMixin(ContainerMixin(ContainableMixin(Idea)))
);

class TestGiver extends TestGiverBase {
  static override commandContributions = {
      peers: [],
    self: ['platform/cmd/system/ping.yaml'],
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
    environment: ['platform/cmd/system/ping.yaml'],
  };
}

const EnvProviderBase = ContainableMixin(Idea);
class EnvProvider extends EnvProviderBase {
  static commandContributions = {
      peers: ['platform/cmd/system/ping.yaml'],
    self: [],
    environment: [],
  };
}

function commandsFrames(giver: TestGiver): MessageFrame[] {
  // `shell.control` carries every interface-control frame; the
  // `control:schema` tag is what makes this one a schema delta.
  return giver.received.filter(
    (f) => f.topic === 'shell.control' && f.tags?.includes('control:schema')
  );
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
      (f) => f.tags?.includes('schema:reset')
    );
    expect(resets).toHaveLength(1);
    const payload = resets[0]!.payload as Array<{ verbs: string[] }>;
    expect(payload.some((p) => p.verbs.includes('ping'))).toBe(true);
  });

  it('⭐ a move sends no frame: the stack changes and the client asks when it wants to know', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    giver.onConnectionAttached({} as Interactive);
    giver.received = []; // reset baseline frames

    const item = makeStuff(() => new InvProvider());
    ContainmentApi.move(item, giver);

    expect(commandsFrames(giver)).toHaveLength(0);
    expect(giver.getAffordances().some((a) => a.source === item)).toBe(true);
    ContainmentApi.move(item, null);
    expect(commandsFrames(giver)).toHaveLength(0);
    expect(giver.getAffordances().some((a) => a.source === item)).toBe(false);
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
    const reset = commandsFrames(giver).find((f) =>
      f.tags?.includes('schema:reset')
    )!;
    const payload = reset.payload as Array<{
      verbs: string[];
      controller: string;
      description: string;
    }>;
    const ping = payload.find((p) => p.verbs.includes('ping'));
    expect(ping).toBeDefined();
    expect(ping?.controller).toBe('/platform/idea/cmd/system/PingController');
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
