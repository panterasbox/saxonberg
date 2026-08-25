/**
 * Recency-stack and chain-of-responsibility dispatch tests.
 *
 * Tests count stack ENTRIES rather than CommandDefinition[] length:
 * the framework mixins (Container, Sensor, …) contribute their own
 * commands at construction time, so totals depend on what's
 * composed. Entry counts factor those out.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Idea } from '../../lib/stuff/Idea';
import Location from '../../lib/stuff/Location';
import CartesianZone from '../../obj/location/CartesianZone';
import CartesianLocation from '../../lib/location/CartesianLocation';
import Exit from '../../lib/boundary/Exit';
import Door from '../../obj/Door';
import {
  CommandGiverMixin,
  type CommandGiver,
  type RecencyEntry,
} from '../../lib/command/CommandGiver';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { TangibleMixin } from '../../lib/material/Tangible';
import { ContainerMixin } from '../../lib/spatial/Container';
import { SensorMixin } from '../../lib/message/Sensor';
import { ContainmentApi } from '../containment';
import { CommandApi } from '../command';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import {
  PersistenceManager,
  Collections,
} from '../../../backend/PersistenceManager';

const TestGiverBase = CommandGiverMixin(
  SensorMixin(ContainerMixin(ContainableMixin(Idea)))
);

class TestGiver extends TestGiverBase {
  static override commandContributions = {
      peers: [],
    self: ['system/ping.yaml'],
    environment: [],
  };
  public envelopes: Array<import('@saxonberg/types').EnvelopeTemplate> = [];
  protected override handleMessage(_frame: unknown): void {
    // discard
  }
  protected override handleEnvelope(
    envelope: import('@saxonberg/types').EnvelopeTemplate,
  ): void {
    this.envelopes.push(envelope);
  }
}

const InvProviderBase = ContainableMixin(Idea);
class InvProvider extends InvProviderBase {
  static commandContributions = {
      peers: [],
    self: [],
    environment: ['system/ping.yaml'],
  };
}

/** A plain nestable container — a bag. Affords nothing itself, so it
 * cannot mask what the thing INSIDE it affords. */
const BagBase = ContainerMixin(ContainableMixin(Idea));
class Bag extends BagBase {
  static commandContributions = {
    self: [],
    inventory: [],
    environment: [],
    peers: [],
  };
}

const EnvProviderBase = ContainableMixin(Idea);
class EnvProvider extends EnvProviderBase {
  static commandContributions = {
      peers: ['system/ping.yaml'],
    self: [],
    environment: [],
  };
}

// executeCommand derives its own context — these tests just call it
// directly on a giver that's been placed in a location.

function stackOf(giver: TestGiver): RecencyEntry[] {
  return (giver as unknown as { _commandStack: RecencyEntry[] })._commandStack;
}

function bucketsOf(giver: TestGiver): string[] {
  return stackOf(giver).map((e) => e.bucket);
}

