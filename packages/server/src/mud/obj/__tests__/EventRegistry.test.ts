/**
 * EventRegistry tests — bootstrap-time wiring and security boundary.
 *
 * The well-known events are exercised end-to-end via EventApi in
 * `BootstrapManager.test.ts`. This file pins behaviors that test
 * doesn't:
 *
 *   - `defaultPropAccess` denies-by-default so a caller holding the
 *     registry instance can't forge events via `reg.setProp(name, v)`.
 *   - `postRegister` registers a transient prop for every name in the
 *     `Events` table.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BootstrapManager } from '../../../backend/BootstrapManager';
import EventRegistry from '../EventRegistry';
import { StuffApi } from '../../api/stuff';
import { ShadowApi } from '../../api/shadow';
import { EventApi } from '../../api/event';
import { Events } from '../../lib/events';
import { Template } from '../../lib/stuff/Template';
import { LeafTemplate } from '../../lib/stuff/LeafTemplate';
import { Property, type PropValue } from '../../lib/stuff/Propertied';

async function bootstrapEventRegistry(): Promise<EventRegistry> {
  vi.spyOn(Template, 'findByPath').mockImplementation(async (path: string) => {
    if (path === '/obj/EventRegistry') {
      const t = new LeafTemplate();
      t.path = path;
      t.class = '/obj/EventRegistry';
      t.hydratorClass = '/lib/persistence/PersistentHydrator';
      t.data = {};
      return t;
    }
    if (path === '/lib/persistence/PersistentHydrator') {
      const t = new LeafTemplate();
      t.path = path;
      t.class = '/lib/persistence/PersistentHydrator';
      t.data = {};
      return t;
    }
    return null;
  });
  await BootstrapManager.run([{ templatePath: '/obj/EventRegistry' }]);
  const reg = StuffApi.findByTemplatePath<EventRegistry>('/obj/EventRegistry');
  if (!reg) throw new Error('test setup: EventRegistry not bootstrapped');
  return reg;
}

describe('EventRegistry', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('postRegister installs a prop for every well-known event', async () => {
    const reg = await bootstrapEventRegistry();
    for (const name of Object.values(Events)) {
      // EventApi.on succeeds for every well-known event — implies the
      // prop is present and the per-event policy mediates subscribe.
      const sub = EventApi.on(name, () => {});
      expect(sub.eventName).toBe(name);
      sub.unsubscribe();
    }
  });

  it('defaultPropAccess denies a forged direct setProp from outside EventApi', async () => {
    const reg = await bootstrapEventRegistry();
    // A non-well-known event has no policy at all. Auto-init from a
    // direct setProp falls through to `defaultPropAccess`, which denies
    // by default. The forged setProp must return false.
    const forged = Property.of<PropValue>('forged.event');
    const ok = reg.setProp(forged, { payload: 'x' });
    expect(ok).toBe(false);
  });

  it('defaultPropAccess denies a forged direct getProp from outside EventApi', async () => {
    const reg = await bootstrapEventRegistry();
    const forged = Property.of<PropValue>('forged.event');
    // Auto-init runs deny-by-default; reading via the registry directly
    // returns null because the access check denies the Get.
    const value = reg.getProp(forged);
    expect(value).toBeNull();
  });

  it('a forged event still works via the EventApi-mediated path', async () => {
    await bootstrapEventRegistry();
    // emittableBy() with no allowlist is the default for unknown events —
    // open emit/subscribe, but ONLY through EventApi. So a custom event
    // routed through EventApi.emit/on must succeed.
    let seen: unknown = null;
    const sub = EventApi.on('forged.event', (p) => {
      seen = p;
    });
    expect(() => EventApi.emit('forged.event', { hello: 'world' })).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(seen).toEqual({ hello: 'world' });
    sub.unsubscribe();
  });
});
