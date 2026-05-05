/**
 * EventApi tests. Constructs an EventRegistry directly via
 * `StuffApi.create` and stamps a templatePath so EventApi's
 * `findByTemplatePath('/obj/EventRegistry')` resolves it. The
 * bootstrap path itself is exercised in Phase 4's integration
 * test.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventApi, emittableBy } from '../event';
import { Events } from '../event-types';
import { EventRegistry } from '../../obj/EventRegistry';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { Stuff } from '../../lib/stuff/Stuff';
import {
  Property,
  PropOperations,
  type PropValue,
} from '../../lib/stuff/Propertied';
import { SecurityError } from '../../lib/security/errors';

async function makeRegistry(): Promise<EventRegistry> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    (r as unknown as { templatePath?: string }).templatePath =
      '/obj/EventRegistry';
    return r;
  });
  // The templatePath stamp landed AFTER register, so re-register so
  // the byTemplatePath index picks it up.
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
  return reg;
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('EventApi', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('emits a payload to a subscribed listener on the next microtask', async () => {
    await makeRegistry();
    const seen: number[] = [];
    EventApi.on<number>(Events.PlayerLoggedIn, (payload) => {
      seen.push(payload);
    });
    EventApi.emit<number>(Events.PlayerLoggedIn, 42);
    expect(seen).toEqual([]); // microtask hasn't run yet
    await flushMicrotasks();
    expect(seen).toEqual([42]);
  });

  it('isolates errors so siblings still fire', async () => {
    await makeRegistry();
    const order: string[] = [];
    EventApi.on(Events.PlayerLoggedIn, () => {
      order.push('a');
      throw new Error('boom');
    });
    EventApi.on(Events.PlayerLoggedIn, () => {
      order.push('b');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    EventApi.emit(Events.PlayerLoggedIn, 1);
    await flushMicrotasks();
    expect(order).toEqual(['a', 'b']);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('catches rejected promises from async listeners', async () => {
    await makeRegistry();
    EventApi.on(Events.PlayerLoggedIn, async () => {
      throw new Error('async-boom');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    EventApi.emit(Events.PlayerLoggedIn, 1);
    await flushMicrotasks();
    await flushMicrotasks();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('exposes lastPayload === null on a never-emitted event subscription', async () => {
    await makeRegistry();
    const sub = EventApi.on(Events.PlayerLoggedOut, () => {});
    expect(sub.lastPayload).toBeNull();
  });

  it('updates lastPayload after each emit', async () => {
    await makeRegistry();
    const sub = EventApi.on<number>(Events.PlayerLoggedIn, () => {});
    EventApi.emit<number>(Events.PlayerLoggedIn, 1);
    await flushMicrotasks();
    expect(sub.lastPayload).toBe(1);
    EventApi.emit<number>(Events.PlayerLoggedIn, 2);
    await flushMicrotasks();
    expect(sub.lastPayload).toBe(2);
  });

  it('filter skips listener when predicate returns false', async () => {
    await makeRegistry();
    const seen: number[] = [];
    EventApi.on<number>(
      Events.PlayerLoggedIn,
      (p) => {
        seen.push(p);
      },
      { filter: (p) => p % 2 === 0 }
    );
    EventApi.emit<number>(Events.PlayerLoggedIn, 1);
    EventApi.emit<number>(Events.PlayerLoggedIn, 2);
    EventApi.emit<number>(Events.PlayerLoggedIn, 3);
    await flushMicrotasks();
    expect(seen).toEqual([2]);
  });

  it('until unsubscribes the listener after the predicate hits', async () => {
    await makeRegistry();
    const seen: number[] = [];
    EventApi.on<number>(
      Events.PlayerLoggedIn,
      (p) => {
        seen.push(p);
      },
      { until: (p) => p >= 2 }
    );
    EventApi.emit<number>(Events.PlayerLoggedIn, 1);
    await flushMicrotasks();
    EventApi.emit<number>(Events.PlayerLoggedIn, 2);
    await flushMicrotasks();
    EventApi.emit<number>(Events.PlayerLoggedIn, 3);
    await flushMicrotasks();
    expect(seen).toEqual([1, 2]);
  });

  it('once auto-unsubscribes after the first call', async () => {
    await makeRegistry();
    const seen: number[] = [];
    EventApi.once<number>(Events.PlayerLoggedIn, (p) => {
      seen.push(p);
    });
    EventApi.emit<number>(Events.PlayerLoggedIn, 1);
    await flushMicrotasks();
    EventApi.emit<number>(Events.PlayerLoggedIn, 2);
    await flushMicrotasks();
    expect(seen).toEqual([1]);
  });

  it('unsubscribe stops further deliveries', async () => {
    await makeRegistry();
    const seen: number[] = [];
    const sub = EventApi.on<number>(Events.PlayerLoggedIn, (p) => {
      seen.push(p);
    });
    EventApi.emit<number>(Events.PlayerLoggedIn, 1);
    await flushMicrotasks();
    sub.unsubscribe();
    EventApi.emit<number>(Events.PlayerLoggedIn, 2);
    await flushMicrotasks();
    expect(seen).toEqual([1]);
  });

  it('history returns the recent payloads in order', async () => {
    await makeRegistry();
    EventApi.emit<number>(Events.PlayerLoggedIn, 1);
    EventApi.emit<number>(Events.PlayerLoggedIn, 2);
    EventApi.emit<number>(Events.PlayerLoggedIn, 3);
    const recent = EventApi.history<number>(Events.PlayerLoggedIn);
    expect(recent.map((e) => e.payload)).toEqual([1, 2, 3]);
  });

  it('throws SecurityError when emit fails the per-event policy', async () => {
    await makeRegistry();
    // StuffCreated is allowlisted to StuffApi only — direct emit from
    // a test, which is not a StuffApi frame, must fail.
    expect(() =>
      EventApi.emit(Events.StuffCreated, { stuffId: 'x' })
    ).toThrow(SecurityError);
  });

  it('throws SecurityError when bypassing EventApi to call setProp directly', async () => {
    const reg = await makeRegistry();
    // Attempt to set the prop without going through EventApi.
    const ok = reg.setProp(
      Property.of<PropValue>(Events.StuffCreated),
      { stuffId: 'forged' }
    );
    expect(ok).toBe(false);
  });

  it('emittableBy with no allowlist permits emit but defends the EventApi route', async () => {
    const reg = await makeRegistry();
    reg.initProp(Property.of<PropValue>('debug.event'), {
      transient: true,
      checkAccess: emittableBy(),
    });
    // Direct setProp still rejected (no EventApi frame).
    const okDirect = reg.setProp(
      Property.of<PropValue>('debug.event'),
      'forged'
    );
    expect(okDirect).toBe(false);
    // Through EventApi: allowed.
    expect(() => EventApi.emit('debug.event', 'real')).not.toThrow();
  });

  it('sets a fresh EventDispatch frame so listeners see no lingering target', async () => {
    await makeRegistry();
    let observedTarget: unknown = 'unset';
    EventApi.on(Events.PlayerLoggedIn, (_payload, ctx) => {
      observedTarget = ctx.triggeringContext;
    });
    EventApi.emit(Events.PlayerLoggedIn, 1);
    await flushMicrotasks();
    expect(observedTarget).not.toBe('unset');
  });

  it('checkProp from a non-EventApi caller is denied (Get-gating)', async () => {
    const reg = await makeRegistry();
    // From the test directly — no EventApi frame above us — the
    // Get-gate denies access. checkProp returns null even though
    // the prop exists. EventApi.on is the legitimate read path.
    expect(
      reg.checkProp(Property.of<PropValue>(Events.PlayerLoggedIn))
    ).toBeNull();

    // Going through EventApi.on works because the decorator pushes
    // an EventApi frame for the access check to find.
    const sub = EventApi.on(Events.PlayerLoggedIn, () => {});
    expect(sub).toBeDefined();
    sub.unsubscribe();

    void PropOperations.Get;
  });

  it('subscribing to a never-declared custom event auto-registers it', async () => {
    await makeRegistry();
    // Custom events are first-class — no need to add them to the
    // Events table first. The first emit OR subscribe declares
    // them with the default emittableBy() policy.
    const seen: string[] = [];
    const sub = EventApi.on<string>('quest.completed', (p) => {
      seen.push(p);
    });
    EventApi.emit<string>('quest.completed', 'kill the dragon');
    await flushMicrotasks();
    expect(seen).toEqual(['kill the dragon']);
    sub.unsubscribe();
  });

  it('emitting a never-declared custom event auto-registers and stores the payload', async () => {
    await makeRegistry();
    EventApi.emit<number>('counter.bumped', 7);
    // A subscriber arriving after the first emit sees the cached
    // last payload, just like a well-known event would.
    const sub = EventApi.on<number>('counter.bumped', () => {});
    expect(sub.lastPayload).toBe(7);
    sub.unsubscribe();
  });

  it('direct reg.setProp on an unknown event from outside EventApi is still denied', async () => {
    const reg = await makeRegistry();
    // Auto-init through PropertiedMixin's setProp would be the
    // bypass path — it falls back to defaultPropAccess, which
    // EventRegistry overrides to deny. Defense holds.
    const ok = reg.setProp(
      Property.of<PropValue>('forged.bypass'),
      'sneaky'
    );
    expect(ok).toBe(false);
  });

  it('survives EventApi.on for an event where the registry has no prop yet (returns null cache, succeeds)', async () => {
    const reg = await makeRegistry();
    // Ensure the prop exists — postRegister created all standard
    // events. Subscribing returns lastPayload === null prior to any
    // emit; that's the "no NEVER_EMITTED sentinel needed" property.
    const sub = EventApi.on(Events.ModuleReloaded, () => {});
    expect(sub.lastPayload).toBeNull();
    // Cleanup: avoid leaking subscriber across tests.
    sub.unsubscribe();
    void reg;
  });
});

describe('EventRegistry composition + postRegister', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    EventApi._clearAllForTesting();
  });

  it('composes PropertiedMixin + PostRegistrationMixin', async () => {
    const reg = await makeRegistry();
    // Sanity: it IS a Stuff and has setProp.
    expect(reg).toBeInstanceOf(Stuff);
    expect(typeof reg.setProp).toBe('function');
    expect(typeof reg.postRegister).toBe('function');
  });

  it('initializes every Events.* so EventApi.on resolves for each', async () => {
    await makeRegistry();
    // EventApi.on is the only legitimate observer of "is this prop
    // initialized?" — the Get-gate denies direct checkProp from
    // outside the bus. A successful subscription proves the prop
    // exists with a working checkAccess. Note: subscribing here
    // reads `lastPayload` AFTER any prior emits during setup
    // (e.g. StuffCreated fires during registry construction), so
    // we don't assert null here — just that subscribe succeeded.
    for (const name of Object.values(Events)) {
      const sub = EventApi.on(name, () => {});
      expect(sub.eventName).toBe(name);
      sub.unsubscribe();
    }
  });
});