describe('CommandGiverMixin recency stack', () => {
  beforeEach(() => {
    CommandApi.clearCache();
    const find = vi.fn(
      async (collection: string, query: Record<string, unknown>) => {
        if (
          collection === Collections.Content &&
          query.path === '/obj/command/system/PingController'
        ) {
          return [
            {
              path: '/obj/command/system/PingController',
              class: '/obj/command/system/PingController',
              data: {},
            },
          ];
        }
        return [];
      }
    );
    vi.spyOn(PersistenceManager, 'get').mockReturnValue({
      save: vi.fn(),
      find,
      findById: vi.fn(),
    } as unknown as PersistenceManager);
  });

  it('lazily seeds the self entry when a giver was built without postRegister', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    // No postRegister fired (makeStuff skips it). Stack starts empty.
    expect(stackOf(giver)).toHaveLength(0);
    // First read seeds self.
    giver.getAvailableCommands();
    expect(bucketsOf(giver)).toEqual(['self']);
  });

  it('pushes a held item\'s contributions (environment) on move into the giver', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    giver.getAvailableCommands(); // seed self
    const baseLen = stackOf(giver).length;

    const item = makeStuff(() => new InvProvider());
    ContainmentApi.move(item, giver as unknown as Parameters<typeof ContainmentApi.move>[1]);

    expect(stackOf(giver)).toHaveLength(baseLen + 1);
    // A held item grants OUTWARD to its holder: the `environment`
    // bucket under the directional model.
    expect(stackOf(giver)[baseLen]?.bucket).toBe('environment');
  });

  it('pops a held item\'s contributions on move out of the giver', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    giver.getAvailableCommands();
    const item = makeStuff(() => new InvProvider());
    ContainmentApi.move(item, giver as unknown as Parameters<typeof ContainmentApi.move>[1]);
    const beforePop = stackOf(giver).length;

    ContainmentApi.move(item, null);

    expect(stackOf(giver)).toHaveLength(beforePop - 1);
    expect(bucketsOf(giver)).not.toContain('peers');
  });

  it('pushes sibling (peers) contributions when a giver enters a Location with content', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    const loc = makeStuff(() => new Location());
    const envThing = makeStuff(() => new EnvProvider());
    ContainmentApi.move(envThing, loc);

    ContainmentApi.move(giver, loc);

    // Self entry seeded by getAvailableCommands OR by self-move
    // logic; either way the sibling entry must be present too — room
    // contents reach you sideways, which is `peers`.
    giver.getAvailableCommands();
    expect(bucketsOf(giver)).toContain('peers');
  });

  it('pops sibling (peers) contributions when a giver leaves a Location', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    const loc = makeStuff(() => new Location());
    const envThing = makeStuff(() => new EnvProvider());
    ContainmentApi.move(envThing, loc);
    ContainmentApi.move(giver, loc);
    expect(bucketsOf(giver)).toContain('peers');

    const otherLoc = makeStuff(() => new Location());
    ContainmentApi.move(giver, otherLoc);

    expect(bucketsOf(giver)).not.toContain('peers');
  });

  it('pushes contributions when a thing arrives in the giver\'s environment', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    const loc = makeStuff(() => new Location());
    ContainmentApi.move(giver, loc);
    expect(bucketsOf(giver)).not.toContain('peers');

    const envThing = makeStuff(() => new EnvProvider());
    ContainmentApi.move(envThing, loc);

    expect(bucketsOf(giver)).toContain('peers');
  });

  it('pops contributions when a thing leaves the giver\'s environment', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    const loc = makeStuff(() => new Location());
    ContainmentApi.move(giver, loc);
    const envThing = makeStuff(() => new EnvProvider());
    ContainmentApi.move(envThing, loc);
    expect(bucketsOf(giver)).toContain('peers');

    ContainmentApi.move(envThing, null);
    expect(bucketsOf(giver)).not.toContain('peers');
  });

  it('orders contributions newest-first by pushing in chronological order', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    giver.getAvailableCommands(); // seed self
    const loc = makeStuff(() => new Location());
    const envThing = makeStuff(() => new EnvProvider());
    ContainmentApi.move(envThing, loc);
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => new InvProvider());
    ContainmentApi.move(item, giver as unknown as Parameters<typeof ContainmentApi.move>[1]);

    // Verify the stack is sorted by seq (each push gets a higher seq).
    const seqs = stackOf(giver).map((e) => e.seq);
    for (let i = 1; i < seqs.length; i++) {
      expect(seqs[i]).toBeGreaterThan(seqs[i - 1]!);
    }

    // Walking newest-first should put the held item's `environment`
    // entry before the room's `peers` entry before `self`.
    const walkedBuckets = stackOf(giver)
      .slice()
      .reverse()
      .map((e) => e.bucket);
    expect(walkedBuckets[0]).toBe('environment');
    expect(walkedBuckets[walkedBuckets.length - 1]).toBe('self');
  });

  it('returns "unknown-verb" envelope when the verb is not on the stack at all', async () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver;
    ContainmentApi.move(giver, makeStuff(() => new Location()));
    await (giver as unknown as CommandGiver).executeCommand('gibberishverb');
    expect(giver.envelopes).toHaveLength(1);
    const env = giver.envelopes[0] as import('@saxonberg/types').DispatchResponseEnvelope;
    expect(env.outcome.status).toBe('declined');
    expect(env.outcome.notes).toContainEqual(
      expect.objectContaining({
        kind: 'command-rejected',
        reason: 'unknown-verb',
      }),
    );
  });

  it('Pipe NYI surfaces a friendly envelope on the actor', async () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver;
    const loc = makeStuff(() => new Location());
    ContainmentApi.move(giver, loc);
    await (giver as unknown as CommandGiver).executeCommand('ping | ping');
    expect(giver.envelopes).toHaveLength(1);
    const env = giver.envelopes[0] as import('@saxonberg/types').DispatchResponseEnvelope;
    expect(env.outcome.status).toBe('declined');
    expect(env.outcome.notes).toContainEqual(
      expect.objectContaining({
        kind: 'command-rejected',
        reason: 'parse-failed',
      }),
    );
  });
});

describe('affordance reach — recursion and adjacency', () => {
  beforeEach(() => {
    CommandApi.clearCache();
  });

  /**
   * THE CASE THE RECURSION EXISTS FOR. MQL targets through nesting
   * unconditionally, so a rock inside a bag inside your pack can be
   * NAMED by a command. Before the directional rename its verb never
   * reached you — it worked only because the bag was Tangible too and
   * afforded the same verb itself. The bag here affords NOTHING, so
   * this fails the moment the walk stops being recursive.
   */
  it('a provider nested TWO containers deep still grants outward', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    giver.getAvailableCommands(); // seed self

    const pack = makeStuff(() => new Bag());
    const inner = makeStuff(() => new Bag());
    const item = makeStuff(() => new InvProvider());

    ContainmentApi.move(pack, giver as never);
    ContainmentApi.move(inner, pack as never);
    ContainmentApi.move(item, inner as never);

    const fromItem = stackOf(giver).filter((e) => e.source === (item as never));
    expect(fromItem.map((e) => e.bucket)).toContain('environment');
  });

  it('and loses it again when the whole subtree leaves', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    giver.getAvailableCommands();
    const loc2 = makeStuff(() => new Location());

    const pack = makeStuff(() => new Bag());
    const item = makeStuff(() => new InvProvider());
    ContainmentApi.move(pack, giver as never);
    ContainmentApi.move(item, pack as never);
    expect(
      stackOf(giver).some((e) => e.source === (item as never)),
    ).toBe(true);

    // Move the PACK out — the item never moved itself.
    ContainmentApi.move(pack, loc2 as never);
    expect(
      stackOf(giver).some((e) => e.source === (item as never)),
    ).toBe(false);
  });
});

