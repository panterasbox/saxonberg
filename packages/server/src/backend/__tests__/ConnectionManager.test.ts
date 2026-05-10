/**
 * ConnectionManager unit tests.
 *
 * The manager wraps a `Map<socketId, Interactive>` and delegates
 * lifecycle to `StuffApi.create` / `StuffApi.destruct`. Tests stub both
 * boundaries so we don't need a live registry, hydration, or proxy
 * machinery — the manager's responsibility is the map.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionManager } from '../ConnectionManager';
import { StuffApi } from '../../mud/api/stuff';
import type { Interactive } from '../../mud/obj/Interactive';
import type { User } from '../../mud/lib/identity/User';

function fakeUser(id: string): User {
  return { _id: id } as User;
}

function fakeInteractive(socketId: string, user: User): Interactive {
  // Shape just enough for ConnectionManager's debug logs and the
  // identity checks the tests perform. ConnectionManager treats the
  // result of `StuffApi.create` opaquely — it stores the reference and
  // hands it to StuffApi.destruct on teardown — so a duck-typed stand-in
  // is enough. Real construction is exercised in the Interactive tests.
  return {
    getSocketId: () => socketId,
    getUser: () => user,
  } as unknown as Interactive;
}

function stubLifecycle(): {
  creates: Interactive[];
  destructs: Interactive[];
} {
  const tally = { creates: [] as Interactive[], destructs: [] as Interactive[] };
  vi.spyOn(StuffApi, 'create').mockImplementation(async () => {
    // Bypass the factory entirely; return a synthetic Interactive
    // shaped for the manager's narrow consumption. Running the real
    // factory would trip Stuff's construction-sentinel guard and the
    // sentinel exists to enforce "always via StuffApi.create" at
    // runtime — we're stubbing that whole layer.
    const ix = fakeInteractive('stub', fakeUser('stub-user'));
    tally.creates.push(ix);
    return ix as unknown as never;
  });
  vi.spyOn(StuffApi, 'destruct').mockImplementation((obj) => {
    tally.destructs.push(obj as Interactive);
  });
  return tally;
}

describe('ConnectionManager', () => {
  let cm: ConnectionManager;
  let tally: { creates: number; destructs: Interactive[] };

  beforeEach(() => {
    vi.restoreAllMocks();
    cm = ConnectionManager.get();
    // The singleton survives across tests — clear under the stub
    // BEFORE installing the test's tally, so destructs from previous
    // tests don't pollute this test's ledger.
    vi.spyOn(StuffApi, 'destruct').mockImplementation(() => {});
    cm.clearAll();
    vi.restoreAllMocks();
    tally = stubLifecycle();
  });

  afterEach(() => {
    vi.spyOn(StuffApi, 'destruct').mockImplementation(() => {});
    cm.clearAll();
    vi.restoreAllMocks();
  });

  it('get() returns the same singleton', () => {
    expect(ConnectionManager.get()).toBe(cm);
  });

  it('starts empty', () => {
    expect(cm.getConnectionCount()).toBe(0);
    expect(cm.getAllInteractives()).toEqual([]);
    expect(cm.getSocketIds()).toEqual([]);
  });

  describe('createInteractive', () => {
    it('creates, registers, and returns a new Interactive', async () => {
      const user = fakeUser('u1');
      const interactive = await cm.createInteractive('sock-1', 'sess-1', user);
      expect(interactive).toBeDefined();
      expect(cm.getInteractive('sock-1')).toBe(interactive);
      expect(cm.getConnectionCount()).toBe(1);
      expect(cm.hasConnection('sock-1')).toBe(true);
      expect(cm.getSocketIds()).toEqual(['sock-1']);
      expect(tally.creates).toHaveLength(1);
    });

    it('returns the existing Interactive on duplicate socketId without re-creating', async () => {
      const user = fakeUser('u1');
      const a = await cm.createInteractive('sock-1', 'sess-1', user);
      const b = await cm.createInteractive('sock-1', 'sess-1', user);
      expect(a).toBe(b);
      // Only one trip through StuffApi.create — the second call short-
      // circuits on the existing-socket warning path.
      expect(tally.creates).toHaveLength(1);
      expect(cm.getConnectionCount()).toBe(1);
    });

    it('tracks multiple distinct sockets independently', async () => {
      const userA = fakeUser('uA');
      const userB = fakeUser('uB');
      await cm.createInteractive('sock-A', 'sess-A', userA);
      await cm.createInteractive('sock-B', 'sess-B', userB);
      expect(cm.getConnectionCount()).toBe(2);
      expect(cm.getSocketIds().sort()).toEqual(['sock-A', 'sock-B']);
      expect(cm.getAllInteractives()).toHaveLength(2);
      expect(tally.creates).toHaveLength(2);
    });
  });

  describe('removeInteractive', () => {
    it('returns false and does not call destruct when socketId is unknown', () => {
      const removed = cm.removeInteractive('nope');
      expect(removed).toBe(false);
      expect(tally.destructs).toHaveLength(0);
    });

    it('removes the entry and routes through StuffApi.destruct', async () => {
      const user = fakeUser('u1');
      const ix = await cm.createInteractive('sock-1', 'sess-1', user);
      const removed = cm.removeInteractive('sock-1');
      expect(removed).toBe(true);
      expect(cm.hasConnection('sock-1')).toBe(false);
      expect(cm.getConnectionCount()).toBe(0);
      expect(tally.destructs).toEqual([ix]);
    });

    it('double-remove of the same socket returns false the second time', async () => {
      const user = fakeUser('u1');
      await cm.createInteractive('sock-1', 'sess-1', user);
      expect(cm.removeInteractive('sock-1')).toBe(true);
      expect(cm.removeInteractive('sock-1')).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('destructs every entry and empties the map', async () => {
      const userA = fakeUser('uA');
      const userB = fakeUser('uB');
      const a = await cm.createInteractive('sock-A', 'sess-A', userA);
      const b = await cm.createInteractive('sock-B', 'sess-B', userB);

      cm.clearAll();

      expect(cm.getConnectionCount()).toBe(0);
      expect(tally.destructs).toContain(a);
      expect(tally.destructs).toContain(b);
      expect(tally.destructs).toHaveLength(2);
    });

    it('is safe on an empty manager', () => {
      expect(() => cm.clearAll()).not.toThrow();
      expect(tally.destructs).toEqual([]);
    });
  });
});
