/**
 * set / lift / dig (fishing B4) — a pot goes into the water and comes
 * out with what the record put in it; a worm costs the ground.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import Locality from '@saxonberg/server/mud/platform/idea/Locality';
import PlantPot from '@saxonberg/server/mud/platform/thing/PlantPot';
import { Reserve } from '@saxonberg/server/mud/lib/reserve';
import { SOIL_ORGANIC_MATTER_RESERVE_KEY } from '@saxonberg/server/mud/lib/husbandry/Soil';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { TestActor, makeContext, completeStep, standUpBranchHarness } from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import LayController from '../LayController';
import LiftController from '../LiftController';
import DigController from '../DigController';
import Waters, { WATERS_PATH } from '../../../Waters';
import Trap from '../../../../thing/Trap';
import Bait from '../../../../thing/Bait';
import Fish from '../../../../agent/Fish';
import type { SpeciesStanding } from '../../../../lib/FisheryRead';

class Angler extends TestActor {}
type Runnable = Stuff & { execute(model: never, ctx: CommandContext): unknown };
async function run(Controller: new () => Runnable, model: Record<string, unknown>, actor: Stuff, where: Stuff, text: string): Promise<CommandContext> {
  const ctx = makeContext(actor, where, text);
  await makeStuff<Runnable>(() => new Controller()).execute(model as never, ctx);
  return ctx;
}
const rejected = (ctx: CommandContext): string | null => {
  const note = ctx.getNotes().find((n) => n.kind === 'controller-rejected');
  return note ? (note as unknown as { reason: string }).reason : null;
};

let room: Location;
let angler: Angler;
let sent: string[];
let drawn: string[];
let standing: SpeciesStanding[];

function crab(level = 360): SpeciesStanding {
  return { speciesPath: '/stuff/idea/species/shore-crab', name: 'shore crab', capacity: 360, full: 360, level, fit: 1, limiting: null, stocked: false, role: 'bait', fightRating: 0.1 };
}

beforeEach(async () => {
  await standUpBranchHarness();
  sent = [];
  drawn = [];
  standing = [crab()];
  room = makeStuff(() => new Location());
  angler = makeStuff(() => new Angler());
  ContainmentApi.move(angler as never, room as never);
  const locality = makeStuffAtPath(() => new Locality(), '/stuff/idea/Locality/test');
  locality.setReach('kestrel:confluence');
  vi.spyOn(AddressApi, 'resolveLocalityFor').mockResolvedValue(locality);
  const waters = makeStuffAtPath(() => new Waters(), WATERS_PATH);
  vi.spyOn(waters, 'registry').mockResolvedValue({
    standingAt: async () => ({ reachRef: 'kestrel:confluence', species: standing, water: {} as never, contamination: null }),
    readFor: () => [],
    draw: async (_r: string, sp: string, n: number) => {
      drawn.push(sp);
      return n;
    },
    release: async () => {},
  });
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) =>
    path.endsWith('/worm') ? makeStuff(() => new Bait()) : makeStuff(() => new Fish())) as never);
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

function heldPot(): Trap {
  const t = makeStuff(() => new Trap());
  t.setDrawPerHour(0.4);
  t.setTakesRoles(['bait', 'forage']);
  t.setCapacity(2);
  ContainmentApi.move(t as never, angler as never);
  return t;
}

describe('lay and lift', () => {
  it('⭐ lay puts the pot in the water, stamped; lift after a night brings crabs, drawn from the record', async () => {
    const pot = heldPot();
    const ctx = await run(LayController as never, { trap: { stuff: pot, raw: 'pot' } }, angler, room, 'lay pot');
    expect(rejected(ctx)).toBeNull();
    expect(pot.getContainer()).toBe(room);
    expect(pot.isSet()).toBe(true);
    expect(pot.getSetReach()).toBe('kestrel:confluence');
    expect(pot.getSetBy()).toBe(angler.getIdentityPath() ?? '');

    await completeStep(8 * 3600 * 1000); // a night
    const lift = await run(LiftController as never, { trap: { stuff: pot, raw: 'pot' } }, angler, room, 'lift pot');
    expect(rejected(lift)).toBeNull();
    expect(pot.getContainer()).toBe(angler);
    expect(pot.isSet()).toBe(false);
    expect(drawn).toEqual(['/stuff/idea/species/shore-crab', '/stuff/idea/species/shore-crab']);
    const held = [...angler.getContents()].filter((t) => t instanceof Fish);
    expect(held).toHaveLength(2);
    expect(sent.join(' ')).toMatch(/Two shore crabs in it/);
    // No figure in the prose (the stuff-id attribute is markup, not prose).
    expect(sent.join(' ').replace(/<[^>]+>/g, '')).not.toMatch(/\d/);
  });

  it('an empty reach lifts an empty pot, and nothing says which was luck', async () => {
    standing = [crab(0)];
    const pot = heldPot();
    await run(LayController as never, { trap: { stuff: pot, raw: 'pot' } }, angler, room, 'lay pot');
    await completeStep(8 * 3600 * 1000);
    await run(LiftController as never, { trap: { stuff: pot, raw: 'pot' } }, angler, room, 'lift pot');
    expect(drawn).toEqual([]);
    expect(sent.join(' ')).toMatch(/Nothing in it/);
    expect(pot.getContainer()).toBe(angler);
  });

  it('a pot not held cannot be laid; a pot not set cannot be lifted; laid twice is refused', async () => {
    const pot = makeStuff(() => new Trap());
    ContainmentApi.move(pot as never, room as never);
    expect(rejected(await run(LayController as never, { trap: { stuff: pot, raw: 'pot' } }, angler, room, 'lay pot'))).toBe('not-held');
    expect(rejected(await run(LiftController as never, { trap: { stuff: pot, raw: 'pot' } }, angler, room, 'lift pot'))).toBe('not-set');
    const held = heldPot();
    await run(LayController as never, { trap: { stuff: held, raw: 'pot' } }, angler, room, 'lay pot');
    ContainmentApi.move(held as never, angler as never); // somebody picked it up somehow
    expect(rejected(await run(LayController as never, { trap: { stuff: held, raw: 'pot' } }, angler, room, 'lay pot'))).toBe('already-set');
  });
});

describe('dig', () => {
  function bed(organic: number): PlantPot {
    return makeStuff(() => {
      const pot = new PlantPot();
      pot.interiorBulk = true;
      pot.setInteriorCapacity(Quantity.of(5, 'L'));
      pot.setInteriorAmount(Quantity.of(5, 'L'));
      pot.setReserve(new Reserve(SOIL_ORGANIC_MATTER_RESERVE_KEY, Quantity.of(100, '%'), Quantity.of(organic, '%'), 'cultivation', null));
      return pot;
    });
  }

  it('⭐ two game minutes, then a worm in hand — and the ground has less in it', async () => {
    const ground = bed(0.5);
    ContainmentApi.move(ground as never, room as never);
    const before = ground.organicMatterFraction()!;
    const ctx = await run(DigController as never, { ground: { stuff: ground, raw: 'bed' } }, angler, room, 'dig');
    expect(rejected(ctx)).toBeNull();
    expect([...angler.getContents()].some((t) => t instanceof Bait)).toBe(false); // not yet
    await completeStep(2 * 60 * 1000);
    for (let i = 0; i < 6; i++) await new Promise<void>((r) => setTimeout(r, 0));
    expect([...angler.getContents()].some((t) => t instanceof Bait)).toBe(true);
    expect(ground.organicMatterFraction()!).toBeLessThan(before);
  });

  it('⚠ worked-out ground refuses, and says so', async () => {
    const ground = bed(0);
    ContainmentApi.move(ground as never, room as never);
    const ctx = await run(DigController as never, { ground: { stuff: ground, raw: 'bed' } }, angler, room, 'dig');
    expect(rejected(ctx)).toBe('worked-out');
  });

  it('no cultivable ground: refused', async () => {
    const rock = makeStuff(() => new Location());
    expect(rejected(await run(DigController as never, { ground: { stuff: rock, raw: 'rock' } }, angler, room, 'dig'))).toBe('no-ground');
  });
});
