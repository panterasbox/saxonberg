/**
 * GenericEvent unit tests — escape-hatch class-shaped event.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { EventApi } from '../../../api/event';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import EventRegistry from '../../../obj/EventRegistry';
import { Stuff } from '../../stuff/Stuff';
import { GenericEvent } from '../GenericEvent';

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

describe('GenericEvent', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('constructs with arbitrary kind and payload', () => {
    const event = new GenericEvent('test.thing', { value: 42 });
    expect(event.kind).toBe('test.thing');
    expect(event.payload).toEqual({ value: 42 });
  });

  it('round-trips through EventApi.fire and string-keyed EventApi.on', async () => {
    await bootRegistry();
    const seen: unknown[] = [];
    EventApi.on<{ value: number }>('test.bounced', (p) => {
      seen.push(p);
    });
    EventApi.fire(new GenericEvent('test.bounced', { value: 7 }));
    await flushMicrotasks();
    expect(seen).toEqual([{ value: 7 }]);
  });
});
