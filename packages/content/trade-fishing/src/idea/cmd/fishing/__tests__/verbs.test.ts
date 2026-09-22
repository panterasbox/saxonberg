/**
 * The angling verbs (fishing B3): `fish` starts the wait on the rod;
 * `reel` / `slack` with no line out say so; `release` puts a fish back
 * into the record and destructs it; the Locality's reach is the
 * fallback when no Shore is bound.
 *
 * ⚠ Models are built with every defaulted arg the binder would fill
 * (`rod`, `shore`, `fish`) — `lint:binder-models`.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import Locality from '@saxonberg/server/mud/platform/idea/Locality';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { TestActor, makeContext, standUpBranchHarness } from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import FishController from '../FishController';
import ReelController from '../ReelController';
import SlackController from '../SlackController';
import ReleaseController from '../ReleaseController';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import Waters, { WATERS_PATH } from '../../../Waters';
import Rod from '../../../../thing/Rod';
import Fish from '../../../../agent/Fish';
import { FISHING_TYPE } from '../../../../lib/FishingEngagement';

class Angler extends TestActor {}

type Runnable = Stuff & { execute(model: never, ctx: CommandContext): unknown };
async function run(Controller: new () => Runnable, model: Record<string, unknown>, actor: Stuff, where: Stuff, text: string): Promise<CommandContext> {
  const ctx = makeContext(actor, where, text);
  await makeStuff<Runnable>(() => new Controller()).execute(model as never, ctx);
  return ctx;
}
function rejected(ctx: CommandContext): string | null {
  const note = ctx.getNotes().find((n) => n.kind === 'controller-rejected');
  return note ? (note as unknown as { reason: string }).reason : null;
}

let room: Location;
let angler: Angler;
let rod: Rod;
let released: string[];
let sent: string[];

beforeEach(async () => {
  await standUpBranchHarness();
  sent = [];
  released = [];
  room = makeStuff(() => new Location());
  angler = makeStuff(() => new Angler());
  ContainmentApi.move(angler as never, room as never);
  rod = makeStuff(() => new Rod());
  ContainmentApi.move(rod as never, angler as never);
  // The trade singleton, with the water pack's register stubbed at its shape.
  const waters = makeStuffAtPath(() => new Waters(), WATERS_PATH);
  vi.spyOn(waters, 'registry').mockResolvedValue({
    standingAt: async () => null,
    readFor: () => [],
    draw: async () => 0,
    release: async (_r: string, sp: string) => {
      released.push(sp);
    },
  });
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
});
afterEach(() => {
  SchedulerApi._clearAllForTesting();
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

const localityWith = (reach: string | null) => {
  const l = makeStuffAtPath(() => new Locality(), '/stuff/idea/Locality/test');
  l.setReach(reach);
  vi.spyOn(AddressApi, 'resolveLocalityFor').mockResolvedValue(l);
};

describe('fish', () => {
  it('⭐ starts the wait on the rod, through the Locality\'s reach when no Shore is bound', async () => {
    localityWith('delight:flats');
    const ctx = await run(FishController as never, { rod: { stuff: rod, raw: 'rod' } }, angler, room, 'fish');
    expect(rejected(ctx)).toBeNull();
    const live = angler.getEngagementByType(FISHING_TYPE);
    expect(live).toBeDefined();
    expect((live as unknown as { reachRef: string }).reachRef).toBe('delight:flats');
    expect(sent.join(' ')).toMatch(/cast out/);
  });

  it('a bound Shore\'s reach wins over the Locality\'s', async () => {
    localityWith('delight:flats');
    const shore = { getReachRef: () => 'kestrel:confluence' } as unknown as Stuff;
    await run(FishController as never, { rod: { stuff: rod, raw: 'rod' }, shore: { stuff: shore, raw: 'bank' } }, angler, room, 'fish at bank');
    expect((angler.getEngagementByType(FISHING_TYPE) as unknown as { reachRef: string }).reachRef).toBe('kestrel:confluence');
  });

  it('⚠ no reach anywhere: "there is no water here", and nothing starts', async () => {
    localityWith(null);
    const ctx = await run(FishController as never, { rod: { stuff: rod, raw: 'rod' } }, angler, room, 'fish');
    expect(rejected(ctx)).toBe('no-water');
    expect(angler.getEngagementByType(FISHING_TYPE)).toBeUndefined();
  });

  it('a line already out is refused', async () => {
    localityWith('delight:flats');
    await run(FishController as never, { rod: { stuff: rod, raw: 'rod' } }, angler, room, 'fish');
    const ctx = await run(FishController as never, { rod: { stuff: rod, raw: 'rod' } }, angler, room, 'fish');
    expect(rejected(ctx)).toBe('already-fishing');
  });
});

describe('reel / slack', () => {
  it('with no line out, say so', async () => {
    expect(rejected(await run(ReelController as never, {}, angler, room, 'reel'))).toBe('no-line');
    expect(rejected(await run(SlackController as never, {}, angler, room, 'slack'))).toBe('no-line');
  });

  it('with a line out and nothing on it, a quiet line and no refusal', async () => {
    localityWith('delight:flats');
    await run(FishController as never, { rod: { stuff: rod, raw: 'rod' } }, angler, room, 'fish');
    sent = [];
    const ctx = await run(ReelController as never, {}, angler, room, 'reel');
    expect(rejected(ctx)).toBeNull();
    expect(sent.join(' ')).toMatch(/Nothing is on it/);
  });
});

describe('release', () => {
  it('⭐ returns a held fish to the record and destructs it; an apex release is a deed', async () => {
    localityWith('kestrel:confluence');
    const sturgeon = makeStuffAtPath(() => new Species(), '/stuff/idea/species/sturgeon');
    sturgeon.setCommonNames(['sturgeon']);
    sturgeon.setHabitat({ tolerances: {}, role: 'apex', abundance: 2, fightRating: 1 });
    const fish = makeStuff(() => new Fish());
    fish.setSpecies(sturgeon);
    ContainmentApi.move(fish as never, angler as never);
    const deeds: unknown[] = [];
    vi.spyOn(angler, 'recordDeed').mockImplementation(async (d) => {
      deeds.push(d);
    });
    const ctx = await run(ReleaseController as never, { fish: { stuff: fish, raw: 'sturgeon' } }, angler, room, 'release sturgeon');
    expect(rejected(ctx)).toBeNull();
    expect(released).toEqual(['/stuff/idea/species/sturgeon']);
    expect(fish.isDestroyed()).toBe(true);
    expect(deeds).toHaveLength(1);
    expect(sent.join(' ')).toMatch(/let the sturgeon go/);
  });

  it('refuses what is not a fish, a dead fish, and a place with no water', async () => {
    localityWith('kestrel:confluence');
    const notFish = makeStuff(() => new Location());
    expect(rejected(await run(ReleaseController as never, { fish: { stuff: notFish, raw: 'rock' } }, angler, room, 'release rock'))).toBe('not-a-fish');
    const dead = makeStuff(() => new Fish());
    dead.setLifecycleState('dead');
    expect(rejected(await run(ReleaseController as never, { fish: { stuff: dead, raw: 'fish' } }, angler, room, 'release fish'))).toBe('dead');
    localityWith(null);
    const live = makeStuff(() => new Fish());
    expect(rejected(await run(ReleaseController as never, { fish: { stuff: live, raw: 'fish' } }, angler, room, 'release fish'))).toBe('no-water');
    expect(live.isDestroyed()).toBe(false);
  });

  it('⭐ a fish whose dying window has run out is dead, however lazily: release reconciles before it looks (drive run 23)', async () => {
    localityWith('kestrel:confluence');
    // The dying clock reads game time only while a WorldClockRegistry is
    // registered (the branch harness runs the clock without the row).
    if (!StuffApi.findByTemplatePath('/platform/idea/WorldClockRegistry')) {
      makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    }
    const drowned = makeStuff(() => new Fish());
    drowned.setLifecycleState('alive');
    // The drain's last act: a dying record, then it cancels itself and
    // nothing reads the fish again — `isDead()` alone still says alive.
    drowned.beginDying('asphyxiation', 90);
    expect(drowned.isDead()).toBe(false);
    WorldClockApi._advanceForTesting(200_000);
    expect(rejected(await run(ReleaseController as never, { fish: { stuff: drowned, raw: 'fish' } }, angler, room, 'release fish'))).toBe('dead');
    expect(drowned.isDestroyed()).toBe(false);
  });
});
