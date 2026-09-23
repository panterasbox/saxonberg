/**
 * FishingEngagement (fishing D5) — the wait, the bite, the landing, with
 * the water pack's register STUBBED at its shape.
 *
 * The claims: no bite prints nothing; pressure crosses deterministically;
 * the species draw is stable for a seed; a small fish lands into the
 * hand and the record is drawn; a fighter opens a contest; an NPC actor
 * releases at once; a bare hook takes, slowly.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import { EngagedMixin } from '@saxonberg/server/mud/lib/activity/Engaged';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { TestActor } from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import { FishingEngagement } from '../lib/FishingEngagement';
import type { FisheryRegistry, FisheryStanding, SpeciesStanding } from '../lib/FisheryRead';
import Fish from '../agent/Fish';
import Rod from '../thing/Rod';
import Bait from '../thing/Bait';

class Angler extends TestActor {}
/** An NPC: engaged, holds things, no persona. */
class Fisher extends EngagedMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))) {
  static _mixinName = 'Fisher';
}

function species(over: Partial<SpeciesStanding>): SpeciesStanding {
  return {
    speciesPath: '/stuff/idea/species/grey-mullet',
    name: 'grey mullet',
    capacity: 100,
    full: 100,
    level: 100,
    fit: 1,
    limiting: null,
    stocked: false,
    role: 'forage',
    fightRating: 0.4,
    ...over,
  };
}

const WATER = {
  temperatureK: 290, currentMps: 0.2, salinityPpt: 15, oxygenMgL: 9, pH: 7.7,
  hardnessDgh: 11, nitrateMgL: 3, ammoniaMgL: 0, nitriteMgL: 0, contamination: 0,
};

/** A register at its shape: a standing, and a drawn/released ledger. */
function registry(standing: FisheryStanding | null): FisheryRegistry & { drawn: string[]; released: string[] } {
  const drawn: string[] = [];
  const released: string[] = [];
  return {
    drawn,
    released,
    standingAt: async () => standing,
    readFor: () => [],
    draw: async (_r, sp, n) => {
      drawn.push(sp);
      return n;
    },
    release: async (_r, sp) => {
      released.push(sp);
    },
  };
}

let sent: string[] = [];
let room: Location;
let rod: Rod;

function engagement(actor: Stuff, reg: FisheryRegistry, bait: Stuff | null = null, twilight = 1): FishingEngagement {
  const e = new FishingEngagement({
    actor: actor as never,
    rod,
    bait,
    reachRef: 'kestrel:confluence',
    room,
    registry: reg,
    feedFactors: async () => ({ twilight, weather: 1 }),
  });
  e.engagementId = 'wait-1';
  return e;
}

/** One game minute: fire the emission and let the async tick settle. */
async function minute(e: FishingEngagement): Promise<void> {
  e.emissions[0]!.event({ engagement: e, actor: e.actor, elapsed: 0 });
  for (let i = 0; i < 12; i++) await new Promise<void>((r) => setTimeout(r, 0));
}

