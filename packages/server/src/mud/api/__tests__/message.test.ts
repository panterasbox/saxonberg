/**
 * MessageApi tests
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageApi } from '../message';
import { MessageLogic } from '../../obj/api/MessageLogic';
import { SecurityError } from '../../lib/security/errors';
import Location from '../../lib/stuff/Location';
import { MobileMixin } from '../../lib/spatial/Mobile';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { SensorMixin } from '../../lib/message/Sensor';
import { StuffApi } from '../stuff';
import { ProxyApi } from '../proxy';
import { ContainmentApi } from '../containment';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import type { MessageFrame } from '@saxonberg/types';
import { Idea } from "../../lib/stuff/Idea";

function makeFrame(topic: string = 'test', body: string = ''): MessageFrame {
  return {
    id: 'test-frame-id',
    topic,
    body,
    meta: { timestamp: Date.now() },
  };
}

// Create a test sensor class
const SensorBase = SensorMixin(ContainableMixin(Idea));
class TestSensor extends SensorBase {
  protected override handleMessage(message: unknown): void {
    this.lastMessage = message;
  }
  lastMessage?: unknown;
}

// Create a mobile sensor (like Avatar)
const MobileSensorBase = MobileMixin(SensorMixin(ContainableMixin(Idea)));
class MobileSensor extends MobileSensorBase {
  protected override handleMessage(message: unknown): void {
    this.lastMessage = message;
  }
  lastMessage?: unknown;
}

// Create a simple non-sensor object for testing — containable so it can live in a Location
class NonSensor extends ContainableMixin(Idea) {}

describe('MessageApi', () => {
  let location: Location;
  let sensor1: TestSensor;
  let sensor2: TestSensor;
  let nonSensor: NonSensor;

  beforeEach(() => {
    location = makeStuff(() => new Location());

    sensor1 = makeStuff(() => new TestSensor());

    sensor2 = makeStuff(() => new TestSensor());

    nonSensor = makeStuff(() => new NonSensor());
  });

  describe('getSensors()', () => {
    it('should find all sensors in a container', () => {
      ContainmentApi.move(sensor1, location);
      ContainmentApi.move(sensor2, location);

      const sensors = MessageApi.getSensors(location);

      expect(sensors).toHaveLength(2);
      expect(sensors).toContain(sensor1);
      expect(sensors).toContain(sensor2);
    });

    it('should not include non-sensors', () => {
      ContainmentApi.move(sensor1, location);
      ContainmentApi.move(nonSensor, location);

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
      // test seam: bypass setContainer chokepoint to inject a duck-typed
      // object into the inventory Set; the test verifies sensor detection
      // is keyed by the SensorMixin marker, not method shape.
      const raw = ProxyApi.unwrap(location) as unknown as { contents: Set<unknown> };
      raw.contents.add(ducked);

      expect(MessageApi.getSensors(location)).toHaveLength(0);

      // Real SensorMixin-based sensors are detected.
      ContainmentApi.move(sensor1, location);
      expect(MessageApi.getSensors(location)).toHaveLength(1);
    });
  });

  describe('messageContents()', () => {
    it('sends the message to every sensor inside the container', () => {
      ContainmentApi.move(sensor1, location);
      ContainmentApi.move(sensor2, location);

      const message = makeFrame('test', 'hello');
      MessageApi.messageContents(location, message);

      expect(sensor1.lastMessage).toEqual(message);
      expect(sensor2.lastMessage).toEqual(message);
    });

    it('skips non-sensors', () => {
      ContainmentApi.move(sensor1, location);
      ContainmentApi.move(nonSensor, location);

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
      ContainmentApi.move(sensor1, location);
      ContainmentApi.move(sensor2, location);

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
      ContainmentApi.move(sensor1, location);
      ContainmentApi.move(nonSensor, location);

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
      // source has getContainer but it returns null
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
      ContainmentApi.move(sensor1, location);

      const source = makeStuff(() => new MobileSensor());
      source.teleport(location, { silent: true });

      const message1 = makeFrame('sense.survey', 'Test');
      const message2 = makeFrame('shell.diagnostic', 'note');
      const message3 = makeFrame('speech.vocal', 'hi');

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

      sensors.forEach((s) => ContainmentApi.move(s, location));

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
      // Setup location with listeners
      ContainmentApi.move(sensor1, location);
      ContainmentApi.move(sensor2, location);

      // Speaker enters and speaks
      const speaker = makeStuff(() => new MobileSensor());
      speaker.teleport(location, { silent: true });

      const sayMessage = makeFrame(
        'speech.vocal',
        '<player>Alice</player> says, <speech>"Hello everyone"</speech>'
      );

      MessageApi.messageContainer(speaker, sayMessage);

      // All sensors (including speaker if it's a sensor) receive message
      expect(sensor1.lastMessage).toEqual(sayMessage);
      expect(sensor2.lastMessage).toEqual(sayMessage);
    });

    it('should isolate messages to container', () => {
      const location2 = makeStuff(() => new Location());

      const sensorInRoom1 = makeStuff(() => new TestSensor());
      const sensorInRoom2 = makeStuff(() => new TestSensor());

      ContainmentApi.move(sensorInRoom1, location);
      ContainmentApi.move(sensorInRoom2, location2);

      const source = makeStuff(() => new MobileSensor());
      source.teleport(location, { silent: true });

      const message = makeFrame('test', 'Location 1 only');

      MessageApi.messageContainer(source, message);

      // Only sensor in the same location should receive message
      expect(sensorInRoom1.lastMessage).toEqual(message);
      expect(sensorInRoom2.lastMessage).toBeUndefined();
    });
  });
});

describe('MessageLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('denies a direct logic-method call from a non-MessageApi caller', () => {
    const logic = makeStuffAtPath(
      () => new MessageLogic(),
      '/obj/api/message'
    );
    expect(StuffApi.findByTemplatePath('/obj/api/message')).toBe(logic);
    // The test module is not mud/api/message#MessageApi nor the
    // singleton itself; the FromModule gate on the logic's own methods
    // denies the call.
    const subject = makeStuff(() => new TestSensor());
    expect(() => logic.refOf(subject)).toThrow(SecurityError);
  });
});
