/**
 * MessageApi tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageApi } from '../message';
import { Location } from '../../lib/stuff/Location';
import { MobileMixin } from '../../lib/spatial/Mobile';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { SensorMixin } from '../../lib/message/Sensor';
import { Stuff } from '../../lib/stuff/Stuff';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { MessageFrame } from '@saxonberg/types';

function makeFrame(topic: string = 'test', body: string = ''): MessageFrame {
  return {
    id: 'test-frame-id',
    topic,
    body,
    meta: { timestamp: Date.now() },
  };
}

// Create a test sensor class
const SensorBase = SensorMixin(ContainableMixin(Stuff));
class TestSensor extends SensorBase {
  protected override handleMessage(message: unknown): void {
    this.lastMessage = message;
  }
  lastMessage?: unknown;
}

// Create a mobile sensor (like Avatar)
const MobileSensorBase = MobileMixin(SensorMixin(ContainableMixin(Stuff)));
class MobileSensor extends MobileSensorBase {
  protected override handleMessage(message: unknown): void {
    this.lastMessage = message;
  }
  lastMessage?: unknown;
}

// Create a simple non-sensor object for testing — containable so it can live in a Location
class NonSensor extends ContainableMixin(Stuff) {}

describe('MessageApi', () => {
  let location: Location;
  let sensor1: TestSensor;
  let sensor2: TestSensor;
  let nonSensor: NonSensor;

  beforeEach(() => {
    location = makeStuff(() => new Location());
    location.shortDescription = 'Test Room';

    sensor1 = makeStuff(() => new TestSensor());

    sensor2 = makeStuff(() => new TestSensor());

    nonSensor = makeStuff(() => new NonSensor());
  });

  describe('getSensors()', () => {
    it('should find all sensors in a container', () => {
      location.addToInventory(sensor1);
      location.addToInventory(sensor2);

      const sensors = MessageApi.getSensors(location);

      expect(sensors).toHaveLength(2);
      expect(sensors).toContain(sensor1);
      expect(sensors).toContain(sensor2);
    });

    it('should not include non-sensors', () => {
      location.addToInventory(sensor1);
      location.addToInventory(nonSensor);

      const sensors = MessageApi.getSensors(location);

      expect(sensors).toHaveLength(1);
      expect(sensors[0]).toBe(sensor1);
    });

    it('should return empty array for empty container', () => {
      const sensors = MessageApi.getSensors(location);
      expect(sensors).toHaveLength(0);
    });

    it('should detect sensors by SensorMixin marker, not duck-typed onMessage', () => {
      // An object with an onMessage method but no SensorMixin must not match —
      // detection is via the mixin marker, not method presence.
      const ducked = { onMessage: vi.fn() } as unknown as TestSensor;
      location.inventory.add(ducked);

      expect(MessageApi.getSensors(location)).toHaveLength(0);

      // Real SensorMixin-based sensors are detected.
      location.addToInventory(sensor1);
      expect(MessageApi.getSensors(location)).toHaveLength(1);
    });
  });

  describe('messageContents()', () => {
    it('sends the message to every sensor inside the container', () => {
      location.addToInventory(sensor1);
      location.addToInventory(sensor2);

      const message = makeFrame('test', 'hello');
      MessageApi.messageContents(location, message);

      expect(sensor1.lastMessage).toEqual(message);
      expect(sensor2.lastMessage).toEqual(message);
    });

    it('skips non-sensors', () => {
      location.addToInventory(sensor1);
      location.addToInventory(nonSensor);

      const message = makeFrame();
      expect(() => MessageApi.messageContents(location, message)).not.toThrow();
      expect(sensor1.lastMessage).toEqual(message);
    });

    it('is a no-op for empty containers', () => {
      expect(() =>
        MessageApi.messageContents(location, makeFrame())
      ).not.toThrow();
    });
  });

  describe('messageContainer()', () => {
    it('should call onMessage for all sensors in container', () => {
      // Setup: place sensors in location
      location.addToInventory(sensor1);
      location.addToInventory(sensor2);

      // Create a mobile sensor to be the source
      const source = makeStuff(() => new MobileSensor());
      source.teleport(location, { silent: true });

      const message = makeFrame('test', 'Hello');

      MessageApi.messageContainer(source, message);

      // All sensors should receive message
      expect(sensor1.lastMessage).toEqual(message);
      expect(sensor2.lastMessage).toEqual(message);
    });

    it('should not affect non-sensors in container', () => {
      location.addToInventory(sensor1);
      location.addToInventory(nonSensor);

      const source = makeStuff(() => new MobileSensor());
      source.teleport(location, { silent: true });

      const message = makeFrame();

      // Should not throw error
      expect(() => {
        MessageApi.messageContainer(source, message);
      }).not.toThrow();

      expect(sensor1.lastMessage).toEqual(message);
    });

    it('should warn if source environment is null', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const source = makeStuff(() => new MobileSensor());
      // source has getEnvironment but it returns null
      MessageApi.messageContainer(source, makeFrame());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Source not in a container')
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty container', () => {
      const source = makeStuff(() => new MobileSensor());
      source.teleport(location, { silent: true });

      // Should not throw error
      expect(() => {
        MessageApi.messageContainer(source, makeFrame());
      }).not.toThrow();
    });

    it('should work with various frame topics', () => {
      location.addToInventory(sensor1);

      const source = makeStuff(() => new MobileSensor());
      source.teleport(location, { silent: true });

      const message1 = makeFrame('world.perception.look', 'Test');
      const message2 = makeFrame('system.log.info', 'note');
      const message3 = makeFrame('world.speech.say', 'hi');

      MessageApi.messageContainer(source, message1);
      expect(sensor1.lastMessage).toEqual(message1);

      MessageApi.messageContainer(source, message2);
      expect(sensor1.lastMessage).toEqual(message2);

      MessageApi.messageContainer(source, message3);
      expect(sensor1.lastMessage).toEqual(message3);
    });

    it('should handle multiple sensors receiving same message', () => {
      const sensors = Array.from({ length: 5 }, () => {
        const sensor = makeStuff(() => new TestSensor());
        return sensor;
      });

      sensors.forEach((s) => location.addToInventory(s));

      const source = makeStuff(() => new MobileSensor());
      source.teleport(location, { silent: true });

      const message = makeFrame('broadcast', 'To all');

      MessageApi.messageContainer(source, message);

      // All sensors should receive the same message
      sensors.forEach((sensor) => {
        expect(sensor.lastMessage).toEqual(message);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should support say command pattern', () => {
      // Setup room with listeners
      location.addToInventory(sensor1);
      location.addToInventory(sensor2);

      // Speaker enters and speaks
      const speaker = makeStuff(() => new MobileSensor());
      speaker.teleport(location, { silent: true });

      const sayMessage = makeFrame(
        'world.speech.say',
        '<name>Alice</name> says, <speech>"Hello everyone"</speech>'
      );

      MessageApi.messageContainer(speaker, sayMessage);

      // All sensors (including speaker if it's a sensor) receive message
      expect(sensor1.lastMessage).toEqual(sayMessage);
      expect(sensor2.lastMessage).toEqual(sayMessage);
    });

    it('should isolate messages to container', () => {
      const location2 = makeStuff(() => new Location());
      location2.shortDescription = 'Other Room';

      const sensorInRoom1 = makeStuff(() => new TestSensor());
      const sensorInRoom2 = makeStuff(() => new TestSensor());

      location.addToInventory(sensorInRoom1);
      location2.addToInventory(sensorInRoom2);

      const source = makeStuff(() => new MobileSensor());
      source.teleport(location, { silent: true });

      const message = makeFrame('test', 'Room 1 only');

      MessageApi.messageContainer(source, message);

      // Only sensor in same room should receive message
      expect(sensorInRoom1.lastMessage).toEqual(message);
      expect(sensorInRoom2.lastMessage).toBeUndefined();
    });
  });
});
