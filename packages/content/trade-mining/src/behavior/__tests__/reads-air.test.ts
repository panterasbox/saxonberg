/**
 * The canary (metal chain M5) — ⭐⭐ **the only free reading of the one
 * hazard in this build that can kill you.**
 *
 * Three things are pinned, and the third is the design:
 *
 *  1. the bird's behaviour TRACKS the air value, monotonically, so its
 *     silence is a reading and not a mood;
 *  2. it reports whether or not anyone is watching (`presenceGated:
 *     false`), so you walk in on a bird that has ALREADY stopped;
 *  3. ⭐ **it is not redundant with a nose.** Blackdamp is odourless —
 *     the atmosphere a spent working actually holds — and the bird is
 *     the only thing that catches it. Stinkdamp reeks and a nose catches
 *     that. The two senses cover different gases, which is the
 *     historical reason for the bird and the reason neither is a spare.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain as readsAir } from '../reads-air';
import MineRoom from '../../location/MineRoom';
import Deposit from '../../idea/Deposit';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import Biome from '@saxonberg/server/mud/platform/idea/Biome';
import SingletonCartesianLocation from '@saxonberg/server/mud/platform/location/SingletonCartesianLocation';
import Prop from '@saxonberg/server/mud/platform/thing/Prop';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { PersistenceManager } from '@saxonberg/server/mud/lib/persistence/__tests__/backend-store';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import type { Cell } from '../../lib/Working';

const ZONE = '/world/fx-mine/mine';
const SURFACE = '/world/fx-mine/pithead';
const DEPOSIT = '/world/fx-mine/idea/deposit/fx';
const SLATE = '/stuff/idea/material/rock/slate';

let zone: CartesianZone;
let surface: CartesianZone;

function working(cell: Cell): MineRoom {
  const r = makeStuff(() => new MineRoom());
  zone.addLocation(r as unknown as never, cell[0], cell[1], cell[2]);
  return r;
}

async function link(a: MineRoom | Stuff, b: MineRoom | Stuff, dir: string, back: string): Promise<void> {
  await (a as unknown as {
    addBidirectionalExit(o: unknown, d: string, opts: unknown): Promise<void>;
  }).addBidirectionalExit(b, dir, { opposite: back, keepLiveDestination: true });
}

/** A heading `n` cells long, hanging off an adit that breathes. */
async function heading(n: number): Promise<MineRoom[]> {
  const adit = makeStuffAtPath(() => new SingletonCartesianLocation(), '/world/fx-mine/location/adit');
  surface.addLocation(adit as unknown as never, 0, 0, 0);
  const chain: MineRoom[] = [];
  for (let i = 1; i <= n; i++) chain.push(working([0, i, -1]));
  await link(chain[0]!, adit, 'south', 'north');
  for (let i = 1; i < chain.length; i++) await link(chain[i]!, chain[i - 1]!, 'south', 'north');
  return chain;
}

function ctxFor(bird: Stuff): BrainContext {
  return { host: bird, config: {} } as unknown as BrainContext;
}

describe('the canary', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    Document.setMarshallerResolver(() => undefined, async () => undefined);
    vi.spyOn(PersistenceManager, 'get').mockReturnValue({
      save: async () => '1',
      find: async () => [],
      findById: async () => null,
      delete: async () => undefined,
      isConnected: () => true,
    } as unknown as PersistenceManager);
    // The root universe biome — the chain a room with GOOD air falls
    // back through. Its absence is what a room with foul air never asks.
    const universe = makeStuffAtPath(() => new Biome(), '/stuff/idea/biome/universe');
    universe.setDefaultAtmosphere('air');
    const m = makeStuffAtPath(() => new Material(), SLATE);
    (m as unknown as { hardness: Quantity<'MPa'> }).hardness = Quantity.of(90, 'MPa');
    zone = makeStuffAtPath(() => new CartesianZone(), ZONE);
    zone.setCellSize(10);
    (zone as unknown as { deposit: string }).deposit = DEPOSIT;
    surface = makeStuffAtPath(() => new CartesianZone(), SURFACE);
    const d = makeStuffAtPath(() => new Deposit(), DEPOSIT);
    d.setStratigraphy([{ toZ: -4000, host: SLATE }]);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ the bird’s behaviour tracks the air, and its silence is the reading', async () => {
    const chain = await heading(11);
    const lines: string[] = [];
    vi.spyOn(MessageApi, 'scene').mockImplementation(((): unknown => ({
      topic: () => ({
        toPeers: (m: { toString(): string }) => ({
          send: () => lines.push(String(m)),
        }),
      }),
    })) as never);

    for (const room of [chain[0]!, chain[5]!, chain[10]!]) {
      const bird = makeStuff(() => new Prop());
      bird.setShortDescription('a canary');
      ContainmentApi.move(bird as unknown as Stuff & Containable, room as unknown as Stuff & Container);
      await readsAir.act(ctxFor(bird as unknown as Stuff));
    }
    expect(lines.length).toBe(3);
    // Near the adit it sings; deep in the heading it does not.
    expect(lines[0]).toMatch(/sings/);
    expect(lines[2]).toMatch(/no sound|still heap/);
    // …and monotone: never louder further in.
    expect(lines[1]).not.toMatch(/steady and bright/);
  });

  it('it reports UNWATCHED — you walk in on a bird that has already stopped', () => {
    expect(readsAir.presenceGated).toBe(false);
    expect(readsAir.ambient).toBe(false);
  });

  it('⭐ blackdamp is ODOURLESS, so the bird is not redundant with a nose', () => {
    // The two gases the mine deals in, read off the shipped vocabulary:
    // both kill, and only one announces itself.
    expect(BiomeApi.breathableOf('blackdamp')).toBe(false);
    expect(BiomeApi.breathableOf('stinkdamp')).toBe(false);
    expect(BiomeApi.contaminantOf('blackdamp')).toBeNull();
    expect(BiomeApi.contaminantOf('stinkdamp')).toBe('hydrogenSulfide');
  });

  it('⚠ a spent heading holds BLACKDAMP, and the shipped respiration driver does the rest', async () => {
    const chain = await heading(11);
    const far = chain[10]!;
    expect(await far.airAt()).toBeLessThan(0.34);
    // The room reports a different atmosphere; nothing in respiration
    // learns a new concept, and every shipped consequence follows.
    expect(await BiomeApi.resolveAtmosphereFor(far as unknown as Stuff & Container)).toBe('blackdamp');

    // ⭐ …and walking out is always possible and always works: the near
    // end of the same heading falls back through the biome chain.
    expect(await chain[0]!.airAt()).toBeGreaterThan(0.34);
    expect(
      await BiomeApi.resolveAtmosphereFor(chain[0]! as unknown as Stuff & Container),
    ).not.toBe('blackdamp');
  });

  it('holing the heading through CLEARS the blackdamp — the topology is the model', async () => {
    const chain = await heading(11);
    const far = chain[10]!;
    await far.refreshAir();
    expect(await BiomeApi.resolveAtmosphereFor(far as unknown as Stuff & Container)).toBe('blackdamp');

    const second = makeStuffAtPath(
      () => new SingletonCartesianLocation(),
      '/world/fx-mine/location/adit2',
    );
    surface.addLocation(second as unknown as never, 4, 0, 0);
    await link(far, second, 'east', 'west');
    await far.refreshAir();
    expect(await far.airAt()).toBe(1);
    expect(await BiomeApi.resolveAtmosphereFor(far as unknown as Stuff & Container)).not.toBe('blackdamp');
  });
});
