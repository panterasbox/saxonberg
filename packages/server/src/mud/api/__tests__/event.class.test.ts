/**
 * EventApi class-based fire / on overload tests.
 *
 * Verifies the unified bus invariant: the string-keyed `emit/on` and
 * the class-based `fire/on(EventClass, ...)` are two spellings of one
 * channel.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import EventRegistry from '../../platform/idea/EventRegistry';
import { Stuff } from '../../lib/stuff/Stuff';
import { FieldChangedEvent } from '../../lib/events/FieldChangedEvent';
import { GenericEvent } from '../../lib/events/GenericEvent';

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
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

describe('EventApi class-based fire/on', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('string-keyed listener sees a class-based fire', async () => {
    await bootRegistry();
    const seen: unknown[] = [];
    EventApi.on<{ target: string; field: string; oldValue: unknown; newValue: unknown }>(
      FieldChangedEvent.KIND,
      (p) => {
        seen.push(p);
      },
    );
    EventApi.fire(
      new FieldChangedEvent({
        target: 's1',
        field: 'name',
        oldValue: 'old',
        newValue: 'new',
      }),
    );
    await flushMicrotasks();
    expect(seen).toEqual([
      { target: 's1', field: 'name', oldValue: 'old', newValue: 'new' },
    ]);
  });

  it('class-based listener sees a string-keyed emit (reverse direction)', async () => {
    await bootRegistry();
    const seen: Array<{ kind: string; payload: unknown }> = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push({ kind: e.kind, payload: e.payload });
    });
    EventApi.emit(FieldChangedEvent.KIND, {
      target: 's2',
      field: 'shortDescription',
      oldValue: '',
      newValue: 'sparkly',
    });
    await flushMicrotasks();
    expect(seen).toHaveLength(1);
    expect(seen[0]!.kind).toBe('stuff.fieldChanged');
    expect(seen[0]!.payload).toEqual({
      target: 's2',
      field: 'shortDescription',
      oldValue: '',
      newValue: 'sparkly',
    });
  });

  it('class-based listener delivers {kind, payload} not the class instance', async () => {
    await bootRegistry();
    let received: unknown = null;
    EventApi.on(FieldChangedEvent, (e) => {
      received = e;
    });
    EventApi.fire(
      new FieldChangedEvent({
        target: 'a',
        field: 'name',
        oldValue: 'b',
        newValue: 'c',
      }),
    );
    await flushMicrotasks();
    // The listener receives a plain event-like object, not a class instance.
    expect(received).not.toBeInstanceOf(FieldChangedEvent);
    expect(received).toEqual({
      kind: 'stuff.fieldChanged',
      payload: { target: 'a', field: 'name', oldValue: 'b', newValue: 'c' },
    });
  });

  it('GenericEvent fires through string-keyed listener', async () => {
    await bootRegistry();
    // GenericEvent has no static KIND (the `kind` is per-instance) —
    // it routes through string-keyed listeners by its instance kind.
    const seen: unknown[] = [];
    EventApi.on<{ x: number }>('generic.test.adhoc', (p) => {
      seen.push(p);
    });
    EventApi.fire(new GenericEvent('generic.test.adhoc', { x: 5 }));
    await flushMicrotasks();
    expect(seen).toEqual([{ x: 5 }]);
  });
});
