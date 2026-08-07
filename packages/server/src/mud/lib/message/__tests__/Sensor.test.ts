/**
 * SensorMixin tests — covers the template-method shape:
 *
 *   onMessage(frame)
 *     → filterMessage(frame)        (shadowable)
 *     → handleMessage(frame)        (subclass override)
 *
 * And the filterMessage shadow interception pattern (a "mute speech"
 * shadow that drops `speech.*` frames).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SensorMixin } from '../Sensor';
import { Shadow } from '../../stuff/Shadow';
import { ShadowApi } from '../../../api/shadow';
import { StuffApi } from '../../../api/stuff';
import { Shadowing } from '../../security/decorators';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { MessageFrame } from '@saxonberg/types';
import { Idea } from "../../stuff/Idea";

function frame(topic: string, body: string = ''): MessageFrame {
  return {
    id: 'test-id',
    topic,
    body,
    meta: { timestamp: Date.now() },
  };
}

class CapturingSensor extends SensorMixin(Idea) {
  public received: MessageFrame[] = [];

  protected override handleMessage(f: MessageFrame): void {
    this.received.push(f);
  }
}

describe('SensorMixin', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('default filterMessage passes the frame through to handleMessage', () => {
    const sensor = makeStuff(() => new CapturingSensor());
    const f = frame('speech.vocal', 'hi');
    sensor.onMessage(f);
    expect(sensor.received).toEqual([f]);
  });

  it('default filterMessage on a bare Sensor is a no-op (frame ignored)', () => {
    class BareSensor extends SensorMixin(Idea) {}
    const sensor = makeStuff(() => new BareSensor());
    expect(() => sensor.onMessage(frame('x'))).not.toThrow();
  });
});

describe('SensorMixin.filterMessage shadow interception', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('a shadow that returns null drops the frame entirely', () => {
    class MuteShadow extends Shadow {
      @Shadowing('filterMessage')
      mute(f: MessageFrame): MessageFrame | null {
        if (f.topic.startsWith('speech.')) return null;
        return this.callDown<MessageFrame>(f);
      }
    }

    const sensor = makeStuff(() => new CapturingSensor());
    const shadow = makeStuff(() => new MuteShadow());
    ShadowApi.attach(sensor, shadow);

    sensor.onMessage(frame('speech.vocal', 'hi'));
    sensor.onMessage(frame('sense.survey', 'see'));

    expect(sensor.received).toHaveLength(1);
    expect(sensor.received[0]!.topic).toBe('sense.survey');
  });

  it('a shadow that mutates the frame returns a new object (immutable convention)', () => {
    class GarbleShadow extends Shadow {
      @Shadowing('filterMessage')
      garble(f: MessageFrame): MessageFrame {
        return { ...f, body: 'GARBLED' };
      }
    }

    const sensor = makeStuff(() => new CapturingSensor());
    const shadow = makeStuff(() => new GarbleShadow());
    ShadowApi.attach(sensor, shadow);

    const original = frame('x', 'plain');
    sensor.onMessage(original);

    expect(sensor.received).toHaveLength(1);
    expect(sensor.received[0]!.body).toBe('GARBLED');
    // Original frame is untouched.
    expect(original.body).toBe('plain');
  });

  it('detached shadow no longer intercepts', () => {
    class MuteAllShadow extends Shadow {
      @Shadowing('filterMessage')
      mute(): MessageFrame | null {
        return null;
      }
    }

    const sensor = makeStuff(() => new CapturingSensor());
    const shadow = makeStuff(() => new MuteAllShadow());
    ShadowApi.attach(sensor, shadow);

    sensor.onMessage(frame('a'));
    expect(sensor.received).toHaveLength(0);

    ShadowApi.detach(shadow);
    sensor.onMessage(frame('b'));
    expect(sensor.received).toHaveLength(1);
  });
});
