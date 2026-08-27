/**
 * GlobbableMixin.setQuantity fires FieldChangedEvent.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { GlobbableMixin } from '../Globbable';
import { Idea } from '../Idea';
import { EventApi } from '../../../api/event';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import EventRegistry from '../../../platform/idea/EventRegistry';
import { Stuff } from '../Stuff';
import { FieldChangedEvent } from '../../events/FieldChangedEvent';
import { makeStuff } from '../../security/__tests__/test-setup';

class Coin extends GlobbableMixin(Idea) {
  static _mixinName = 'Coin';
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

describe('GlobbableMixin field change firing', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('setQuantity from 1 to 5 fires FieldChangedEvent with payload', async () => {
    await bootRegistry();
    const coin = makeStuff(() => new Coin());
    const seen: Array<{ target: string; field: string; oldValue: unknown; newValue: unknown }> = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    coin.setQuantity(5);
    await flushMicrotasks();
    expect(seen).toEqual([
      { target: coin.stuffId, field: 'quantity', oldValue: 1, newValue: 5 },
    ]);
  });

  it('re-setting same quantity noop-skips', async () => {
    await bootRegistry();
    const coin = makeStuff(() => new Coin());
    coin.setQuantity(5);
    await flushMicrotasks();
    const seen: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    coin.setQuantity(5);
    await flushMicrotasks();
    expect(seen).toEqual([]);
  });

  it('invalid quantity throws before firing', async () => {
    await bootRegistry();
    const coin = makeStuff(() => new Coin());
    const seen: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    expect(() => coin.setQuantity(0)).toThrow(/positive integer/);
    expect(() => coin.setQuantity(-1)).toThrow(/positive integer/);
    expect(() => coin.setQuantity(1.5)).toThrow(/positive integer/);
    await flushMicrotasks();
    expect(seen).toEqual([]);
  });
});
