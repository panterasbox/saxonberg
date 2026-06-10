/**
 * PropertyChangedEvent unit tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EventApi } from '../../../api/event';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import EventRegistry from '../../../obj/EventRegistry';
import { Stuff } from '../../stuff/Stuff';
import { PropertyChangedEvent } from '../PropertyChangedEvent';

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('PropertyChangedEvent', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('carries kind, payload, and exposes static KIND', () => {
    const event = new PropertyChangedEvent({
      target: 'stuff-1',
      property: 'gold',
      oldValue: 0,
      newValue: 100,
    });
    expect(event.kind).toBe('stuff.propertyChanged');
    expect(PropertyChangedEvent.KIND).toBe('stuff.propertyChanged');
    expect(event.payload).toEqual({
      target: 'stuff-1',
      property: 'gold',
      oldValue: 0,
      newValue: 100,
    });
  });

  it('discriminator is `property`, not `field`', () => {
    const event = new PropertyChangedEvent({
      target: 'stuff-1',
      property: 'mood',
      oldValue: null,
      newValue: 'happy',
    });
    expect(event.payload).toHaveProperty('property', 'mood');
    expect(event.payload).not.toHaveProperty('field');
  });

  it('round-trips through EventApi.fire / on(PropertyChangedEvent, ...)', async () => {
    await bootRegistry();
    const seen: Array<{ target: string; property: string; oldValue: unknown; newValue: unknown }> = [];
    EventApi.on(PropertyChangedEvent, (e) => {
      seen.push(e.payload);
    });
    EventApi.fire(
      new PropertyChangedEvent({
        target: 's1',
        property: 'gold',
        oldValue: 0,
        newValue: 50,
      }),
    );
    await flushMicrotasks();
    expect(seen).toEqual([
      { target: 's1', property: 'gold', oldValue: 0, newValue: 50 },
    ]);
  });
});
