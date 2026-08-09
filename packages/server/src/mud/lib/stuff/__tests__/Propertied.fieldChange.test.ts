/**
 * PropertiedMixin.setProp fires PropertyChangedEvent on value-changing
 * writes; the discriminator is `property` (not `field`); namespace
 * isolation versus FieldChangedEvent.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { PropertiedMixin, Property } from '../Propertied';
import { Idea } from '../Idea';
import { EventApi } from '../../../api/event';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import EventRegistry from '../../../obj/EventRegistry';
import { Stuff } from '../Stuff';
import { PropertyChangedEvent } from '../../events/PropertyChangedEvent';
import { FieldChangedEvent } from '../../events/FieldChangedEvent';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { FieldMeta } from '../../mixin';

class PropThing extends PropertiedMixin(Idea) {
  static fieldMeta: FieldMeta = {
    savedProps: { persistent: true },
    savedPropMarshallers: { persistent: true },
  };
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

describe('PropertiedMixin property change firing', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('setProp fires PropertyChangedEvent with property discriminator', async () => {
    await bootRegistry();
    const obj = makeStuff(() => new PropThing());
    const seen: Array<{ target: string; property: string; oldValue: unknown; newValue: unknown }> = [];
    EventApi.on(PropertyChangedEvent, (e) => {
      seen.push(e.payload);
    });
    obj.setProp(Property.of<number>('gold'), 100);
    await flushMicrotasks();
    expect(seen).toEqual([
      { target: obj.stuffId, property: 'gold', oldValue: null, newValue: 100 },
    ]);
  });

  it('re-setting same value noop-skips', async () => {
    await bootRegistry();
    const obj = makeStuff(() => new PropThing());
    obj.setProp(Property.of<number>('gold'), 100);
    await flushMicrotasks();
    const seen: unknown[] = [];
    EventApi.on(PropertyChangedEvent, (e) => {
      seen.push(e.payload);
    });
    obj.setProp(Property.of<number>('gold'), 100);
    await flushMicrotasks();
    expect(seen).toEqual([]);
  });

  it('does not cross-fire FieldChangedEvent', async () => {
    await bootRegistry();
    const obj = makeStuff(() => new PropThing());
    const seenField: unknown[] = [];
    const seenProperty: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seenField.push(e.payload);
    });
    EventApi.on(PropertyChangedEvent, (e) => {
      seenProperty.push(e.payload);
    });
    obj.setProp(Property.of<string>('mood'), 'happy');
    await flushMicrotasks();
    expect(seenField).toEqual([]);
    expect(seenProperty).toHaveLength(1);
  });

  it('removed-then-re-set produces an oldValue: null event', async () => {
    await bootRegistry();
    const obj = makeStuff(() => new PropThing());
    obj.setProp(Property.of<number>('gold'), 100);
    obj.removeProp(Property.of<number>('gold'));
    await flushMicrotasks();
    const seen: Array<{ oldValue: unknown; newValue: unknown }> = [];
    EventApi.on(PropertyChangedEvent, (e) => {
      seen.push({ oldValue: e.payload.oldValue, newValue: e.payload.newValue });
    });
    obj.setProp(Property.of<number>('gold'), 50);
    await flushMicrotasks();
    expect(seen).toEqual([{ oldValue: null, newValue: 50 }]);
  });
});
