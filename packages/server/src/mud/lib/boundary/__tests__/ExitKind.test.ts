/**
 * Exit-KIND templates — an authored kind at `/obj/exits/<kind>` that a
 * room's `exits:` entry references via `kind:`. `applyExits` clones the
 * kind (hydrating its authored defaults) and completes identity via the
 * participant-gated `Exit.bind`. Per-entry fields override the kind's
 * defaults (bind is delta-aware).
 *
 * The kind template is mocked through `Template.findByPath` (the
 * `stuff.test.ts` clone-harness idiom — no Mongo in unit tests).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CartesianZone from '../../../obj/location/CartesianZone';
import CartesianLocation from '../../location/CartesianLocation';
import Exit from '../Exit';
import { StuffApi } from '../../../api/stuff';
import { Template } from '../../stuff/Template';
import { LeafTemplate } from '../../stuff/LeafTemplate';
import { makeStuff } from '../../security/__tests__/test-setup';

const ARCHWAY = '/obj/exits/archway';
const STAIR = '/obj/exits/stair';

/**
 * Path-aware destination stub: `/test/loc-b` resolves to the live room;
 * every other path (the clone pipeline resolves its hydrator through
 * `singleton` too) falls through to the real implementation.
 */
function stubDestination(locB: unknown): () => void {
  const real = StuffApi.singleton.bind(StuffApi);
  const spy = vi
    .spyOn(StuffApi, 'singleton')
    .mockImplementation(((path: string) =>
      path === '/test/loc-b'
        ? Promise.resolve(locB)
        : real(path)) as typeof StuffApi.singleton);
  return () => spy.mockRestore();
}

function mockKindTemplates(): void {
  vi.spyOn(Template, 'findByPath').mockImplementation(
    async (path: string) => {
      if (path === ARCHWAY) {
        const t = new LeafTemplate();
        t.path = path;
        t.class = '/lib/boundary/Exit';
        t.hydratorClass = '/obj/persistence/PersistentHydrator';
        t.data = {
          media: ['ground'],
          messageOut: '{{ mover }} passes through the archway.',
          messageIn: '{{ mover }} steps in through the archway.',
        };
        return t;
      }
      if (path === '/obj/persistence/PersistentHydrator') {
        // The hydrator's own template (the real seed's base case: no
        // hydratorClass — terminates the clone recursion).
        const t = new LeafTemplate();
        t.path = path;
        t.class = '/obj/persistence/PersistentHydrator';
        t.data = {};
        return t;
      }
      if (path === STAIR) {
        const t = new LeafTemplate();
        t.path = path;
        t.class = '/lib/boundary/Exit';
        t.hydratorClass = '/obj/persistence/PersistentHydrator';
        t.data = {
          media: ['ground'],
          wheelPassable: false,
          messageOut: '{{ mover }} takes the stairs.',
        };
        return t;
      }
      return null;
    },
  );
}

describe('exit-kind templates', () => {
  let zone: CartesianZone;
  let locA: CartesianLocation;
  let locB: CartesianLocation;

  beforeEach(() => {
    StuffApi.clearAll();
    zone = makeStuff(() => new CartesianZone());
    locA = makeStuff(() => new CartesianLocation());
    locB = makeStuff(() => new CartesianLocation());
    zone.addLocation(locA, 0, 0, 0);
    zone.addLocation(locB, 0, 1, 0);
    mockKindTemplates();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a kind-cloned one-way exit hydrates the kind defaults and binds', async () => {
    const restore = stubDestination(locB);
    await locA.applyExits({
      north: { destination: '/test/loc-b', kind: ARCHWAY },
    });
    restore();

    const exit = locA.getExits().get('north')!;
    expect(exit).toBeDefined();
    expect(exit.getTemplatePath()).toBe(ARCHWAY);
    expect(exit.isBound()).toBe(true);
    expect(exit.getDirection()).toBe('north');
    expect(exit.getSource()).toBe(locA);
    // Kind defaults hydrated and preserved through bind.
    expect(exit.getMessageOut()).toBe(
      '{{ mover }} passes through the archway.',
    );
    expect(exit.getMedia()).toEqual(['ground']);
  });

  it('per-entry fields override the kind defaults (delta-aware bind)', async () => {
    const restore = stubDestination(locB);
    await locA.applyExits({
      up: {
        destination: '/test/loc-b',
        kind: STAIR,
        messageOut: '{{ mover }} clatters up the rickety steps.',
      },
    });
    restore();

    const exit = locA.getExits().get('up')!;
    // Site override wins…
    expect(exit.getMessageOut()).toBe(
      '{{ mover }} clatters up the rickety steps.',
    );
    // …while untouched kind defaults survive.
    expect(exit.isWheelPassable()).toBe(false);
  });

  it('a bidirectional kind entry clones one instance per edge', async () => {
    const restore = stubDestination(locB);
    await locA.applyExits({
      north: {
        destination: '/test/loc-b',
        kind: ARCHWAY,
        bidirectional: true,
      },
    });
    restore();

    const forward = locA.getExits().get('north')!;
    const back = locB.getExits().get('south')!;
    expect(forward.getTemplatePath()).toBe(ARCHWAY);
    expect(back.getTemplatePath()).toBe(ARCHWAY);
    expect(forward).not.toBe(back);
    expect(forward.getInverse()).toBe(back);
    expect(back.getMessageIn()).toBe(
      '{{ mover }} steps in through the archway.',
    );
  });

  it('a bound exit refuses re-binding (gate first, identity intact)', async () => {
    const restore = stubDestination(locB);
    await locA.applyExits({
      north: { destination: '/test/loc-b', kind: ARCHWAY },
    });
    restore();
    const exit = locA.getExits().get('north')!;
    // From outside a party room the participant gate denies before the
    // already-bound invariant is even consulted; either way identity
    // is untouched.
    expect(() =>
      exit.bind({ direction: 'west', source: locA, destination: locB }),
    ).toThrow(/denied|already bound/);
    expect(exit.getDirection()).toBe('north');
    expect(exit.getSource()).toBe(locA);
  });

  it('bind denies a caller that is not party to the edge', async () => {
    const orphan = await StuffApi.clone<Exit>(ARCHWAY);
    // Caller here is the test module (no Exitable frame on the stack)
    // — the participant gate (`FromMixin(Exitable)` + party `where`)
    // denies.
    expect(() =>
      orphan.bind({ direction: 'north', source: locA, destination: locB }),
    ).toThrow(/denied|SecurityError/i);
  });

  it('an unbound kind clone is cullable clutter (no room veto)', async () => {
    const orphan = await StuffApi.clone<Exit>(ARCHWAY);
    expect(orphan.isBound()).toBe(false);
    expect(
      orphan.canEvict({ idleMs: 9_000_000, reason: 'idle' }).ok,
    ).toBe(true);
  });
});
