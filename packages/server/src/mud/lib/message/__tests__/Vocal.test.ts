/**
 * VocalMixin tests.
 *
 * Covers the two dispatch modes of say():
 *   - Containable speaker → addresses peers in environment
 *   - Pure-Container speaker → addresses its own contents
 *   - Neither → throws (composition error). Because Scene's first
 *     compositional check (toSelf) requires a Sensor, the
 *     "DisembodiedVoice" test case has to opt in to Sensor; otherwise
 *     it fails earlier than VocalMixin's intended throw.
 */

import { describe, it, expect } from 'vitest';
import { Stuff } from '../../stuff/Stuff';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { SensorMixin } from '../Sensor';
import { VocalMixin } from '../Vocal';
import { NamedMixin } from '../../description/Named';
import { Location } from '../../stuff/Location';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { MessageFrame } from '@saxonberg/types';

// A character-shaped speaker: Named + Vocal + Sensor + Containable
class CharacterSpeaker extends VocalMixin(
  SensorMixin(ContainableMixin(NamedMixin(Stuff)))
) {
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

// A sensor that just records what it hears
class Listener extends SensorMixin(ContainableMixin(NamedMixin(Stuff))) {
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

// A haunted-room-shaped speaker: Sensor + Container + Vocal (NOT Containable).
// Sensor is required because Scene.toSelf needs it (the speaker hears
// its own self frame).
class TalkingRoom extends VocalMixin(
  SensorMixin(ContainerMixin(NamedMixin(Stuff)))
) {}

// Speaker with no container relationship — Sensor only, so the
// composition-error throw fires (rather than a Sensor check failing
// first).
class DisembodiedVoice extends VocalMixin(SensorMixin(NamedMixin(Stuff))) {}

describe('VocalMixin.say()', () => {
  describe('Containable speaker (peers mode)', () => {
    it('broadcasts to every sensor in its environment', () => {
      const room = makeStuff(() => new Location());

      const alice = makeStuff(() => new CharacterSpeaker());
      alice.setName('Alice');
      ContainmentApi.move(alice, room);

      const bob = makeStuff(() => new Listener());
      ContainmentApi.move(bob, room);

      alice.say('hello');

      expect(bob.received).toHaveLength(1);
      expect(bob.received[0]!.body).toBe(
        `<name stuff-id="${alice.stuffId}">Alice</name> says, <speech>"hello"</speech>`
      );
      // Speaker hears its own self frame: "You say, ..."
      expect(alice.received).toHaveLength(1);
      expect(alice.received[0]!.body).toBe(
        'You say, <speech>"hello"</speech>'
      );
    });
  });

  describe('pure-Container speaker (contents mode)', () => {
    it('broadcasts to its own occupants', () => {
      const house = makeStuff(() => new TalkingRoom());
      house.setName('Haunted');
      house.setSurname('House');

      const occupant = makeStuff(() => new Listener());
      ContainmentApi.move(occupant, house);

      house.say('get out');

      expect(occupant.received).toHaveLength(1);
      // Casual register — surname not included; use `obj.fullName` to
      // get "Haunted House".
      expect(occupant.received[0]!.body).toBe(
        `<name stuff-id="${house.stuffId}">Haunted</name> says, <speech>"get out"</speech>`
      );
    });
  });

  describe('neither Container nor Containable', () => {
    it('throws a composition error', () => {
      const ghost = makeStuff(() => new DisembodiedVoice());
      expect(() => ghost.say('boo')).toThrow(/Container or Containable/);
    });
  });
});
