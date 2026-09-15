/**
 * The three kept-animal brains — **the decisions, stubbed** (the
 * `enforces` shape: the world reads are faked so each brain's OWN
 * choices are what is under test).
 *
 * Three properties are worth more than the rest put together:
 *
 *  1. ⚠⚠ `feeds` must **return before reading metabolism** when there is
 *     nothing to eat and nobody owns the animal. A metabolism read
 *     RECONCILES, and for a stamped animal it integrates the whole
 *     absence — so the beat itself would starve the unnamed cat on the
 *     lane in an afternoon of uptime.
 *  2. ⚠⚠ `follows` must emit a line naming the ACT and never the cause.
 *     An animal that says *why* it balked is a trap detector; one that
 *     just balks is an animal.
 *  3. ⭐ `homes` finding no path is the **entire implementation of
 *     "lost"** — no flag, no timer, no announcement.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { brain as follows } from '../follows';
import { brain as feeds } from '../feeds';
import { brain as homes } from '../homes';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { LocomotionApi } from '../../../api/locomotion';
import { PersistableApi } from '../../../api/persistable';
import type { Stuff } from '../../stuff/Stuff';
import type { BrainContext } from '../brain';

/* ─────────────────────────── the fakes ─────────────────────────── */

interface FakeRoom {
  id: string;
  contents: Stuff[];
  exits: { dest: FakeRoom; passable: boolean }[];
}

const room = (id: string, contents: Stuff[] = []): FakeRoom => ({
  id,
  contents,
  exits: [],
});

function link(a: FakeRoom, b: FakeRoom, passable = true): void {
  a.exits.push({ dest: b, passable });
  b.exits.push({ dest: a, passable });
}

function asStuff(r: FakeRoom): Stuff {
  return {
    stuffId: r.id,
    getContents: () => r.contents,
    getExits: () => ({
      values: () =>
        r.exits.map((e) => ({
          getDestination: () => R(e.dest),
          canTraverse: () => ({ ok: e.passable }),
        })),
    }),
    __room: r,
  } as unknown as Stuff;
}

// Rooms must be reference-stable for BFS `seen` and destination compares.
const cache = new Map<FakeRoom, Stuff>();
function R(r: FakeRoom): Stuff {
  if (!cache.has(r)) cache.set(r, asStuff(r));
  return cache.get(r)!;
}

interface AnimalOpts {
  bond?: number;
  waiting?: boolean;
  home?: string;
  stamped?: boolean;
  refusal?: string | null;
  in?: FakeRoom;
}

function animal(o: AnimalOpts = {}) {
  const followed: Stuff[] = [];
  const ate: { food: Stuff; offerer: Stuff | null }[] = [];
  const credited: { place: string; day: number }[] = [];
  let senescenceChecked = 0;
  return {
    stuffId: 'beast',
    getContainer: () => (o.in ? R(o.in) : null),
    bondWith: () => o.bond ?? 0,
    isWaiting: () => o.waiting ?? false,
    getHome: () => o.home ?? '',
    isStamped: () => o.stamped ?? false,
    wouldEat: () => o.refusal ?? null,
    eatFood: async (food: Stuff, offerer: Stuff | null) => {
      ate.push({ food, offerer });
      return true;
    },
    rememberFollowed: (p: Stuff) => followed.push(p),
    creditHomeCandidate: (place: string, day: number) =>
      credited.push({ place, day }),
    reconcileSenescence: () => {
      senescenceChecked += 1;
    },
    // test probes
    _followed: followed,
    _ate: ate,
    _credited: credited,
    _senescence: () => senescenceChecked,
  } as unknown as Stuff & Record<string, never>;
}

/** A thing made of something an animal would eat. */
function edibleThing(id: string): Stuff {
  return {
    stuffId: id,
    getMaterial: () => ({ getEdibility: () => true }),
  } as unknown as Stuff;
}

function ctx(host: Stuff, subject?: Stuff, config = {}): BrainContext {
  return {
    host,
    config,
    state: {},
    ...(subject ? { perceived: { frame: {} as never, subject } } : {}),
    trigger: { source: 'cadence', raw: 'cadence:60s' },
  } as unknown as BrainContext;
}

