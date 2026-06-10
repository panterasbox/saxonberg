/**
 * MqlSubscriptionApi.fireFieldChange — Object.is noop-skip,
 * fire-on-change semantics, return-value contract.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MqlSubscriptionApi } from '../mql-subscription';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { Stuff } from '../../lib/stuff/Stuff';
import EventRegistry from '../../obj/EventRegistry';
import { FieldChangedEvent } from '../../lib/events/FieldChangedEvent';

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

describe('MqlSubscriptionApi.fireFieldChange', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('skips firing when old equals new (Object.is)', async () => {
    await bootRegistry();
    const seen: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    const ret = MqlSubscriptionApi.fireFieldChange(
      { stuffId: 's1' },
      'name',
      'foo',
      'foo',
    );
    await flushMicrotasks();
    expect(seen).toEqual([]);
    expect(ret).toBe('foo');
  });

  it('emits FieldChangedEvent on change and returns newValue', async () => {
    await bootRegistry();
    const seen: Array<{ target: string; field: string; oldValue: unknown; newValue: unknown }> = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    const ret = MqlSubscriptionApi.fireFieldChange(
      { stuffId: 's2' },
      'name',
      'old',
      'new',
    );
    await flushMicrotasks();
    expect(ret).toBe('new');
    expect(seen).toEqual([
      { target: 's2', field: 'name', oldValue: 'old', newValue: 'new' },
    ]);
  });

  it('treats NaN as equal (Object.is semantics)', async () => {
    await bootRegistry();
    const seen: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    const ret = MqlSubscriptionApi.fireFieldChange(
      { stuffId: 's3' },
      'mass',
      NaN,
      NaN,
    );
    await flushMicrotasks();
    expect(seen).toEqual([]);
    expect(Number.isNaN(ret as number)).toBe(true);
  });
});
