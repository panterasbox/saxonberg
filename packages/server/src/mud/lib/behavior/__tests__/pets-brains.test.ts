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
  /** The rungs its species feeds by. Default: everything but the hopper. */
  styles?: string[];
  /** The places it remembers, oldest (nearest home) first. */
  trail?: string[];
  bond?: number;
  waiting?: boolean;
  home?: string;
  stamped?: boolean;
  refusal?: string | null;
  in?: FakeRoom;
  /** Would it eat off the ground with these people here? Default yes. */
  safe?: boolean;
  hungry?: boolean;
  /** Regard by person stuffId; unknown people are 0. */
  regard?: Record<string, number>;
}

function animal(o: AnimalOpts = {}) {
  const followed: Stuff[] = [];
  const ate: { food: Stuff; offerer: Stuff | null }[] = [];
  const credited: { place: string; day: number }[] = [];
  const remembered: string[] = [];
  let senescenceChecked = 0;
  let asking: Stuff | null = null;
  return {
    stuffId: 'beast',
    getContainer: () => (o.in ? R(o.in) : null),
    bondWith: () => o.bond ?? 0,
    isWaiting: () => o.waiting ?? false,
    getHome: () => o.home ?? '',
    isStamped: () => o.stamped ?? false,
    wouldEat: () => o.refusal ?? null,
    feedsBy: (style: string) =>
      (o.styles ?? ['bowl', 'ground', 'hand']).includes(style),
    eatFood: async (food: Stuff, offerer: Stuff | null) => {
      ate.push({ food, offerer });
      return true;
    },
    rememberFollowed: (p: Stuff) => followed.push(p),
    // ⭐ Memory, not navigation: the animal walks toward the earliest
    // place it still recognises. See `BondedMixin.rememberPlace`.
    getTrail: () => o.trail ?? [],
    rememberPlace: (p: string) => remembered.push(p),
    creditHomeCandidate: (place: string, day: number) =>
      credited.push({ place, day }),
    reconcileSenescence: () => {
      senescenceChecked += 1;
    },
    feelsSafeToEatAmong: () => o.safe ?? true,
    isHungry: () => o.hungry ?? false,
    regardFor: (p: Stuff) => o.regard?.[p.stuffId] ?? 0,
    askingOf: () => asking,
    setAskingOf: (p: Stuff | null) => {
      if (asking === p) return false;
      asking = p;
      return true;
    },
    // test probes
    _asking: () => asking,
    _followed: followed,
    _ate: ate,
    _credited: credited,
    _remembered: remembered,
    _senescence: () => senescenceChecked,
  } as unknown as Stuff & Record<string, never>;
}

/** The fake's probes, typed. */
type Probe = {
  _asking: () => Stuff | null;
  _ate: unknown[];
  _senescence: () => number;
};
const probe = (a: unknown): Probe => a as Probe;

/** Somebody standing in the room. */
function person(id: string): Stuff {
  return { stuffId: id, __person: true, isEdible: () => false } as unknown as Stuff;
}