let sent: string[] = [];
beforeEach(() => {
  sent = [];
  cache.clear();
  for (const p of [
    'isBonded',
    'isMobile',
    'isContainable',
    'isExitable',
    'isContainer',
    'isOrganism',
    'isChattel',
  ] as const) {
    vi.spyOn(MixinApi, p).mockReturnValue(true as never);
  }
  vi.spyOn(MixinApi, 'isHazard').mockReturnValue(false);
  vi.spyOn(MixinApi, 'isFeeder').mockReturnValue(false);
  vi.spyOn(MixinApi, 'isTangible').mockReturnValue(false);
  vi.spyOn(LocomotionApi, 'traverseWithDefault').mockResolvedValue(
    undefined as never,
  );
  vi.spyOn(PersistableApi, 'placeIdOf').mockImplementation(
    (s: Stuff) => (s as unknown as { stuffId: string }).stuffId,
  );
  // ⭐ Render to the literal text only. What these tests assert about a
  // line is its FIXED WORDS — an animal's own name is not the part that
  // could leak a cause.
  vi.spyOn(Mml, 'compose').mockImplementation(
    ((strings: TemplateStringsArray) => strings.raw.join(' ')) as never,
  );
  vi.spyOn(MessageApi, 'scene').mockImplementation(
    () =>
      ({
        topic: () => ({
          toPeers: (b: unknown) => {
            sent.push(String(b));
            return { send: () => {} };
          },
          toSelf: () => ({ send: () => {} }),
          send: () => {},
        }),
      }) as never,
  );
});
afterEach(() => vi.restoreAllMocks());

/* ───────────────────────────── follows ───────────────────────────── */

describe('follows', () => {
  it('goes after a bonded person', async () => {
    const here = room('here');
    const there = room('there');
    link(here, there);
    const me = { stuffId: 'me', getContainer: () => R(there) } as unknown as Stuff;
    const a = animal({ bond: 0.9, in: here });

    await follows.act(ctx(a, me));
    expect(LocomotionApi.traverseWithDefault).toHaveBeenCalled();
    expect((a as never as { _followed: Stuff[] })._followed).toHaveLength(1);
  });

  it('does not go after a stranger', async () => {
    const here = room('here');
    const there = room('there');
    link(here, there);
    const you = { stuffId: 'you', getContainer: () => R(there) } as unknown as Stuff;
    await follows.act(ctx(animal({ bond: 0.1, in: here }), you));
    expect(LocomotionApi.traverseWithDefault).not.toHaveBeenCalled();
  });

  it('⚠ `waiting` holds it where it was told to stay', async () => {
    const here = room('here');
    const there = room('there');
    link(here, there);
    const me = { stuffId: 'me', getContainer: () => R(there) } as unknown as Stuff;
    await follows.act(ctx(animal({ bond: 0.9, waiting: true, in: here }), me));
    expect(LocomotionApi.traverseWithDefault).not.toHaveBeenCalled();
  });

  it('⚠⚠ balks at an armed hazard, and the line names no cause', async () => {
    const trap = { stuffId: 'trap', isArmed: () => true } as unknown as Stuff;
    const here = room('here');
    const there = room('there', [trap]);
    link(here, there);
    vi.spyOn(MixinApi, 'isHazard').mockImplementation(
      (s: Stuff) => (s as unknown as { stuffId: string }).stuffId === 'trap',
    );
    const me = { stuffId: 'me', getContainer: () => R(there) } as unknown as Stuff;

    await follows.act(ctx(animal({ bond: 0.9, in: here }), me));
    expect(LocomotionApi.traverseWithDefault).not.toHaveBeenCalled();
    expect(sent).toHaveLength(1);
    // ⭐⭐ The whole value of an animal as an instrument.
    for (const word of ['danger', 'trap', 'poison', 'bad air', 'sick', 'afraid']) {
      expect(sent[0]!.toLowerCase()).not.toContain(word);
    }
  });
});

/* ────────────────────────────── feeds ────────────────────────────── */

