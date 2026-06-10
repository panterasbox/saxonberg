/**
 * NamedMixin.setName fires FieldChangedEvent on actual change; noop
 * skip on equal value.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NamedMixin } from '../Named';
import { Idea } from '../../stuff/Idea';
import { EventApi } from '../../../api/event';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import EventRegistry from '../../../obj/EventRegistry';
import { Stuff } from '../../stuff/Stuff';
import { FieldChangedEvent } from '../../events/FieldChangedEvent';
import { makeStuff } from '../../security/__tests__/test-setup';

class NamedThing extends NamedMixin(Idea) {
  static persistentFields: string[] = [];
}

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

describe('NamedMixin field change firing', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('setName fires FieldChangedEvent with payload on change', async () => {
    await bootRegistry();
    const obj = makeStuff(() => new NamedThing());
    const seen: Array<{ target: string; field: string; oldValue: unknown; newValue: unknown }> = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    obj.setName('Alice');
    await flushMicrotasks();
    expect(seen).toEqual([
      { target: obj.stuffId, field: 'name', oldValue: '', newValue: 'Alice' },
    ]);
  });

  it('setName noop-skip on equal value', async () => {
    await bootRegistry();
    const obj = makeStuff(() => new NamedThing());
    obj.setName('Alice');
    await flushMicrotasks();
    const seen: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    obj.setName('Alice');
    await flushMicrotasks();
    expect(seen).toEqual([]);
  });
});