/** A thing made of something an animal would eat. ⭐ It answers itself. */
function edibleThing(id: string): Stuff {
  return {
    stuffId: id,
    isEdible: () => true,
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
let told: { to: string; line: string }[] = [];
beforeEach(() => {
  sent = [];
  told = [];
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
  vi.spyOn(MixinApi, 'isHasInteractive').mockImplementation(
    ((s: Stuff) => !!(s as unknown as { __person?: boolean }).__person) as never,
  );
  vi.spyOn(MixinApi, 'isPersona').mockReturnValue(false as never);
  vi.spyOn(MixinApi, 'isBeliefStore').mockReturnValue(true as never);
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
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const chain = {
      topic: () => chain,
      toPeers: (b: unknown) => {
        sent.push(String(b));
        return chain;
      },
      toTarget: (t: Stuff, b: unknown) => {
        told.push({ to: t.stuffId, line: String(b) });
        return chain;
      },
      toSelf: () => chain,
      send: () => {},
    };
    return chain as never;
  });
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
      // ⭐ The vessel answers what is in it and what KIND it is; the
      // brain no longer rummages through its contents.
      getFeederKind: () => 'bowl',
      offerings: () => [food],
      // ⚠ Scanned for edibility too — it is a thing in the room like any
      // other, and nothing eats crockery.
      isEdible: () => false,
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

describe('feeds — ⭐⭐ the step-back rule is a mechanism', () => {
  it('⚠ does not eat off the ground with somebody it distrusts standing over it', async () => {
    vi.spyOn(MixinApi, 'isTangible').mockReturnValue(true);
    const here = room('lane', [edibleThing('scrap'), person('stranger')]);
    const a = animal({ in: here, stamped: true, safe: false });
    await feeds.act(ctx(a));
    expect(probe(a)._ate).toHaveLength(0);
  });

  it('eats once the room is one it feels safe in', async () => {
    vi.spyOn(MixinApi, 'isTangible').mockReturnValue(true);
    const here = room('lane', [edibleThing('scrap')]);
    const a = animal({ in: here, stamped: true, safe: true });
    await feeds.act(ctx(a));
    expect(probe(a)._ate).toHaveLength(1);
  });

  it('⚠ waiting on food is not begging — food it will not go to is left, nobody is asked', async () => {
    vi.spyOn(MixinApi, 'isTangible').mockReturnValue(true);
    const here = room('lane', [edibleThing('scrap'), person('stranger')]);
    const a = animal({ in: here, stamped: true, safe: false, hungry: true });
    await feeds.act(ctx(a));
    expect(probe(a)._asking()).toBeNull();
    expect(told).toHaveLength(0);
  });
});

describe('feeds — ⭐⭐ it asks', () => {
  it('hungry, nothing to eat, somebody here: it goes to them, and says so ONCE', async () => {
    const bob = person('bob');
    const here = room('lane', [bob]);
    const a = animal({ in: here, stamped: true, hungry: true });
    await feeds.act(ctx(a));
    expect(probe(a)._asking()).toBe(bob);
    expect(told).toEqual([
      { to: 'bob', line: expect.stringContaining('at your feet') },
    ]);
    await feeds.act(ctx(a));
    expect(told).toHaveLength(1); // the transition, not the cadence
  });

  it('⭐ begs from WHOEVER is present — a stranger, if that is who there is', async () => {
    const stranger = person('stranger');
    const here = room('lane', [stranger]);
    const a = animal({ in: here, stamped: true, hungry: true, regard: {} });
    await feeds.act(ctx(a));
    expect(probe(a)._asking()).toBe(stranger);
  });

  it('and the one it likes best, when there are several', async () => {
    const stranger = person('stranger');
    const friend = person('friend');
    const here = room('lane', [stranger, friend]);
    const a = animal({
      in: here,
      stamped: true,
      hungry: true,
      regard: { friend: 30 },
    });
    await feeds.act(ctx(a));
    expect(probe(a)._asking()).toBe(friend);
  });

  it('stops asking when it is not hungry, or nobody is here, or it eats', async () => {
    vi.spyOn(MixinApi, 'isTangible').mockReturnValue(true);
    const bob = person('bob');
    const here = room('lane', [bob]);
    const a = animal({ in: here, stamped: true, hungry: true });
    await feeds.act(ctx(a));
    expect(probe(a)._asking()).toBe(bob);
    here.contents.push(edibleThing('scrap'));
    await feeds.act(ctx(a));
    expect(probe(a)._ate).toHaveLength(1);
    expect(probe(a)._asking()).toBeNull();
  });

  it('⚠⚠ an UNSTAMPED animal never asks — asking reads hunger, and the guard comes first', async () => {
    const bob = person('bob');
    const here = room('lane', [bob]);
    const a = animal({ in: here, stamped: false, hungry: true });
    await feeds.act(ctx(a));
    expect(probe(a)._asking()).toBeNull();
    expect(probe(a)._senescence()).toBe(0);
  });
});

describe('homes — it knows the way, it does not solve a graph', () => {
  it('⭐ steps toward home when home is next door', async () => {
    const here = room('here');
    const home = room('home');
    link(here, home);
    await homes.act(ctx(animal({ home: 'home', in: here })));
    expect(LocomotionApi.traverseWithDefault).toHaveBeenCalledTimes(1);
  });

  it('⭐⭐ steps toward the earliest place it REMEMBERS', async () => {
    // Home is three rooms off and not adjacent. It heads for the oldest
    // thing it recognises, which is the one nearest home — so it never
    // walks away from home, and takes any shortcut it knows.
    const here = room('here');
    const known = room('known');
    link(here, known);
    await homes.act(
      ctx(animal({ home: 'home', trail: ['known', 'other'], in: here })),
    );
    expect(LocomotionApi.traverseWithDefault).toHaveBeenCalledTimes(1);
  });

  it('⚠⚠ carried somewhere it has never been, it is LOST', async () => {
    // The property a graph search destroyed: a cat set down among
    // streets it does not know has no way back, and nothing announces
    // it. No flag, no timer. Somebody has to notice.
    const strange = room('strange');
    link(strange, room('also-strange'));
    await homes.act(
      ctx(animal({ home: 'home', trail: ['known'], in: strange })),
    );
    expect(LocomotionApi.traverseWithDefault).not.toHaveBeenCalled();
  });

  it('⭐ a closed door across its route leaves it where it is', async () => {
    const here = room('here');
    const home = room('home');
    link(here, home, false);
    await homes.act(ctx(animal({ home: 'home', in: here })));
    expect(LocomotionApi.traverseWithDefault).not.toHaveBeenCalled();
  });

  it('notes where it is BEFORE any early return', async () => {
    // A room it was merely carried through has to be recorded, or an
    // animal set down would have no way back at all.
    const a = animal({ home: 'home', waiting: true, in: room('carried-to') });
    await homes.act(ctx(a));
    expect((a as never as { _remembered: string[] })._remembered).toContain(
      'carried-to',
    );
  });

  it('⚠ does not set off while its person is standing here', async () => {
    const here = room('here');
    const home = room('home');
    link(here, home);
    here.contents.push({ stuffId: 'me' } as unknown as Stuff);
    await homes.act(ctx(animal({ home: 'home', bond: 0.9, in: here })));
    expect(LocomotionApi.traverseWithDefault).not.toHaveBeenCalled();
  });

  it('does nothing when it is already home', async () => {
    await homes.act(ctx(animal({ home: 'home', in: room('home') })));
    expect(LocomotionApi.traverseWithDefault).not.toHaveBeenCalled();
  });

  it('`waiting` holds it', async () => {
    const here = room('here');
    link(here, room('home'));
    await homes.act(
      ctx(animal({ home: 'home', waiting: true, in: here })),
    );
    expect(LocomotionApi.traverseWithDefault).not.toHaveBeenCalled();
  });
});

describe('feeding style — an animal eats the ways its species does', () => {
  it('⭐⭐ a hopper-only bird ignores a bowl', async () => {
    const seed = edibleThing('seed');
    const bowl = {
      stuffId: 'bowl',
      getFeederKind: () => 'bowl',
      offerings: () => [seed],
      isEdible: () => false,
      getMaterial: () => null,
    } as unknown as Stuff;
    vi.spyOn(MixinApi, 'isFeeder').mockImplementation(
      (s: Stuff) => (s as unknown as { stuffId: string }).stuffId === 'bowl',
    );
    const bird = animal({ styles: ['hopper'], in: room('cage', [bowl]) });

    await feeds.act(ctx(bird));
    // Not its kind of vessel. A canary at a horse trough is not a fed
    // canary, and before the style axis every vessel fed every animal.
    expect((bird as never as { _ate: unknown[] })._ate).toHaveLength(0);
  });

  it('and eats from its own hopper', async () => {
    const seed = edibleThing('seed');
    const hopper = {
      stuffId: 'hopper',
      getFeederKind: () => 'hopper',
      offerings: () => [seed],
      isEdible: () => false,
      getMaterial: () => null,
    } as unknown as Stuff;
    vi.spyOn(MixinApi, 'isFeeder').mockImplementation(
      (s: Stuff) => (s as unknown as { stuffId: string }).stuffId === 'hopper',
    );
    const bird = animal({ styles: ['hopper'], in: room('cage', [hopper]) });

    await feeds.act(ctx(bird));
    expect((bird as never as { _ate: unknown[] })._ate).toHaveLength(1);
  });

  it('⚠ a bird does not come down for a scrap on the floor', async () => {
    vi.spyOn(MixinApi, 'isTangible').mockReturnValue(true);
    const bird = animal({
      styles: ['hopper'],
      in: room('cage', [edibleThing('scrap')]),
    });
    await feeds.act(ctx(bird));
    expect((bird as never as { _ate: unknown[] })._ate).toHaveLength(0);
  });
});