describe('feeds', () => {
  it('⚠⚠ an UNSTAMPED animal with nothing to eat never touches metabolism', async () => {
    // THE guard. `reconcileSenescence` stands in for "read the body" —
    // if the beat reaches it, it reached the clock.
    const a = animal({ stamped: false, in: room('lane') });
    await feeds.act(ctx(a));
    expect((a as never as { _senescence: () => number })._senescence()).toBe(0);
  });

  it('a STAMPED animal with nothing to eat does reconcile', async () => {
    // Somebody owns it, so its clock runs whether or not you are here —
    // which is what taking responsibility for an animal means.
    const a = animal({ stamped: true, in: room('lane') });
    await feeds.act(ctx(a));
    expect((a as never as { _senescence: () => number })._senescence()).toBe(1);
  });

  it('refuses with ONE sentence whatever the reason', async () => {
    const lines = new Set<string>();
    for (const reason of ['not-hungry', 'turned', 'sensed-bad']) {
      sent = [];
      const food = edibleThing('food');
      vi.spyOn(MixinApi, 'isTangible').mockReturnValue(true);
      const here = room('lane', [food]);
      await feeds.act(ctx(animal({ refusal: reason, in: here })));
      if (sent[0]) lines.add(sent[0]);
    }
    // ⭐ The animal never tells you which. One line, three reasons.
    expect(lines.size).toBeLessThanOrEqual(1);
  });

  it('⭐ a meal from a BOWL credits nobody and advances home', async () => {
    const food = edibleThing('scrap');
    const bowl = {
      stuffId: 'bowl',
      getContents: () => [food],
      // ⚠ The bowl is scanned for edibility too — it is a thing in the
      // room like any other, and nothing eats crockery.
      getMaterial: () => null,
    } as unknown as Stuff;
    vi.spyOn(MixinApi, 'isFeeder').mockImplementation(
      (s: Stuff) => (s as unknown as { stuffId: string }).stuffId === 'bowl',
    );
    vi.spyOn(MixinApi, 'isTangible').mockReturnValue(true);
    const a = animal({ in: room('kitchen', [bowl]) });

    await feeds.act(ctx(a));
    const ate = (a as never as { _ate: { offerer: unknown }[] })._ate;
    expect(ate).toHaveLength(1);
    expect(ate[0]!.offerer).toBeNull(); // credits NOBODY
    expect((a as never as { _credited: unknown[] })._credited).toHaveLength(1);
  });

  it('⚠ food on the FLOOR feeds it but does not move home', async () => {
    // You move an animal's home by keeping it, not by dropping food.
    const scrap = edibleThing('scrap');
    vi.spyOn(MixinApi, 'isTangible').mockReturnValue(true);
    const a = animal({ in: room('alley', [scrap]) });
    await feeds.act(ctx(a));
    expect((a as never as { _ate: unknown[] })._ate).toHaveLength(1);
    expect((a as never as { _credited: unknown[] })._credited).toHaveLength(0);
  });
});

/* ────────────────────────────── homes ────────────────────────────── */

describe('homes', () => {
  it('takes ONE step along an open path', async () => {
    const a1 = room('a');
    const b = room('b');
    const c = room('home');
    link(a1, b);
    link(b, c);
    await homes.act(ctx(animal({ home: 'home', in: a1 })));
    expect(LocomotionApi.traverseWithDefault).toHaveBeenCalledTimes(1);
  });

  it('⭐ no open path = it stays. That is the whole of "lost".', async () => {
    const a1 = room('a');
    const b = room('b');
    const c = room('home');
    link(a1, b, false); // a closed door
    link(b, c);
    await homes.act(ctx(animal({ home: 'home', in: a1 })));
    expect(LocomotionApi.traverseWithDefault).not.toHaveBeenCalled();
  });

  it('⚠ does not set off while its person is standing here', async () => {
    const here = room('a');
    const c = room('home');
    link(here, c);
    here.contents.push({ stuffId: 'me' } as unknown as Stuff);
    await homes.act(ctx(animal({ home: 'home', bond: 0.9, in: here })));
    expect(LocomotionApi.traverseWithDefault).not.toHaveBeenCalled();
  });

  it('does nothing when it is already home', async () => {
    const h = room('home');
    await homes.act(ctx(animal({ home: 'home', in: h })));
    expect(LocomotionApi.traverseWithDefault).not.toHaveBeenCalled();
  });

  it('`waiting` holds it', async () => {
    const a1 = room('a');
    const c = room('home');
    link(a1, c);
    await homes.act(ctx(animal({ home: 'home', waiting: true, in: a1 })));
    expect(LocomotionApi.traverseWithDefault).not.toHaveBeenCalled();
  });
});
