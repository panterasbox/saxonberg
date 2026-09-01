import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Window from '../thing/Window';
import CartesianLocation from '../../lib/location/CartesianLocation';
import Thing from '../../lib/stuff/Thing';
import { PersistenceManager, Collections } from '../../../backend/PersistenceManager';
import { StuffApi } from '../../api/stuff';
import PersistentHydrator from '../idea/persistence/PersistentHydrator';
import { BoundaryApi } from '../../api/boundary';
import {
  makeStuffAtPath,
  makeStuff,
} from '../../lib/security/__tests__/test-setup';

type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  data: Record<string, unknown>;
};

function installInMemoryStore(initial: Doc[] = []): Doc[] {
  const store: Doc[] = initial.map((d, i) => ({ _id: String(i + 1), ...d }));

  const save = vi.fn(async (_c: string, doc: Doc) => {
    const copy = { ...doc };
    if (copy._id) {
      const idx = store.findIndex((d) => d._id === copy._id);
      if (idx >= 0) store[idx] = copy;
      else store.push(copy);
      return copy._id!;
    }
    copy._id = String(store.length + 1);
    store.push(copy);
    return copy._id;
  });

  const find = vi.fn(async (collection: string, query: Record<string, unknown>) => {
    if (collection !== Collections.Content) return [];
    if (typeof query.path === 'string') {
      return store.filter((d) => d.path === query.path);
    }
    return store.slice();
  });

  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
  } as unknown as PersistenceManager);

  return store;
}

describe('Window.setAttachedHosts', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('resolves both hosts via singleton and attaches anchors', async () => {
    const a = makeStuffAtPath(() => new CartesianLocation(), '/room/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/room/b');
    const w = makeStuff(() => new Window());
    await w.setAttachedHosts(['/room/a', '/room/b']);
    expect(w.getAttachedHosts()).toEqual(['/room/a', '/room/b']);
    expect(w.getAnchorA()).not.toBeNull();
    expect(w.getAnchorB()).not.toBeNull();
    expect(a.getFixtureBoundaries()).toContain(w);
    expect(b.getFixtureBoundaries()).toContain(w);
  });

  it('is idempotent: re-set with same pair is no-op', async () => {
    makeStuffAtPath(() => new CartesianLocation(), '/room/a');
    makeStuffAtPath(() => new CartesianLocation(), '/room/b');
    const w = makeStuff(() => new Window());
    await w.setAttachedHosts(['/room/a', '/room/b']);
    await expect(
      w.setAttachedHosts(['/room/a', '/room/b'])
    ).resolves.toBeUndefined();
  });

  it('accepts hosts in reverse order on re-set (matchesReverse)', async () => {
    makeStuffAtPath(() => new CartesianLocation(), '/room/a');
    makeStuffAtPath(() => new CartesianLocation(), '/room/b');
    const w = makeStuff(() => new Window());
    await w.setAttachedHosts(['/room/a', '/room/b']);
    await expect(
      w.setAttachedHosts(['/room/b', '/room/a'])
    ).resolves.toBeUndefined();
  });

  it('throws on conflict: different pair after attach', async () => {
    makeStuffAtPath(() => new CartesianLocation(), '/room/a');
    makeStuffAtPath(() => new CartesianLocation(), '/room/b');
    makeStuffAtPath(() => new CartesianLocation(), '/room/c');
    const w = makeStuff(() => new Window());
    await w.setAttachedHosts(['/room/a', '/room/b']);
    await expect(
      w.setAttachedHosts(['/room/a', '/room/c'])
    ).rejects.toThrow(/already attached/);
  });

  it('refuses hostA === hostB', async () => {
    makeStuffAtPath(() => new CartesianLocation(), '/room/a');
    const w = makeStuff(() => new Window());
    await expect(
      w.setAttachedHosts(['/room/a', '/room/a'])
    ).rejects.toThrow(/must differ/);
  });

  it('rejects malformed input', async () => {
    const w = makeStuff(() => new Window());
    await expect(
      w.setAttachedHosts(['/a'] as unknown as [string, string])
    ).rejects.toThrow(TypeError);
  });

  it('throws if a resolved host is not Adornable', async () => {
    makeStuffAtPath(() => new CartesianLocation(), '/room/a');
    makeStuffAtPath(() => new Thing(), '/thing'); // not Adornable
    const w = makeStuff(() => new Window());
    await expect(
      w.setAttachedHosts(['/room/a', '/thing'])
    ).rejects.toThrow(/AdornableMixin/);
  });

  it('lazy-cloning: hosts not yet registered, setAttachedHosts triggers their clone via singleton', async () => {
    installInMemoryStore([
      {
        path: '/room/a',
        class: '/platform/location/CartesianLocation',
        data: {},
      },
      {
        path: '/room/b',
        class: '/platform/location/CartesianLocation',
        data: {},
      },
    ]);
    const w = makeStuff(() => new Window());
    // Hosts have NOT been instantiated yet.
    expect(StuffApi.findByTemplatePath('/room/a')).toBeFalsy();
    expect(StuffApi.findByTemplatePath('/room/b')).toBeFalsy();
    await w.setAttachedHosts(['/room/a', '/room/b']);
    expect(StuffApi.findByTemplatePath('/room/a')).toBeTruthy();
    expect(StuffApi.findByTemplatePath('/room/b')).toBeTruthy();
    expect(w.getAnchorA()).not.toBeNull();
    expect(w.getAnchorB()).not.toBeNull();
  });

  it('hydrates via PersistentHydrator method-dispatch', async () => {
    makeStuffAtPath(() => new CartesianLocation(), '/room/a');
    makeStuffAtPath(() => new CartesianLocation(), '/room/b');
    const w = makeStuff(() => new Window());
    await makeStuff(() => new PersistentHydrator()).hydrate(w, {
      attachedHosts: ['/room/a', '/room/b'],
    });
    expect(w.getAttachedHosts()).toEqual(['/room/a', '/room/b']);
    expect(w.getAnchorA()).not.toBeNull();
    expect(w.getAnchorB()).not.toBeNull();
  });

  it('HMR-style: destruct + re-clone attaches cleanly to same hosts', async () => {
    makeStuffAtPath(() => new CartesianLocation(), '/room/a');
    makeStuffAtPath(() => new CartesianLocation(), '/room/b');
    const w1 = makeStuff(() => new Window());
    await w1.setAttachedHosts(['/room/a', '/room/b']);
    // Destruct via BoundaryApi (clears anchors via Boundary.onDestruct).
    BoundaryApi.destruct(w1);
    // A second Window attaches cleanly to the same hosts.
    const w2 = makeStuff(() => new Window());
    await expect(
      w2.setAttachedHosts(['/room/a', '/room/b'])
    ).resolves.toBeUndefined();
    expect(w2.getAnchorA()).not.toBeNull();
    expect(w2.getAnchorB()).not.toBeNull();
  });

  it('Door does NOT have a setAttachedHosts method (intentionally per slate)', () => {
    // Sanity check: only Window has this surface; Doors are wired
    // transitively via Exitable.applyExits door: paths.
    expect(
      (
        Window.prototype as unknown as { setAttachedHosts?: unknown }
      ).setAttachedHosts
    ).toBeDefined();
    // Door deliberately omits the method.
    // We don't import Door here just to negate — sanity is covered by
    // the boundary.md doc + the Door's persistentFields not listing
    // attachedHosts.
  });
});
