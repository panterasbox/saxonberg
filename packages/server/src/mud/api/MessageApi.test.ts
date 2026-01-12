/**
 * MessageApi tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageApi } from './MessageApi.js';
import { Location } from '../lib/location/Location.js';
import { MobileMixin } from '../lib/mixins/MobileMixin.js';
import { ContainableMixin } from '../lib/mixins/ContainableMixin.js';
import { SensorMixin } from '../lib/message/SensorMixin.js';
import { Stuff } from '../lib/stuff/Stuff.js';
import { StuffApi } from './stuff.js';

// Create a test sensor class
const SensorBase = SensorMixin(ContainableMixin(Stuff));
class TestSensor extends SensorBase {
  onMessage(message: unknown): void {
    // Override for testing
    super.onMessage(message);
    this.lastMessage = message;
  }
  lastMessage?: unknown;
}

// Create a mobile sensor (like Avatar)
const MobileSensorBase = MobileMixin(SensorMixin(ContainableMixin(Stuff)));
class MobileSensor extends MobileSensorBase {
  onMessage(message: unknown): void {
    super.onMessage(message);
    this.lastMessage = message;
  }
  lastMessage?: unknown;
}

describe('MessageApi', () => {
  let location: Location;
  let sensor1: TestSensor;
  let sensor2: TestSensor;
  let nonSensor: Stuff;

  beforeEach(() => {
    location = new Location();
    StuffApi.register(location);
    location.name = 'Test Room';

    sensor1 = new TestSensor();
    StuffApi.register(sensor1);

    sensor2 = new TestSensor();
    StuffApi.register(sensor2);

    nonSensor = new Stuff();
    StuffApi.register(nonSensor);
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

    it('should return empty array for non-container', () => {
      const notContainer = new Stuff();
      StuffApi.register(notContainer);
      const sensors = MessageApi.getSensors(notContainer);
      expect(sensors).toHaveLength(0);
    });

    it('should detect sensors by onMessage method', () => {
      const hasOnMessage = {
        onMessage: vi.fn(),
      };

      // Manually add to inventory (bypassing type checking)
      location.inventory.add(hasOnMessage as any);

      const sensors = MessageApi.getSensors(location);
      expect(sensors).toHaveLength(1);
    });
  });

  describe('messageContainer()', () => {
    it('should call onMessage for all sensors in container', () => {
      // Setup: place sensors in location
      location.addToInventory(sensor1);
      location.addToInventory(sensor2);

      // Create a mobile sensor to be the source
      const source = new MobileSensor(); StuffApi.register(source);
      source.move(location);

      const message = { type: 'test', payload: { text: 'Hello' } };

      MessageApi.messageContainer(source, message);

      // All sensors should receive message
      expect(sensor1.lastMessage).toEqual(message);
      expect(sensor2.lastMessage).toEqual(message);
    });

    it('should not affect non-sensors in container', () => {
      location.addToInventory(sensor1);
      location.addToInventory(nonSensor);

      const source = new MobileSensor(); StuffApi.register(source);
      source.move(location);

      const message = { type: 'test' };

      // Should not throw error
      expect(() => {
        MessageApi.messageContainer(source, message);
      }).not.toThrow();

      expect(sensor1.lastMessage).toEqual(message);
    });

    it('should warn if source has no environment', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const source = new Stuff(); StuffApi.register(source);
      MessageApi.messageContainer(source, { type: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Source has no environment')
      );

      consoleSpy.mockRestore();
    });

    it('should warn if source environment is null', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const source = new MobileSensor(); StuffApi.register(source);
      // source has getEnvironment but it returns null
      MessageApi.messageContainer(source, { type: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Source not in a container')
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty container', () => {
      const source = new MobileSensor(); StuffApi.register(source);
      source.move(location);

      // Should not throw error
      expect(() => {
        MessageApi.messageContainer(source, { type: 'test' });
      }).not.toThrow();
    });

    it('should work with any message type', () => {
      location.addToInventory(sensor1);

      const source = new MobileSensor(); StuffApi.register(source);
      source.move(location);

      const message1 = { type: 'output', payload: { text: 'Test' } };
      const message2 = 'string message';
      const message3 = 123;

      MessageApi.messageContainer(source, message1);
      expect(sensor1.lastMessage).toEqual(message1);

      MessageApi.messageContainer(source, message2);
      expect(sensor1.lastMessage).toEqual(message2);

      MessageApi.messageContainer(source, message3);
      expect(sensor1.lastMessage).toEqual(message3);
    });

    it('should handle multiple sensors receiving same message', () => {
      const sensors = Array.from({ length: 5 }, () => {
        const sensor = new TestSensor();
        StuffApi.register(sensor);
        return sensor;
      });

      sensors.forEach((s) => location.addToInventory(s));

      const source = new MobileSensor(); StuffApi.register(source);
      source.move(location);

      const message = { type: 'broadcast', text: 'To all' };

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
      const speaker = new MobileSensor();
      StuffApi.register(speaker);
      speaker.move(location);

      const sayMessage = {
        type: 'output',
        payload: {
          text: '<name>Alice</name> says, <speech>"Hello everyone"</speech>',
        },
      };

      MessageApi.messageContainer(speaker, sayMessage);

      // All sensors (including speaker if it's a sensor) receive message
      expect(sensor1.lastMessage).toEqual(sayMessage);
      expect(sensor2.lastMessage).toEqual(sayMessage);
    });

    it('should isolate messages to container', () => {
      const location2 = new Location();
      StuffApi.register(location2);
      location2.name = 'Other Room';

      const sensorInRoom1 = new TestSensor();
      StuffApi.register(sensorInRoom1);
      const sensorInRoom2 = new TestSensor();
      StuffApi.register(sensorInRoom2);

      location.addToInventory(sensorInRoom1);
      location2.addToInventory(sensorInRoom2);

      const source = new MobileSensor();
      StuffApi.register(source);
      source.move(location);

      const message = { type: 'test', text: 'Room 1 only' };

      MessageApi.messageContainer(source, message);

      // Only sensor in same room should receive message
      expect(sensorInRoom1.lastMessage).toEqual(message);
      expect(sensorInRoom2.lastMessage).toBeUndefined();
    });
  });
});
