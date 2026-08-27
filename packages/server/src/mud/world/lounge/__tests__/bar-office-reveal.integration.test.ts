/**
 * Bar office reveal (concealment-detection Phase 3) — the real-content
 * acceptance: the `bar → office` north exit (authored `concealment: hidden`
 * + a hint, closing the documented dead-end) is ABSENT from a fresh
 * arrival's obvious exits and unwalkable by name, until they `search` the
 * bar and DISCOVER it — after which `go north` works.
 *
 * Stands up the real `Bar` singleton (with the seed's concealed north exit)
 * over an in-memory store, and drives the real `SearchController` +
 * `GoController`.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SearchController from '../../../platform/idea/cmd/perception/SearchController';
import GoController from '../../../platform/idea/cmd/movement/GoController';
import Bar from '../location/Bar';
import CartesianLocation from '../../../lib/location/CartesianLocation';
import Exit from '../../../lib/boundary/Exit';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { PerceptionApi } from '../../../api/perception';
import { MessageApi } from '../../../api/message';
import { SchedulerApi } from '../../../api/scheduler';
import { WorldClockApi } from '../../../api/worldclock';
import { EventApi } from '../../../api/event';
import EventRegistry from '../../../platform/idea/EventRegistry';
import { MqlApi, type MqlOneResult } from '../../../api/mql';
import {
  PersistenceManager,
  Collections,
} from '../../../../backend/PersistenceManager';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../api/command';
import { CommandDefinition } from '../../../lib/command/CommandDefinition';
import { Stuff } from '../../../lib/stuff/Stuff';
import { Idea } from '../../../lib/stuff/Idea';
import type Interactive from '../../../platform/idea/Interactive';
import type Location from '../../../lib/stuff/Location';
import { CommandGiverMixin } from '../../../lib/command/CommandGiver';
import { NamedMixin } from '../../../lib/description/Named';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import { SensorMixin } from '../../../lib/message/Sensor';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { EngagedMixin } from '../../../lib/activity/Engaged';
import { BeliefStoreMixin } from '../../../lib/belief/BeliefStore';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

const PH = '/platform/idea/persistence/PersistentHydrator';
const HINT = 'a hairline seam and a thread of cool air from the north wall';

class Patron extends BeliefStoreMixin(
  EngagedMixin(
    CommandGiverMixin(
      NamedMixin(MobileMixin(SensorMixin(ContainableMixin(Idea)))),
    ),
  ),
) {
  protected override handleMessage(): void {}
  protected override handleEnvelope(): void {}
}

/** Minimal in-memory store: the bar (with its concealed north exit) + office. */
function installStore(): void {
  const docs: Array<Record<string, unknown> & { path: string }> = [
    { path: PH, class: PH, data: {} },
    {
      path: '/world/lounge/location/bar',
      class: '/world/lounge/location/Bar',
      hydratorClass: PH,
      data: {
        shortDescription: "Dave's Bar",
        primaryKeyword: 'bar',
        exits: {
          north: {
            destination: '/world/lounge/location/office',
            concealment: 'hidden',
            hint: HINT,
            bidirectional: false,
          },
        },
      },
    },
    {
      path: '/world/lounge/location/office',
      class: '/platform/location/Room',
      hydratorClass: PH,
      data: { shortDescription: "Dave's office", primaryKeyword: 'office' },
    },
    // The default locomotion mode so `go north` (defaultModeFor → walk) can
    // clone its mode singleton.
    {
      path: '/platform/idea/LocomotionMode/walk',
      class: '/platform/idea/LocomotionMode',
      hydratorClass: PH,
      data: {
        name: 'walk',
        speed: 1.0,
        noiseLevel: 'normal',
        bodyProfile: 'upright',
        groundContact: 'full',
        requiresBodyPlanMode: [],
        requiresPosture: [],
        costMultiplier: 1.0,
        passthrough: false,
        conveyanceMixin: null,
        enablementMixin: null,
        medium: 'ground',
      },
    },
  ];
  const store = docs.map((d, i) => ({ _id: String(i + 1), ...d }));
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save: vi.fn(async () => '1'),
    find: vi.fn(async (collection: string, query: Record<string, unknown>) => {
      if (collection !== Collections.Content) return [];
      if (typeof query.path === 'string') {
        return store.filter((d) => d.path === query.path);
      }
      return store.slice();
    }),
    findById: vi.fn(async (_c: string, id: string) =>
      store.find((d) => d._id === id) ?? null,
    ),
  } as unknown as PersistenceManager);
}

