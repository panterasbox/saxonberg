/**
 * Tests for VocalMixin
 *
 * Covers the two dispatch modes of say():
 * - Containable speaker → addresses peers in environment
 * - Pure-Container speaker → addresses its own contents
 * - Neither → throws (composition error)
 */

import { describe, it, expect } from 'vitest';
import { Stuff } from '../stuff/Stuff';
import { ContainableMixin } from '../spatial/Containable';
import { ContainerMixin } from '../spatial/Container';
import { SensorMixin } from './Sensor';
import { VocalMixin } from './Vocal';
import { NamedMixin } from '../character/Named';
import { Location } from '../stuff/Location';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';

// A character-shaped speaker: Named + Vocal + Sensor + Containable
class CharacterSpeaker extends VocalMixin(
  SensorMixin(ContainableMixin(NamedMixin(Stuff)))
) {
  lastMessage?: unknown;
  onMessage(message: unknown): void {
    super.onMessage(message);
    this.lastMessage = message;
  }
}

// A sensor that just records what it hears
class Listener extends SensorMixin(ContainableMixin(Stuff)) {
  lastMessage?: unknown;
  onMessage(message: unknown): void {
    super.onMessage(message);
    this.lastMessage = message;
  }
}

// A haunted-room-shaped speaker: Container + Vocal (NOT Containable)
class TalkingRoom extends VocalMixin(ContainerMixin(NamedMixin(Stuff))) {}

// A speaker with no container relationship at all
class DisembodiedVoice extends VocalMixin(NamedMixin(Stuff)) {}

describe('VocalMixin.say()', () => {
  describe('Containable speaker (peers mode)', () => {
    it('broadcasts to every sensor in its environment', () => {
      const room = new Location();
      StuffApi.register(room);

      const alice = new CharacterSpeaker();
      StuffApi.register(alice);
      alice.firstName = 'Alice';
      ContainmentApi.move(alice, room);

      const bob = new Listener();
      StuffApi.register(bob);
      ContainmentApi.move(bob, room);

      alice.say('hello');

      expect(bob.lastMessage).toMatchObject({
        type: 'output',
        payload: {
          text: '<name>Alice</name> says, <speech>"hello"</speech>',
        },
      });
      // Speaker is also a sensor in the same container — hears itself.
      expect(alice.lastMessage).toEqual(bob.lastMessage);
    });
  });

  describe('pure-Container speaker (contents mode)', () => {
    it('broadcasts to its own occupants', () => {
      const house = new TalkingRoom();
      StuffApi.register(house);
      house.firstName = 'Haunted';
      house.lastName = 'House';

      const occupant = new Listener();
      StuffApi.register(occupant);
      ContainmentApi.move(occupant, house);

      house.say('get out');

      expect(occupant.lastMessage).toMatchObject({
        type: 'output',
        payload: {
          text: '<name>Haunted House</name> says, <speech>"get out"</speech>',
        },
      });
    });
  });

  describe('neither Container nor Containable', () => {
    it('throws a composition error', () => {
      const ghost = new DisembodiedVoice();
      StuffApi.register(ghost);
      expect(() => ghost.say('boo')).toThrow(/Container or Containable/);
    });
  });
});
