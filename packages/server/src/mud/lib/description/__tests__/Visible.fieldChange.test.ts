/**
 * VisibleMixin description setters fire FieldChangedEvent.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { VisibleMixin } from '../Visible';
import { Idea } from '../../stuff/Idea';
import { EventApi } from '../../../api/event';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import EventRegistry from '../../../platform/idea/EventRegistry';
import { Stuff } from '../../stuff/Stuff';
import { FieldChangedEvent } from '../../events/FieldChangedEvent';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { FieldMeta } from '../../mixin';

class VisibleThing extends VisibleMixin(Idea) {
  static fieldMeta: FieldMeta = {};
}

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

describe('VisibleMixin field change firing', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('setShortDescription fires FieldChangedEvent on change', async () => {
    await bootRegistry();
    const obj = makeStuff(() => new VisibleThing());
    const seen: Array<{ target: string; field: string; oldValue: unknown; newValue: unknown }> = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    obj.setShortDescription('a thing');
    await flushMicrotasks();
    expect(seen).toEqual([
      { target: obj.stuffId, field: 'shortDescription', oldValue: '', newValue: 'a thing' },
    ]);
  });

  it('setShortDescription noop-skip on equal value', async () => {
    await bootRegistry();
    const obj = makeStuff(() => new VisibleThing());
    obj.setShortDescription('a thing');
    await flushMicrotasks();
    const seen: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    obj.setShortDescription('a thing');
    await flushMicrotasks();
    expect(seen).toEqual([]);
  });

  it('setLongDescription fires FieldChangedEvent on change', async () => {
    await bootRegistry();
    const obj = makeStuff(() => new VisibleThing());
    const seen: Array<{ field: string; newValue: unknown }> = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push({ field: e.payload.field, newValue: e.payload.newValue });
    });
    obj.setLongDescription('a tall and elegant thing');
    await flushMicrotasks();
    expect(seen).toEqual([
      { field: 'longDescription', newValue: 'a tall and elegant thing' },
    ]);
  });

  it('setLongDescription noop-skip on equal value', async () => {
    await bootRegistry();
    const obj = makeStuff(() => new VisibleThing());
    obj.setLongDescription('a tall and elegant thing');
    await flushMicrotasks();
    const seen: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    obj.setLongDescription('a tall and elegant thing');
    await flushMicrotasks();
    expect(seen).toEqual([]);
  });
});
