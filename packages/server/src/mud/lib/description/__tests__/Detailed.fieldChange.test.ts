/**
 * DetailedMixin setDetail / removeDetail fire FieldChangedEvent for
 * the `details` field discriminator.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { DetailedMixin } from '../Detailed';
import { Idea } from '../../stuff/Idea';
import { EventApi } from '../../../api/event';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import EventRegistry from '../../../obj/EventRegistry';
import { Stuff } from '../../stuff/Stuff';
import { FieldChangedEvent } from '../../events/FieldChangedEvent';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { FieldMeta } from '../../mixin';

class DetailedThing extends DetailedMixin(Idea) {
  static fieldMeta: FieldMeta = {};
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

describe('DetailedMixin field change firing', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('setDetail fires FieldChangedEvent { field: "details" } once', async () => {
    await bootRegistry();
    const obj = makeStuff(() => new DetailedThing());
    const seen: Array<{ target: string; field: string }> = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push({ target: e.payload.target, field: e.payload.field });
    });
    obj.setDetail(['handle'], 'a brass handle');
    await flushMicrotasks();
    expect(seen).toEqual([{ target: obj.stuffId, field: 'details' }]);
  });

  it('aliased setDetail fires once (not per alias)', async () => {
    await bootRegistry();
    const obj = makeStuff(() => new DetailedThing());
    const seen: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    obj.setDetail(['handle', 'doorknob'], 'a brass handle');
    await flushMicrotasks();
    expect(seen).toHaveLength(1);
  });

  it('setDetail of existing id does not fire (no mutation)', async () => {
    await bootRegistry();
    const obj = makeStuff(() => new DetailedThing());
    obj.setDetail(['handle'], 'a brass handle');
    await flushMicrotasks();
    const seen: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    obj.setDetail(['handle'], 'a different description');
    await flushMicrotasks();
    expect(seen).toEqual([]);
  });

  it('removeDetail fires when present id is removed', async () => {
    await bootRegistry();
    const obj = makeStuff(() => new DetailedThing());
    obj.setDetail(['handle'], 'a brass handle');
    await flushMicrotasks();
    const seen: Array<{ field: string }> = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push({ field: e.payload.field });
    });
    obj.removeDetail(['handle']);
    await flushMicrotasks();
    expect(seen).toEqual([{ field: 'details' }]);
  });

  it('removeDetail of absent id does not fire', async () => {
    await bootRegistry();
    const obj = makeStuff(() => new DetailedThing());
    const seen: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    obj.removeDetail(['nope']);
    await flushMicrotasks();
    expect(seen).toEqual([]);
  });
});
