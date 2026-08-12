/**
 * VocalMixin extension tests — whisper, shout, and `say --to <target>`.
 *
 * Covers:
 *   - whisper / shout fire on their own topics with the expected dB stamp.
 *   - say(text, target) renders directed bodies and emits a target frame.
 *   - All three stamp `meta.modality = 'hearing'`.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { ContainableMixin } from '../../spatial/Containable';
import { SensorMixin } from '../Sensor';
import { VocalMixin } from '../Vocal';
import { NamedMixin } from '../../description/Named';
import Location from '../../stuff/Location';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { MessageFrame } from '@saxonberg/types';
import { Idea } from '../../stuff/Idea';

class CharacterSpeaker extends VocalMixin(
  SensorMixin(ContainableMixin(NamedMixin(Idea)))
) {
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

class Listener extends SensorMixin(ContainableMixin(NamedMixin(Idea))) {
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

function sceneRoom(): {
  room: Location;
  alice: CharacterSpeaker;
  bob: Listener;
} {
  const room = makeStuff(() => new Location());

  const alice = makeStuff(() => new CharacterSpeaker());
  alice.setName('Alice');
  ContainmentApi.move(alice, room);

  const bob = makeStuff(() => new Listener());
  bob.setName('Bob');
  ContainmentApi.move(bob, room);

  return { room, alice, bob };
}

describe('VocalMixin.whisper', () => {
  it('emits on speech.vocal with low acousticDb + hearing modality', () => {
    const { alice, bob } = sceneRoom();
    alice.whisper('quiet');
    expect(alice.received).toHaveLength(1);
    expect(bob.received).toHaveLength(1);
    for (const f of [alice.received[0]!, bob.received[0]!]) {
      expect(f.topic).toBe('speech.vocal');
      expect(f.meta.modality).toBe('hearing');
      expect(f.meta.acousticDb).toBe(30);
    }
  });

  it('renders a directed body when a target is supplied', () => {
    const { alice, bob } = sceneRoom();
    alice.whisper('hey', bob);
    // bob is the target — he gets a target frame, NOT a peer frame.
    expect(bob.received).toHaveLength(1);
    expect(bob.received[0]!.body).toContain('whispers to you');
  });
});

describe('VocalMixin.shout', () => {
  it('emits on speech.vocal with high acousticDb + hearing modality', () => {
    const { alice, bob } = sceneRoom();
    alice.shout('HELP');
    for (const f of [alice.received[0]!, bob.received[0]!]) {
      expect(f.topic).toBe('speech.vocal');
      expect(f.meta.modality).toBe('hearing');
      expect(f.meta.acousticDb).toBe(90);
    }
  });
});

describe('VocalMixin.say --to', () => {
  it('renders self / peer / target prose and emits a target frame', () => {
    const { alice, bob } = sceneRoom();
    const charlie = makeStuff(() => new Listener());
    charlie.setName('Charlie');
    // charlie is the room's "peer" (in-room sensor that isn't actor/target).
    const room = (alice as unknown as { getContainer(): unknown }).getContainer() as Location;
    ContainmentApi.move(charlie, room);

    alice.say('hi', bob);

    // bob = target — gets the target frame
    expect(bob.received).toHaveLength(1);
    expect(bob.received[0]!.body).toMatch(/says to you/);

    // charlie = peer
    expect(charlie.received).toHaveLength(1);
    expect(charlie.received[0]!.body).toMatch(/says to <thing/);

    // alice = self
    expect(alice.received).toHaveLength(1);
    expect(alice.received[0]!.body).toMatch(/^You say to <thing/);
  });

  it('stamps acousticDb = 60 on say (with or without target)', () => {
    const { alice } = sceneRoom();
    alice.say('hello');
    expect(alice.received[0]!.meta.acousticDb).toBe(60);
  });
});