function stub(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function ctx(actor: Patron, location: Location, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    interactive: {} as Interactive,
    location: location as never,
    commandText: verb,
    executionId: 'test',
    commandId: 'test',
    verb,
    command: stub(verb),
  });
}

function resolveTarget(giver: Patron, raw: string): MqlOneResult {
  const r = MqlApi.resolveOne(raw, {
    commandGiver: giver as never,
    scope: 'reachable',
  });
  const bound: MqlOneResult = { stuff: r.stuff, raw };
  if (r.via) bound.via = r.via;
  return bound;
}

describe('bar office reveal — search unlocks the concealed north exit', () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    installStore();
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    WorldClockApi._setNowProviderForTesting(() => 1000);
    SchedulerApi._clearAllForTesting();
    const reg = await StuffApi.create(() => {
      const r = new EventRegistry();
      Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
      return r;
    });
    StuffApi.unregister(reg);
    StuffApi.register(reg);
    EventApi._setRegistryForTesting(reg);
    // A fully-chainable scene stub (every builder method returns the stub;
    // `send` terminates) — we assert world state, not frames.
    const scene: Record<string, unknown> = {};
    for (const m of ['topic', 'toSelf', 'toPeers', 'to', 'send']) {
      scene[m] = () => scene;
    }
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => scene as never);
  });

  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('the seed authors a concealed north exit with a hint', async () => {
    const bar = await StuffApi.singleton<Bar>('/world/lounge/location/bar');
    const north = bar.getExit('north');
    expect(north).toBeInstanceOf(Exit);
    expect(north!.isConcealed()).toBe(true);
    expect(north!.isHidden()).toBe(true); // dropped from getObviousExits
    expect(north!.getConcealmentHint()).toBe(HINT);
    // Still excluded from the viewer-blind obvious list (physics walks).
    expect(bar.getObviousExits()).not.toContain(north);
  });

  it('search reveals the office exit, and go north then works', async () => {
    const bar = await StuffApi.singleton<Bar>('/world/lounge/location/bar');
    const north = bar.getExit('north')!;
    const patron = makeStuff(() => new Patron());
    patron.setName('Patron');
    ContainmentApi.move(patron as never, bar as never);

    // Before: the concealed exit is absent from the patron's world, and
    // `north` doesn't resolve as a walkable target.
    expect(bar.obviousExitsFor(patron as never)).not.toContain(north);
    expect(PerceptionApi.perceives(patron as never, north as never)).toBe(
      false,
    );
    expect(resolveTarget(patron, 'north').stuff).toBeNull();

    // Search the bar → the broad scan discovers the concealed north exit.
    const searchC = makeStuff(() => new SearchController());
    await searchC.execute({} as CommandModel, ctx(patron, bar as never, 'search'));
    WorldClockApi._advanceForTesting(6000);
    await new Promise((r) => setTimeout(r, 0));

    expect(PerceptionApi.hasDiscovered(patron as never, north as never)).toBe(
      true,
    );
    // After: the exit is now in the patron's obvious exits + reachable scope.
    expect(bar.obviousExitsFor(patron as never)).toContain(north);
    expect(resolveTarget(patron, 'north').stuff).not.toBeNull();

    // `go north` succeeds — the patron ends up in the office.
    const office = await StuffApi.singleton<CartesianLocation>(
      '/world/lounge/location/office',
    );
    const goC = makeStuff(() => new GoController());
    await goC.execute(
      { target: resolveTarget(patron, 'north') } as CommandModel,
      ctx(patron, bar as never, 'go'),
    );
    expect(
      (patron as unknown as { getContainer(): unknown }).getContainer(),
    ).toBe(office);
  });
});