beforeEach(() => {
  StuffApi.clearAll();
  makeStuff(() => new WorldClockRegistry());
  WorldClockApi._resetForTesting();
  sent = [];
  room = makeStuff(() => new Location());
  rod = makeStuff(() => new Rod());
  vi.spyOn(Mml, 'compose').mockImplementation(((strings: TemplateStringsArray, ...vals: unknown[]) =>
    strings.raw.map((s, i) => s + (i < vals.length ? String(vals[i]) : '')).join('')) as never);
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const chain = {
      topic: () => chain,
      toSelf: (b: unknown) => {
        sent.push(String(b));
        return chain;
      },
      toPeers: () => chain,
      toTarget: () => chain,
      send: () => {},
    };
    return chain as never;
  });
  vi.spyOn(StuffApi, 'clone').mockImplementation((async () => makeStuff(() => new Fish())) as never);
  vi.spyOn(StuffApi, 'singleton').mockImplementation((async () => ({ getStature: () => 0.4 })) as never);
  vi.spyOn(SchedulerApi, 'complete').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('the wait', () => {
  it('⭐ a minute with no bite prints NOTHING — every refusal is silence', async () => {
    const e = engagement(makeStuff(() => new Angler()), registry({ reachRef: 'kestrel:confluence', species: [species({})], water: WATER, contamination: null }));
    await minute(e);
    expect(sent).toEqual([]);
  });

  it('an empty water never bites, however long you wait', async () => {
    const e = engagement(makeStuff(() => new Angler()), registry({ reachRef: 'kestrel:confluence', species: [species({ level: 0 })], water: WATER, contamination: null }), makeStuff(() => new Bait()));
    for (let i = 0; i < 40; i++) await minute(e);
    expect(sent).toEqual([]);
  });

  it('⭐ pressure crosses deterministically: a full reach with matched bait bites in about eight minutes; a bare hook in about an hour', async () => {
    const reg = registry({ reachRef: 'kestrel:confluence', species: [species({ fightRating: 0.1 })], water: WATER, contamination: null });
    const baited = engagement(makeStuff(() => new Angler()), reg, makeStuff(() => new Bait()));
    let minutes = 0;
    while (sent.length === 0 && minutes < 30) {
      await minute(baited);
      minutes += 1;
    }
    expect(minutes).toBeGreaterThanOrEqual(6);
    expect(minutes).toBeLessThanOrEqual(12);
    sent = [];
    const bare = engagement(makeStuff(() => new Angler()), reg, null);
    minutes = 0;
    while (sent.length === 0 && minutes < 200) {
      await minute(bare);
      minutes += 1;
    }
    expect(minutes).toBeGreaterThanOrEqual(40);
    expect(minutes).toBeLessThanOrEqual(80);
  });

  it('crumbs on a hook take nothing', async () => {
    const crumbs = makeStuff(() => new Bait());
    crumbs.setBaitKind('crumbs');
    const e = engagement(makeStuff(() => new Angler()), registry({ reachRef: 'kestrel:confluence', species: [species({})], water: WATER, contamination: null }), crumbs);
    for (let i = 0; i < 40; i++) await minute(e);
    expect(sent).toEqual([]);
  });
});

