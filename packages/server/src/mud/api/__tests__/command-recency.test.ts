/**
 * Recency-stack and chain-of-responsibility dispatch tests.
 *
 * Tests count stack ENTRIES rather than CommandDefinition[] length:
 * the framework mixins (Container, Sensor, …) contribute their own
 * commands at construction time, so totals depend on what's
 * composed. Entry counts factor those out.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Idea } from '../../lib/stuff/Idea';
import Location from '../../lib/stuff/Location';
import {
  CommandGiverMixin,
  type CommandGiver,
  type RecencyEntry,
} from '../../lib/command/CommandGiver';
import { ContainableMixin } from '../../lib/spatial/Containable';
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
    self: ['ping.yaml'],
    environment: [],
    inventory: [],
    peers: [],
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
    self: [],
    environment: [],
    inventory: ['ping.yaml'],
    peers: [],
  };
}

const EnvProviderBase = ContainableMixin(Idea);
class EnvProvider extends EnvProviderBase {
  static commandContributions = {
    self: [],
    environment: ['ping.yaml'],
    inventory: [],
    peers: [],
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
          collection === Collections.Domain &&
          query.path === '/obj/command/PingController'
        ) {
          return [
            {
              path: '/obj/command/PingController',
              class: '/obj/command/PingController',
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

  it('pushes inventory contributions on ContainmentApi.move into the giver', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    giver.getAvailableCommands(); // seed self
    const baseLen = stackOf(giver).length;

    const item = makeStuff(() => new InvProvider());
    ContainmentApi.move(item, giver as unknown as Parameters<typeof ContainmentApi.move>[1]);

    expect(stackOf(giver)).toHaveLength(baseLen + 1);
    expect(stackOf(giver)[baseLen]?.bucket).toBe('inventory');
  });

  it('pops inventory contributions on ContainmentApi.move out of the giver', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    giver.getAvailableCommands();
    const item = makeStuff(() => new InvProvider());
    ContainmentApi.move(item, giver as unknown as Parameters<typeof ContainmentApi.move>[1]);
    const beforePop = stackOf(giver).length;

    ContainmentApi.move(item, null);

    expect(stackOf(giver)).toHaveLength(beforePop - 1);
    expect(bucketsOf(giver)).not.toContain('inventory');
  });

  it('pushes environment contributions when a giver enters a Location with content', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    const loc = makeStuff(() => new Location());
    const envThing = makeStuff(() => new EnvProvider());
    ContainmentApi.move(envThing, loc);

    ContainmentApi.move(giver, loc);

    // Self entry seeded by getAvailableCommands OR by self-move
    // logic; either way the env entry must be present too.
    giver.getAvailableCommands();
    expect(bucketsOf(giver)).toContain('environment');
  });

  it('pops environment contributions when a giver leaves a Location', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    const loc = makeStuff(() => new Location());
    const envThing = makeStuff(() => new EnvProvider());
    ContainmentApi.move(envThing, loc);
    ContainmentApi.move(giver, loc);
    expect(bucketsOf(giver)).toContain('environment');

    const otherLoc = makeStuff(() => new Location());
    ContainmentApi.move(giver, otherLoc);

    expect(bucketsOf(giver)).not.toContain('environment');
  });

  it('pushes contributions when a thing arrives in the giver\'s environment', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    const loc = makeStuff(() => new Location());
    ContainmentApi.move(giver, loc);
    expect(bucketsOf(giver)).not.toContain('environment');

    const envThing = makeStuff(() => new EnvProvider());
    ContainmentApi.move(envThing, loc);

    expect(bucketsOf(giver)).toContain('environment');
  });

  it('pops contributions when a thing leaves the giver\'s environment', () => {
    const giver = makeStuff(() => new TestGiver()) as TestGiver & CommandGiver;
    const loc = makeStuff(() => new Location());
    ContainmentApi.move(giver, loc);
    const envThing = makeStuff(() => new EnvProvider());
    ContainmentApi.move(envThing, loc);
    expect(bucketsOf(giver)).toContain('environment');

    ContainmentApi.move(envThing, null);
    expect(bucketsOf(giver)).not.toContain('environment');
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

    // Walking newest-first should put inventory before environment
    // before self.
    const walkedBuckets = stackOf(giver)
      .slice()
      .reverse()
      .map((e) => e.bucket);
    expect(walkedBuckets[0]).toBe('inventory');
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
