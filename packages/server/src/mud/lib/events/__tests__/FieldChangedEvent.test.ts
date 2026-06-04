/**
 * FieldChangedEvent unit tests + fireFieldChange helper semantics.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EventApi } from '../../../api/event';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { EventRegistry } from '../../../obj/EventRegistry';
import { Stuff } from '../../stuff/Stuff';
import { FieldChangedEvent, fireFieldChange } from '../FieldChangedEvent';

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

describe('FieldChangedEvent', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('carries kind, payload, and exposes static KIND', () => {
    const event = new FieldChangedEvent({
      target: 'stuff-1',
      field: 'name',
      oldValue: 'old',
      newValue: 'new',
    });
    expect(event.kind).toBe('stuff.fieldChanged');
    expect(FieldChangedEvent.KIND).toBe('stuff.fieldChanged');
    expect(event.payload).toEqual({
      target: 'stuff-1',
      field: 'name',
      oldValue: 'old',
      newValue: 'new',
    });
  });

  it('fireFieldChange skips firing when old equals new (Object.is)', async () => {
    await bootRegistry();
    const seen: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    const ret = fireFieldChange({ stuffId: 's1' }, 'name', 'foo', 'foo');
    await flushMicrotasks();
    expect(seen).toEqual([]);
    expect(ret).toBe('foo');
  });

  it('fireFieldChange emits FieldChangedEvent on change and returns newValue', async () => {
    await bootRegistry();
    const seen: Array<{ target: string; field: string; oldValue: unknown; newValue: unknown }> = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    const ret = fireFieldChange({ stuffId: 's2' }, 'name', 'old', 'new');
    await flushMicrotasks();
    expect(ret).toBe('new');
    expect(seen).toEqual([
      { target: 's2', field: 'name', oldValue: 'old', newValue: 'new' },
    ]);
  });

  it('fireFieldChange treats NaN as equal (Object.is semantics)', async () => {
    await bootRegistry();
    const seen: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    const ret = fireFieldChange({ stuffId: 's3' }, 'mass', NaN, NaN);
    await flushMicrotasks();
    expect(seen).toEqual([]);
    expect(Number.isNaN(ret as number)).toBe(true);
  });
});