describe('the rig (B8)', () => {
  const full = (over: Partial<SpeciesStanding>) => ({ reachRef: 'kestrel:confluence', species: [species({ fightRating: 0.1, ...over })], water: WATER, contamination: null });
  /** Minutes to the first bite, capped. */
  async function minutesToBite(e: FishingEngagement, cap = 200): Promise<number> {
    let m = 0;
    while (sent.length === 0 && m < cap) {
      await minute(e);
      m += 1;
    }
    return m;
  }

  it('⭐ where the rig presents against where the species feeds: a float over a bottom feeder is a long afternoon; the same float over a surface feeder is the whole bite; a species that authors no layer feeds anywhere', async () => {
    rod.setPresentsAt('surface');
    const onTheBottom = await minutesToBite(engagement(makeStuff(() => new Angler()), registry(full({ feedsAt: 'bottom' })), makeStuff(() => new Bait())));
    sent = [];
    const atTheSurface = await minutesToBite(engagement(makeStuff(() => new Angler()), registry(full({ feedsAt: 'surface' })), makeStuff(() => new Bait())));
    sent = [];
    const anywhere = await minutesToBite(engagement(makeStuff(() => new Angler()), registry(full({})), makeStuff(() => new Bait())));
    expect(atTheSurface).toBeLessThanOrEqual(12);
    expect(anywhere).toBe(atTheSurface);
    expect(onTheBottom).toBeGreaterThan(atTheSurface * 5);
    // A free line finds a bottom feeder half the time.
    sent = [];
    rod.setPresentsAt('mid');
    const freeLined = await minutesToBite(engagement(makeStuff(() => new Angler()), registry(full({ feedsAt: 'bottom' })), makeStuff(() => new Bait())));
    expect(freeLined).toBeGreaterThan(atTheSurface);
    expect(freeLined).toBeLessThan(onTheBottom);
  });

  it('⭐ the hook selects: a big gape and a small fish is a nibble that prints nothing and keeps the bait; a small gape takes it', async () => {
    rod.setHookGapeM(0.03); // takes a fish 24 cm and up; the stub's stature is 0.4 × (0.6..1.6)
    vi.spyOn(StuffApi, 'singleton').mockImplementation((async () => ({ getStature: () => 0.02 })) as never); // minnows
    const bait = makeStuff(() => new Bait());
    const reg = registry(full({}));
    const e = engagement(makeStuff(() => new Angler()), reg, bait);
    for (let i = 0; i < 40; i++) await minute(e);
    expect(sent).toEqual([]);
    expect(reg.drawn).toEqual([]);
    expect(bait.isDestroyed()).toBe(false);
    rod.setHookGapeM(0.002);
    const e2 = engagement(makeStuff(() => new Angler()), reg, bait);
    for (let i = 0; i < 40 && sent.length === 0; i++) await minute(e2);
    expect(reg.drawn).toHaveLength(1);
  });

  it('⭐ a lure fishes only while it is worked, draws predators only, and is not consumed at the take', async () => {
    const spoon = makeStuff(() => new Bait());
    spoon.setBaitKind('lure');
    const predator = full({ role: 'predator', name: 'brown trout' });
    // Unworked: a spoon on the bottom is a stone.
    const idle = engagement(makeStuff(() => new Angler()), registry(predator), spoon);
    for (let i = 0; i < 40; i++) await minute(idle);
    expect(sent).toEqual([]);
    // Worked every minute: it takes.
    const angler = makeStuff(() => new Angler());
    const reg = registry(predator);
    const worked = engagement(angler, reg, spoon);
    let m = 0;
    while (sent.length === 0 && m < 40) {
      expect(worked.work()).toBe(true);
      await minute(worked);
      m += 1;
    }
    expect(reg.drawn).toHaveLength(1);
    expect(spoon.isDestroyed()).toBe(false);
    // A forage fish never strikes a spoon, worked or not.
    sent = [];
    const forage = engagement(makeStuff(() => new Angler()), registry(full({ role: 'forage' })), spoon);
    for (let i = 0; i < 40; i++) {
      forage.work();
      await minute(forage);
    }
    expect(sent).toEqual([]);
    // No lure: nothing to work.
    expect(engagement(makeStuff(() => new Angler()), reg, makeStuff(() => new Bait())).work()).toBe(false);
  });

  it('⭐ a small landed fish on the hook is a baitfish; a big one is nothing', async () => {
    const minnow = makeStuff(() => new Fish());
    minnow.setLengthM(0.1);
    const reg = registry(full({ role: 'predator' }));
    const e = engagement(makeStuff(() => new Angler()), reg, minnow);
    for (let i = 0; i < 20 && sent.length === 0; i++) await minute(e);
    expect(reg.drawn).toHaveLength(1);
    expect(minnow.isDestroyed()).toBe(true);
    sent = [];
    const big = makeStuff(() => new Fish());
    big.setLengthM(0.6);
    const e2 = engagement(makeStuff(() => new Angler()), registry(full({ role: 'predator' })), big);
    for (let i = 0; i < 40; i++) await minute(e2);
    expect(sent).toEqual([]);
  });
});