describe('affordance reach — peers one hop away', () => {
  beforeEach(() => {
    CommandApi.clearCache();
  });

  function twoRooms() {
    const zone = makeStuff(() => new CartesianZone());
    const here = makeStuff(() => new CartesianLocation());
    const there = makeStuff(() => new CartesianLocation());
    zone.addLocation(here, 0, 0, 0);
    zone.addLocation(there, 0, 1, 0);
    return { here, there };
  }

  it('a peer provider NEXT DOOR reaches you through an open exit', async () => {
    const { here, there } = twoRooms();
    const exit = makeStuff(
      () => new Exit({ direction: 'north', source: here, destination: there }),
    );
    await here.addExit(exit);

    // The provider is already next door; the giver walks in after.
    const provider = makeStuff(() => new EnvProvider());
    ContainmentApi.move(provider, there as never);

    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    ContainmentApi.move(giver, here as never);
    giver.getAvailableCommands();

    expect(
      stackOf(giver).some(
        (e) => e.source === (provider as never) && e.bucket === 'peers',
      ),
    ).toBe(true);
  });

  /**
   * A closed door is a closed door. A verb lighting up through one would
   * claim a reach the world does not have — and this is the assertion
   * that was previously only true because I had read the code.
   */
  it('a CLOSED door stops it', async () => {
    const { here, there } = twoRooms();
    const door = makeStuff(() => new Door());
    door.setOpen(false);
    const exit = makeStuff(
      () =>
        new Exit({
          direction: 'north',
          source: here,
          destination: there,
          door,
        }),
    );
    await here.addExit(exit);

    const provider = makeStuff(() => new EnvProvider());
    ContainmentApi.move(provider, there as never);

    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    ContainmentApi.move(giver, here as never);
    giver.getAvailableCommands();

    expect(
      stackOf(giver).some((e) => e.source === (provider as never)),
    ).toBe(false);
  });

  it('and an exit with no loaded destination is simply skipped, not thrown', async () => {
    // `getDestination()` THROWS on an unresolved zone; affordance
    // redistribution must never force world-loading from a containment
    // delta. This is the bug that took out 18 sandbox tests.
    const { here } = twoRooms();
    const dangling = makeStuff(
      () => new Exit({ direction: 'north', source: here, destinationPath: '/nowhere/at/all' }),
    );
    await here.addExit(dangling);

    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    expect(() => ContainmentApi.move(giver, here as never)).not.toThrow();
  });
});

/**
 * THE SHIPPED MIXIN, not a synthetic provider.
 *
 * `TangibleMixin` is what puts `throw` in front of a player, and its
 * two buckets are the whole reason a rock works the way the design
 * wants: `environment` so the thing in your hand offers the verb
 * outward, `peers` so the thing at your feet offers it sideways.
 *
 * Pinned against the real mixin because the earlier claim that a
 * grounded item afforded `throw` was justified by watching a
 * controller run — which proves DISPATCH, not a fresh affordance. A
 * stale un-popped stack entry looks exactly the same from a client.
 */
describe('TangibleMixin affords throw where the design says it should', () => {
  beforeEach(() => {
    CommandApi.clearCache();
  });

  const RockBase = TangibleMixin(ContainableMixin(Idea));
  class Rock extends RockBase {}

  it('a rock ON THE GROUND offers `throw` to everyone in the room', () => {
    const room = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    ContainmentApi.move(giver, room as never);
    giver.getAvailableCommands();

    const rock = makeStuff(() => new Rock());
    ContainmentApi.move(rock, room as never);

    const fromRock = stackOf(giver).filter((e) => e.source === (rock as never));
    expect(fromRock.map((e) => e.bucket)).toContain('peers');
  });

  it('a rock IN YOUR HAND offers it outward instead', () => {
    const room = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    ContainmentApi.move(giver, room as never);
    giver.getAvailableCommands();

    const rock = makeStuff(() => new Rock());
    ContainmentApi.move(rock, giver as never);

    const fromRock = stackOf(giver).filter((e) => e.source === (rock as never));
    expect(fromRock.map((e) => e.bucket)).toContain('environment');
  });

  it('and takes it away when the rock is carried out of the room', () => {
    const room = makeStuff(() => new Location());
    const elsewhere = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    ContainmentApi.move(giver, room as never);
    giver.getAvailableCommands();

    const rock = makeStuff(() => new Rock());
    ContainmentApi.move(rock, room as never);
    expect(stackOf(giver).some((e) => e.source === (rock as never))).toBe(true);

    ContainmentApi.move(rock, elsewhere as never);
    expect(stackOf(giver).some((e) => e.source === (rock as never))).toBe(false);
  });
});
