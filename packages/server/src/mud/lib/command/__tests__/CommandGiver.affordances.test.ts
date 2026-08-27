/**
 * Affordance-attribution accessor tests.
 *
 * `getAffordances()` is the source-preserving sibling of
 * `getAvailableCommands()`: the same newest-first recency walk, but each
 * command paired with its resolved affording `source` (the giver itself
 * for innate `'self'` entries, the granting item otherwise) and its
 * `bucket`. `getAvailableCommands()` is its flattened projection.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Idea } from '../../stuff/Idea';
import {
  CommandGiverMixin,
  type CommandGiver,
} from '../CommandGiver';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { SensorMixin } from '../../message/Sensor';
import { ContainmentApi } from '../../../api/containment';
import { CommandApi } from '../../../api/command';
import { makeStuff } from '../../security/__tests__/test-setup';
import {
  PersistenceManager,
  Collections,
} from '../../../../backend/PersistenceManager';

const TestGiverBase = CommandGiverMixin(
  SensorMixin(ContainerMixin(ContainableMixin(Idea)))
);

class TestGiver extends TestGiverBase {
  static override commandContributions = {
      peers: [],
    self: ['platform/cmd/system/ping.yaml'],
    environment: [],
  };
  protected override handleMessage(_frame: unknown): void {
    // discard
  }
}

const InvProviderBase = ContainableMixin(Idea);
class InvProvider extends InvProviderBase {
  static commandContributions = {
      peers: [],
    self: [],
    environment: ['platform/cmd/system/ping.yaml'],
  };
}

type Giver = TestGiver & CommandGiver;

function moveInto(item: unknown, giver: Giver): void {
  ContainmentApi.move(
    item as Parameters<typeof ContainmentApi.move>[0],
    giver as unknown as Parameters<typeof ContainmentApi.move>[1]
  );
}

describe('CommandGiverMixin.getAffordances', () => {
  beforeEach(() => {
    CommandApi.clearCache();
    const find = vi.fn(
      async (collection: string, query: Record<string, unknown>) => {
        if (
          collection === Collections.Content &&
          query.path === '/platform/idea/cmd/system/PingController'
        ) {
          return [
            {
              path: '/platform/idea/cmd/system/PingController',
              class: '/platform/idea/cmd/system/PingController',
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

  it('returns records pairing each command with a source and bucket', () => {
    const giver = makeStuff(() => new TestGiver()) as Giver;
    const affs = giver.getAffordances();
    expect(affs.length).toBeGreaterThan(0);
    for (const a of affs) {
      expect(a.command.getPrimaryVerb()).toBeTruthy();
      expect(a.source).toBeTruthy();
      expect(['self', 'inventory', 'environment', 'peers']).toContain(a.bucket);
    }
  });

  it('resolves the self sentinel to the giver instance (never the string)', () => {
    const giver = makeStuff(() => new TestGiver()) as Giver;
    const affs = giver.getAffordances();
    // A freshly-seeded giver has only its own self contributions.
    expect(affs.every((a) => a.bucket === 'self')).toBe(true);
    for (const a of affs) {
      expect(a.source).toBe(giver);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(a.source as any).not.toBe('self');
    }
  });

  it('attributes a held item\'s command to the granting item', () => {
    const giver = makeStuff(() => new TestGiver()) as Giver;
    giver.getAffordances(); // seed self
    const item = makeStuff(() => new InvProvider());
    moveInto(item, giver);

    const affs = giver.getAffordances();
    // A held item grants OUTWARD to its holder — the `environment`
    // bucket under the directional model, not `inventory` (which now
    // means "to what is inside me").
    const invAff = affs.find((a) => a.bucket === 'environment');
    expect(invAff).toBeDefined();
    expect(invAff!.source).toBe(item);
    expect(invAff!.command.hasVerb('ping')).toBe(true);
  });

  it('getAvailableCommands is exactly the affordance projection', () => {
    const giver = makeStuff(() => new TestGiver()) as Giver;
    const item = makeStuff(() => new InvProvider());
    moveInto(item, giver);

    expect(giver.getAvailableCommands()).toEqual(
      giver.getAffordances().map((a) => a.command)
    );
  });
});