describe('the bite', () => {
  it('⭐ a small fish lands itself into the hand, is drawn from the record, and its size is words', async () => {
    const angler = makeStuff(() => new Angler());
    const bait = makeStuff(() => new Bait());
    const reg = registry({ reachRef: 'kestrel:confluence', species: [species({ fightRating: 0.1 })], water: WATER, contamination: null });
    const e = engagement(angler, reg, bait, 1.8);
    for (let i = 0; i < 12 && sent.length === 0; i++) await minute(e);
    expect(sent.join(' ')).toMatch(/a grey mullet, .* long|a grey mullet, as long as/);
    expect(sent.join(' ')).not.toMatch(/\d/);
    expect(reg.drawn).toEqual(['/stuff/idea/species/grey-mullet']);
    const held = [...angler.getContents()];
    expect(held.some((t) => t instanceof Fish)).toBe(true);
    expect(bait.isDestroyed()).toBe(true); // the bait is gone
    expect(e.isFighting()).toBe(false);
    // The wait ends at a landing.
    expect(SchedulerApi.complete).toHaveBeenCalled();
  });

  it('the species draw is stable for a seed', async () => {
    const two: FisheryStanding = {
      reachRef: 'kestrel:confluence',
      species: [species({ fightRating: 0.1 }), species({ speciesPath: '/stuff/idea/species/eel', name: 'eel', fightRating: 0.1 })],
      water: WATER,
      contamination: null,
    };
    const first = async () => {
      sent = [];
      const reg = registry(two);
      const e = engagement(makeStuff(() => new Angler()), reg, makeStuff(() => new Bait()));
      for (let i = 0; i < 20 && reg.drawn.length === 0; i++) await minute(e);
      return reg.drawn[0];
    };
    expect(await first()).toBe(await first());
  });

  it('⭐ a fighter opens a contest; a landed one comes in; the actor is credited', async () => {
    const angler = makeStuff(() => new Angler());
    const credited: unknown[] = [];
    (angler as unknown as { creditDeed: (d: unknown) => Promise<void> }).creditDeed = async (d) => {
      credited.push(d);
    };
    const reg = registry({ reachRef: 'kestrel:confluence', species: [species({ fightRating: 1, role: 'apex', name: 'sturgeon' })], water: WATER, contamination: null });
    // A baitfish for a predator: a worm suits an apex poorly, and the bite comes slowly.
    const baitfish = makeStuff(() => new Bait());
    baitfish.setBaitKind('baitfish');
    const e = engagement(angler, reg, baitfish);
    for (let i = 0; i < 12 && !e.isFighting(); i++) await minute(e);
    expect(e.isFighting()).toBe(true);
    expect(sent.join(' ')).toMatch(/rod bends double/);
    expect(reg.drawn).toEqual([]); // not landed yet
    sent = [];
    // Play it: give when it runs, gain when it rests.
    for (let i = 0; i < 20 && e.isFighting(); i++) {
      const c = (e as unknown as { contest: { strain: number } | null }).contest;
      if (c && c.strain > 0.5) await e.slack();
      else await e.reel();
      if (e.isFighting()) await minute(e);
    }
    expect(e.isFighting()).toBe(false);
    expect(reg.drawn).toEqual(['/stuff/idea/species/grey-mullet']);
    expect(credited).toContainEqual({ discipline: 'fishing', difficulty: 'hard', outcome: 'success' });
  });

  it('⭐ two reels inside a tick snap the line: the rod stays, the fish is gone, the wait ends', async () => {
    const angler = makeStuff(() => new Angler());
    const reg = registry({ reachRef: 'kestrel:confluence', species: [species({ fightRating: 1 })], water: WATER, contamination: null });
    const e = engagement(angler, reg, makeStuff(() => new Bait()));
    for (let i = 0; i < 12 && !e.isFighting(); i++) await minute(e);
    const first = await e.reel();
    expect(first).toBeNull();
    const second = await e.reel();
    expect(second?.kind).toBe('snapped');
    expect(reg.drawn).toEqual([]);
    expect(rod.isDestroyed()).toBe(false);
    expect(SchedulerApi.complete).toHaveBeenCalled();
  });

  it('⭐ an NPC actor releases at once — the same record, the same arithmetic, nothing kept', async () => {
    const fisher = makeStuff(() => new Fisher());
    vi.spyOn(MixinApi, 'isPersona').mockReturnValue(false as never);
    const reg = registry({ reachRef: 'kestrel:confluence', species: [species({ fightRating: 0.1 })], water: WATER, contamination: null });
    const e = engagement(fisher, reg, null, 1.8);
    for (let i = 0; i < 120 && reg.drawn.length === 0; i++) await minute(e);
    expect(reg.drawn).toEqual(['/stuff/idea/species/grey-mullet']);
    expect(reg.released).toEqual(['/stuff/idea/species/grey-mullet']);
    expect([...fisher.getContents()].some((t) => t instanceof Fish)).toBe(false);
    expect(sent.join(' ')).toMatch(/lets? it go/);
  });

  it('a fish landed below the outfall carries the water — silently', async () => {
    const angler = makeStuff(() => new Angler());
    const reg = registry({
      reachRef: 'kestrel:confluence',
      species: [species({ fightRating: 0.1 })],
      water: { ...WATER, contamination: 0.4 },
      contamination: { level: 0.4, byKind: { organic: 0.4 } },
    });
    const e = engagement(angler, reg, makeStuff(() => new Bait()), 1.8);
    for (let i = 0; i < 12 && reg.drawn.length === 0; i++) await minute(e);
    const fish = [...angler.getContents()].find((t) => t instanceof Fish) as Fish;
    expect(fish.getPathogenLoad('e-coli')).toBeCloseTo(0.8, 6);
    expect(sent.join(' ')).not.toMatch(/foul|dirty|outfall|sick/);
  });
});
