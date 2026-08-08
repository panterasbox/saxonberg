/**
 * Active `search` (Phase 3, D5) — the player-facing detection loop.
 *
 * Two layers:
 *   1. `PerceptionApi.resolveSearch` — the pure resolver: a broad search
 *      discovers a concealed thing in scope; narrow-deep (a depth bonus)
 *      finds what broad misses; competence grades the outcome (a higher
 *      `awareness` band finds more, deterministically).
 *   2. The `SearchController` + `SearchActivity` — the costed act: it holds
 *      the `hands` slot for the search window and resolves at completion, so
 *      an abort mid-rummage (the ambush) finds nothing.
 *
 * Dials are the seeded-literal fallbacks (searchBonus 4, searchDepthBonus 3;
 * levels subtle 2 / hidden 4 / deep 7 / buried 11; capacityPerBand 3).
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SearchController from '../SearchController';
import { PerceptionApi } from '../../../../api/perception';
import { AdvancementApi } from '../../../../api/advancement';
import { MessageApi } from '../../../../api/message';
import { SchedulerApi } from '../../../../api/scheduler';
import { WorldClockApi } from '../../../../api/worldclock';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { EventApi } from '../../../../api/event';
import EventRegistry from '../../../EventRegistry';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../../api/command';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../lib/stuff/Idea';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ConcealableMixin } from '../../../../lib/concealment/Concealable';
import { VisibleMixin } from '../../../../lib/description/Visible';
import { NamedMixin } from '../../../../lib/description/Named';
import { PerceptibleMixin } from '../../../../lib/description/Perceptible';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { EngagedMixin } from '../../../../lib/activity/Engaged';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { BeliefStoreMixin } from '../../../../lib/belief/BeliefStore';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

// A plain seeker for the pure `resolveSearch` layer (belief store only).
class Seeker extends BeliefStoreMixin(Idea) {}

// A concealable perceivable.
class Item extends ConcealableMixin(
  ContainableMixin(VisibleMixin(NamedMixin(PerceptibleMixin(Idea)))),
) {}

let counter = 0;
function makeItem(level: 'subtle' | 'hidden' | 'deep' | 'buried'): Item {
  const it = makeStuffAtPath(
    () => new Item(),
    `/obj/test/search-item-${counter++}`,
  );
  it.setName(`item${counter}`);
  it.setShortDescription(`item${counter}`);
  it.setConcealment(level);
  return it;
}

describe('PerceptionApi.resolveSearch — the pure resolver', () => {
  beforeEach(() => StuffApi.clearAll());

  it('a broad search discovers a concealed thing in scope', () => {
    const viewer = makeStuff(() => new Seeker());
    const hidden = makeItem('hidden'); // req 4; searchBonus 4 → eff 4 ≥ 4
    expect(PerceptionApi.perceives(viewer as never, hidden as never)).toBe(
      false,
    );
    const found = PerceptionApi.resolveSearch(
      viewer as never,
      [hidden as never],
      'broad',
    );
    expect(found.map((s) => s.stuffId)).toContain(hidden.stuffId);
    expect(PerceptionApi.hasDiscovered(viewer as never, hidden as never)).toBe(
      true,
    );
    expect(PerceptionApi.perceives(viewer as never, hidden as never)).toBe(true);
  });

  it('narrow-deep finds what broad-shallow misses (the depth bonus)', () => {
    const deep1 = makeItem('deep'); // req 7
    const deep2 = makeItem('deep'); // req 7
    const broadViewer = makeStuff(() => new Seeker());
    const narrowViewer = makeStuff(() => new Seeker());

    // Broad: cap 0 + searchBonus 4 = 4 < 7 → misses.
    expect(
      PerceptionApi.resolveSearch(broadViewer as never, [deep1 as never], 'broad'),
    ).toHaveLength(0);
    // Narrow: cap 0 + searchBonus 4 + depthBonus 3 = 7 ≥ 7 → finds.
    expect(
      PerceptionApi.resolveSearch(
        narrowViewer as never,
        [deep2 as never],
        'narrow',
      ).map((s) => s.stuffId),
    ).toContain(deep2.stuffId);
  });

  it('competence grades the outcome — a higher awareness band finds more', async () => {
    const low = makeStuff(() => new Seeker());
    const high = makeStuff(() => new Seeker());
    const deepLow = makeItem('deep'); // req 7
    const deepHigh = makeItem('deep'); // req 7

    // Warm bands: low = untrained (rank 0), high = competent (rank 2).
    vi.spyOn(AdvancementApi, 'bandFor').mockImplementation(
      async (owner: Stuff) =>
        (owner as Stuff).stuffId === high.stuffId ? 'competent' : 'untrained',
    );
    await PerceptionApi.preloadForSenseGate(low as never);
    await PerceptionApi.preloadForSenseGate(high as never);

    // Low: cap 0 + 4 = 4 < 7 → misses. High: cap 6 + 4 = 10 ≥ 7 → finds.
    expect(
      PerceptionApi.resolveSearch(low as never, [deepLow as never], 'broad'),
    ).toHaveLength(0);
    expect(
      PerceptionApi.resolveSearch(high as never, [deepHigh as never], 'broad').map(
        (s) => s.stuffId,
      ),
    ).toContain(deepHigh.stuffId);
    vi.restoreAllMocks();
  });
});

// ── The costed activity — interruptibility through the real scheduler ──

class Room extends ContainerMixin(ContainableMixin(Idea)) {}
class Searcher extends BeliefStoreMixin(
  EngagedMixin(
    CommandGiverMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea)))),
  ),
) {
  protected handleMessage(): void {}
  protected handleEnvelope(): void {}
}

function noopCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [search]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

describe('SearchController + SearchActivity — costed & interruptible', () => {
  let room: Room;
  let actor: Searcher;
  let hidden: Item;

  beforeEach(async () => {
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    WorldClockApi._setNowProviderForTesting(() => 1000);
    SchedulerApi._clearAllForTesting();
    StuffApi.clearAll();
    // The scheduler subscribes to StuffDestructed on start → EventRegistry.
    const reg = await StuffApi.create(() => {
      const r = new EventRegistry();
      Stuff._stampTemplatePath(r, '/obj/EventRegistry');
      return r;
    });
    StuffApi.unregister(reg);
    StuffApi.register(reg);
    EventApi._setRegistryForTesting(reg);
    // Silence message routing — we assert discovery state, not frames.
    vi.spyOn(MessageApi, 'scene').mockImplementation(
      () =>
        ({
          topic: () => ({
            toSelf: () => ({
              toPeers: () => ({ send: () => undefined }),
              send: () => undefined,
            }),
          }),
        }) as never,
    );

    room = makeStuff(() => new Room());
    actor = makeStuff(() => new Searcher());
    ContainmentApi.move(actor as never, room as never);
    hidden = makeItem('hidden'); // req 4 — reachable by a bare search
    ContainmentApi.move(hidden as never, room as never);
  });

  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  function ctx(): CommandContext {
    return CommandApi.createCommandContext({
      commandGiver: actor as never,
      location: room as never,
      commandText: 'search',
      executionId: 'test',
      commandId: 'test',
      verb: 'search',
      command: noopCommand(),
    });
  }

  it('a completed broad search discovers the concealed thing', async () => {
    const controller = makeStuff(() => new SearchController());
    await controller.execute({} as CommandModel, ctx());
    // Not yet — the effect lands at completion, not dispatch.
    expect(PerceptionApi.hasDiscovered(actor as never, hidden as never)).toBe(
      false,
    );
    WorldClockApi._advanceForTesting(6000); // past searchSeconds (4s)
    await new Promise((r) => setTimeout(r, 0));
    expect(PerceptionApi.hasDiscovered(actor as never, hidden as never)).toBe(
      true,
    );
  });

  it('an interrupted search finds nothing (ambushed mid-rummage)', async () => {
    const controller = makeStuff(() => new SearchController());
    await controller.execute({} as CommandModel, ctx());
    expect(PerceptionApi.hasDiscovered(actor as never, hidden as never)).toBe(
      false,
    );
    // Barge-in before the timer completes.
    SchedulerApi.cancelAll(actor as never);
    WorldClockApi._advanceForTesting(6000);
    await new Promise((r) => setTimeout(r, 0));
    // onComplete never ran → the secret stays undiscovered.
    expect(PerceptionApi.hasDiscovered(actor as never, hidden as never)).toBe(
      false,
    );
  });
});
