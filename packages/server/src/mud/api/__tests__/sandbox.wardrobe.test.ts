/**
 * Wave 4 — the wardrobe door, the traversal hook, and the seeding
 * aperture: place→link→enter→exit through the REAL movement path
 * (`Mobile.traverse` consulting `Exit.applyTraversal`), two doors to
 * one circle, destroy-with-occupants, and `seedCopy` (ownership +
 * in-circle gates + the instance-state copy).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SandboxApi } from '../sandbox';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { EventApi } from '../event';
import { ConnectionApi } from '../connection';
import { ContainmentApi } from '../containment';
import { Stuff } from '../../lib/stuff/Stuff';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../execution-context';
import {
  PersistenceManager,
} from '../../../backend/PersistenceManager';
import EventRegistry from '../../obj/EventRegistry';
import Interactive from '../../obj/Interactive';
import Avatar from '../../obj/Avatar';
import CartesianLocation from '../../lib/location/CartesianLocation';
import Wardrobe from '../../lib/sandbox/Wardrobe';
import SandboxCrossingExit from '../../lib/sandbox/SandboxCrossingExit';
import type { Containable } from '../../lib/spatial/Containable';
import type { Container } from '../../lib/spatial/Container';
import type { Mobile } from '../../lib/spatial/Mobile';

const PLAYER = 'wardrobe-tester';
const SCOPE = `/home/${PLAYER}`;

function asSystem<T>(fn: () => T): T {
  return ExecutionContextApi.runRoot(null, 'test.system', fn, {
    circleScope: OMNI_SCOPE,
  });
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

let sockSeq = 100;
async function makeRig(): Promise<{
  avatar: Avatar;
  interactive: Interactive;
  room: CartesianLocation;
}> {
  const room = await StuffApi.create(() => new CartesianLocation());
  const avatar = await StuffApi.create(() => new Avatar(), {
    playerId: PLAYER,
  });
  Stuff._stampTemplatePath(avatar, Avatar.getTemplatePath(PLAYER));
  ContainmentApi.move(
    avatar as unknown as Stuff & Containable,
    room as unknown as Stuff & Container
  );
  const interactive = await StuffApi.create(
    () =>
      new Interactive(`sock-w${++sockSeq}`, `sess-w${sockSeq}`, {
        _id: 'u1',
      } as never)
  );
  ConnectionApi.transfer(interactive, avatar);
  return { avatar, interactive, room };
}

async function placeWardrobe(room: CartesianLocation): Promise<Wardrobe> {
  const wardrobe = await StuffApi.create(() => new Wardrobe());
  ContainmentApi.move(
    wardrobe as unknown as Stuff & Containable,
    room as unknown as Stuff & Container
  );
  return wardrobe;
}

function wardrobeExitOf(room: CartesianLocation): SandboxCrossingExit {
  const exit = (room as unknown as { getExit(d: string): unknown }).getExit(
    'wardrobe'
  );
  expect(exit).toBeInstanceOf(SandboxCrossingExit);
  return exit as SandboxCrossingExit;
}

describe('the wardrobe door (Wave 4)', () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    ExecutionContextApi._clearForTesting();
    await bootRegistry();
  });

  afterEach(async () => {
    if (SandboxApi.sessionForScope(SCOPE)) {
      await SandboxApi.closeSession(SCOPE);
    }
    ExecutionContextApi._clearForTesting();
    vi.restoreAllMocks();
  });

  it('placing a wardrobe installs the passage; moving relocates it', async () => {
    const { room } = await makeRig();
    const other = await StuffApi.create(() => new CartesianLocation());
    const wardrobe = await placeWardrobe(room);
    expect(wardrobeExitOf(room)).toBeTruthy();

    ContainmentApi.move(
      wardrobe as unknown as Stuff & Containable,
      other as unknown as Stuff & Container
    );
    expect(
      (room as unknown as { getExit(d: string): unknown }).getExit('wardrobe')
    ).toBeFalsy();
    expect(wardrobeExitOf(other)).toBeTruthy();
  });

  it('walking the wardrobe crosses; walking out returns — the full loop', async () => {
    const { avatar, interactive, room } = await makeRig();
    const wardrobe = await placeWardrobe(room);
    const passage = wardrobeExitOf(room);

    // ENTER through the real movement path: nothing material traverses.
    await (avatar as unknown as Mobile).traverse(passage, 'walk');

    // This fixture is UNOWNED (nothing stamped it), so it is a public
    // booth: it takes no link at all and opens onto whoever walked in.
    // A commons wardrobe that linked itself to its first user would
    // silently become that user's private door — and the wire alcove's
    // whole point is that the next person gets their own circle.
    expect(wardrobe.getLinkedSandboxPath()).toBe('');
    expect(SandboxApi.liveSessionForPlayer(PLAYER)?.scope).toBe(SCOPE);
    // the field body never moved — parked in place, link crossed
    expect(avatar.getContainer()).toBe(room);
    expect(avatar.isParked()).toBe(true);
    const wireBody = SandboxApi.activeBodyFor(PLAYER)!;
    expect(interactive.getHolder()).toBe(wireBody);

    // EXIT through the in-circle 'out' passage, same movement path.
    await asSystem(async () => {
      const entry = SandboxApi.entryRoomForScope(SCOPE)!;
      const out = (entry as unknown as { getExit(d: string): unknown }).getExit(
        'out'
      ) as SandboxCrossingExit;
      expect(out).toBeInstanceOf(SandboxCrossingExit);
      await (wireBody as unknown as Mobile).traverse(out, 'walk');
    });

    expect(interactive.getHolder()).toBe(avatar);
    expect(avatar.isParked()).toBe(false);
    expect(SandboxApi.sessionForScope(SCOPE)).toBeNull();
  });

  it('two doors, one circle: sessions key on scope', async () => {
    const { avatar, room } = await makeRig();
    const w1 = await placeWardrobe(room);
    const other = await StuffApi.create(() => new CartesianLocation());
    const w2 = await placeWardrobe(other);
    w1.setLinkedSandboxPath(SCOPE);
    w2.setLinkedSandboxPath(SCOPE);

    await (avatar as unknown as Mobile).traverse(wardrobeExitOf(room), 'walk');
    const session = SandboxApi.sessionForScope(SCOPE);
    expect(session).not.toBeNull();
    // the second door names the same live session
    expect(w2.getLinkedSandboxPath()).toBe(session!.scope);
  });

  it('destroying an occupied LINKED wardrobe reaps safely (the non-event eviction)', async () => {
    const { avatar, interactive, room } = await makeRig();
    const wardrobe = await placeWardrobe(room);
    // A linked door — the case where the fixture really is the mouth of
    // one named circle, so tearing it out has to evict cleanly.
    wardrobe.setLinkedSandboxPath(SCOPE);
    await (avatar as unknown as Mobile).traverse(
      wardrobeExitOf(room),
      'walk'
    );
    expect(SandboxApi.activeBodyFor(PLAYER)).not.toBeNull();

    StuffApi.destruct(wardrobe as unknown as Stuff);
    // closeSession is fire-and-forget from onDestruct — let it settle
    await new Promise((r) => setTimeout(r, 50));

    expect(SandboxApi.sessionForScope(SCOPE)).toBeNull();
    expect(interactive.getHolder()).toBe(avatar);
    expect(avatar.isParked()).toBe(false);
  });

  it('destroying an occupied PUBLIC booth strands nobody', async () => {
    const { avatar, interactive, room } = await makeRig();
    // Unowned + unlinked: the booth is a doorway, not the circle. It
    // names no scope, so it has no session to close — and the way out
    // is the circle's OWN `out` passage, which the booth never owned.
    // Destroying it must therefore be a true non-event, not an eviction.
    const wardrobe = await placeWardrobe(room);
    await (avatar as unknown as Mobile).traverse(wardrobeExitOf(room), 'walk');
    const wireBody = SandboxApi.activeBodyFor(PLAYER)!;

    StuffApi.destruct(wardrobe as unknown as Stuff);
    await new Promise((r) => setTimeout(r, 50));

    // Still inside, still holding the link.
    expect(SandboxApi.sessionForScope(SCOPE)).not.toBeNull();
    expect(interactive.getHolder()).toBe(wireBody);

    // And the way out still works.
    await asSystem(async () => {
      const entry = SandboxApi.entryRoomForScope(SCOPE)!;
      const out = (entry as unknown as { getExit(d: string): unknown }).getExit(
        'out'
      ) as SandboxCrossingExit;
      await (wireBody as unknown as Mobile).traverse(out, 'walk');
    });
    expect(interactive.getHolder()).toBe(avatar);
    expect(avatar.isParked()).toBe(false);
  });

  it('a guest cannot cross (door gate)', async () => {
    const { room } = await makeRig();
    await placeWardrobe(room);
    const guest = await StuffApi.create(() => new Avatar(), {
      isGuest: true,
    });
    ContainmentApi.move(
      guest as unknown as Stuff & Containable,
      room as unknown as Stuff & Container
    );
    const guard = wardrobeExitOf(room).canTraverse(
      guest as unknown as Stuff & Containable,
      'walk'
    );
    expect(guard.ok).toBe(false);
  });
});

describe('the seeding aperture (Wave 4)', () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    ExecutionContextApi._clearForTesting();
    await bootRegistry();
  });

  afterEach(async () => {
    if (SandboxApi.sessionForScope(SCOPE)) {
      await SandboxApi.closeSession(SCOPE);
    }
    ExecutionContextApi._clearForTesting();
    vi.restoreAllMocks();
  });

  it('refuses outside a circle, refuses the unowned, copies the owned', async () => {
    const { avatar, room } = await makeRig();

    // Fake template store so StuffApi.clone can mint the copy.
    const pm = PersistenceManager.get();
    vi.spyOn(pm, 'isConnected').mockReturnValue(true);
    const templateRows = [
      {
        _id: { toString: () => 't1' },
        path: '/obj/sandbox-test/trinket',
        class: '/lib/stuff/Thing',
        data: {},
      },
    ];
    vi.spyOn(pm, 'getCollection').mockImplementation(() => {
      return {
        find: (query: Record<string, unknown>) => {
          const rows = templateRows.filter(
            (r) => query.path === undefined || r.path === query.path
          );
          const cursor = {
            sort: () => cursor,
            limit: () => cursor,
            toArray: async () => rows,
          };
          return cursor;
        },
        findOne: async () => null,
        insertOne: async () => ({ insertedId: { toString: () => 'x' } }),
        deleteMany: async () => ({ deletedCount: 0 }),
      } as unknown as ReturnType<PersistenceManager['getCollection']>;
    });

    // A trinket the avatar CARRIES (own-body ownership), with instance
    // state worth copying.
    const { default: Thing } = await import('../../lib/stuff/Thing');
    const trinket = await StuffApi.create(() => new Thing());
    Stuff._stampTemplatePath(trinket, '/obj/sandbox-test/trinket');
    ContainmentApi.move(
      trinket as unknown as Stuff & Containable,
      avatar as unknown as Stuff & Container
    );

    // Outside a circle: refused.
    await expect(
      SandboxApi.seedCopy(avatar, trinket as unknown as Stuff)
    ).rejects.toThrow(/inside a circle/);

    // Cross in; seed the carried trinket.
    await SandboxApi.enter(avatar);
    const wireBody = SandboxApi.activeBodyFor(PLAYER)!;

    const copy = (await ExecutionContextApi.runRootGuarded(
      null,
      'in-circle',
      () => SandboxApi.seedCopy(wireBody, trinket as unknown as Stuff),
      'rethrow',
      { circleScope: SCOPE }
    ))!;

    // the copy is circle-born with the same template identity…
    expect(copy.getCircleScope()).toBe(SCOPE);
    expect(copy.getTemplatePath()).toBe('/obj/sandbox-test/trinket');
    expect(copy.stuffId).not.toBe(trinket.stuffId);
    // …and the original never moved or changed hands
    expect(
      asSystem(() =>
        (trinket as unknown as Stuff & Containable).getContainer()
      )!.stuffId
    ).toBe(avatar.stuffId);

    // Unowned: someone else's item refuses.
    const strangersItem = await StuffApi.create(() => new Thing());
    Stuff._stampTemplatePath(strangersItem, '/obj/sandbox-test/trinket');
    await expect(
      ExecutionContextApi.runRootGuarded(
        null,
        'in-circle',
        () =>
          SandboxApi.seedCopy(wireBody, strangersItem as unknown as Stuff),
        'rethrow',
        { circleScope: SCOPE }
      )
    ).rejects.toThrow(/you own/);
  });
});
