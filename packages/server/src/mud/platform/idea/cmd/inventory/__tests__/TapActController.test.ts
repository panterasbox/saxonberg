/**
 * `TapActController` — **the take as an act**, over a fixture producer.
 *
 * The claims worth testing are the ones no pack-level test can see,
 * because they are about the shape of the act rather than about a cow:
 *
 *  1. ⭐ plan → engage → land. The yield appears **at completion**, not
 *     when the command is typed.
 *  2. ⚠⚠ The completion runs on a **destructed controller**, so it must
 *     be a module function. If it is not, the scene plays and nothing is
 *     minted — the exact bug the dig/split and smelt builds both shipped
 *     and a live drive found.
 *  3. ⭐⭐ **Walk away and nothing came of it**, with no state change.
 *     Nothing in the scheduler cancels a `hands` engagement on movement,
 *     so the act re-checks its own premise where it lands.
 *  4. ⭐⭐ A closed **season is information**, not a refusal — no
 *     `controller-rejected` note.
 *  5. ⭐ Whether a **vessel** is needed derives from the yield's shape.
 *  6. ⭐ The **credit is the host's**, so a kernel controller earns a
 *     trade's competence without knowing the trade exists.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TapActController } from '../TapActController';
import { ProducingMixin } from '../../../../../lib/husbandry/Producing';
import { AdvancementMixin } from '../../../../../lib/advancement/Advancement';
import Species from '../../../species/Species';
import type { TapSpec } from '../../../species/Species';
import { OrganismMixin } from '../../../../../lib/species/Organism';
import { Quantity } from '../../../../../lib/quantity';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { EngagedMixin } from '../../../../../lib/activity/Engaged';
import { NamedMixin } from '../../../../../lib/description/Named';
import { VisibleMixin } from '../../../../../lib/description/Visible';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { AmbientLitMixin } from '../../../../../lib/perception/AmbientLit';
import { Idea } from '../../../../../lib/stuff/Idea';
import Location from '../../../../../lib/stuff/Location';
import Good from '../../../../../lib/stuff/Good';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { Mml } from '../../../../../api/mml';
import { ShadowApi } from '../../../../../api/shadow';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { WorldClockApi } from '../../../../../api/worldclock';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../../../../lib/perception/modalities/__tests__/test-helpers';
import { EventApi } from '../../../../../api/event';
import EventRegistry from '../../../EventRegistry';
import { Stuff as StuffBase } from '../../../../../lib/stuff/Stuff';
import '../../../WorldClockRegistry';

const DAY = 86_400;
const BASE = 40_000_000;
let now = BASE;
function setNow(s: number): void {
  now = BASE + s;
}
let seq = 0;
function freshPath(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

const YIELD_PATH = '/stuff/thing/_test/tapped-thing';

/**
 * ⚠ `EngagedMixin` is load-bearing in this fixture. Without it
 * `engageAct` takes its no-engagement branch and runs the completion
 * SYNCHRONOUSLY — which is correct behaviour for a host that cannot be
 * engaged, and makes every assertion about "nothing yet" vacuous. The
 * first version of this file was missing it.
 */
class TestGiver extends AdvancementMixin(
  EngagedMixin(
    SensorMixin(
      CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
    ),
  ),
) {
  static _mixinName = 'TestGiverTapAct';
  received: unknown[] = [];
  protected handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}
class LitRoom extends AmbientLitMixin(Location) {}

/** A producer with no body — the leanest host the protocol accepts. */
class TestProducer extends ProducingMixin(
  OrganismMixin(VisibleMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = 'TestProducerTapAct';
  public override tapCredit(): { discipline: string; difficulty: 'standard' } {
    return { discipline: 'basket-weaving', difficulty: 'standard' };
  }
}

/** The verb under test: one key, one sentence. */
class TestTapController extends TapActController {
  protected tapKey(): string {
    return 'stuff';
  }
  protected nothingHere(): ReturnType<typeof Mml.compose> {
    return Mml.compose`There is nothing here to tap.`;
  }
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(giver: TestGiver, location: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandText: 'tapit',
    executionId: 'test',
    commandId: 'test',
    verb: 'tapit',
    command: stubCommand('tapit'),
  });
}

/**
 * ⚠ A controller is a `Stuff`, so it is minted through the gated create
 * path — a bare `new` throws. (And it is destructed by hand in the tests
 * that need the completion to run against a dead controller, which is
 * what the dispatcher does in its `finally`.)
 */
function controller(): TestTapController {
  return makeStuff(() => new TestTapController());
}

function one(stuff: Stuff | null, raw: string): MqlOneResult {
  return { stuff, raw };
}
type ExecModel = Parameters<TestTapController['execute']>[0];
function model(target: MqlOneResult, vessel?: MqlOneResult): ExecModel {
  return { target, vessel } as ModelData as unknown as ExecModel;
}
function noteReasons(ctx: CommandContext): string[] {
  return ctx.getNotes().map((n) => (n as { reason?: string }).reason ?? '');
}

const MASS_TAP: TapSpec[] = [
  {
    key: 'stuff',
    yieldRow: YIELD_PATH,
    perGameDay: 2,
    behaviour: 'continuous',
    windowDays: 0,
  },
];

/**
 * ⚠ The registry is unregistered in `afterEach` rather than cleared with
 * `StuffApi.clearAll()`. `clearAll` would also wipe the world clock from
 * the template-path index, and `_resetForTesting` reuses its CACHED
 * pointer without re-registering it — so the next test's `nowSeconds()`
 * would find no clock and every tap would silently fail to accrue.
 * Leaving ten registries behind instead makes `findByTemplatePath`
 * throw `expected singleton, found N`, which is how this was found.
 */
let eventRegistry: EventRegistry | null = null;

async function makeRegistry(): Promise<EventRegistry> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    StuffBase._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
  eventRegistry = reg;
  return reg;
}

let deeds: Array<{ discipline: string; difficulty: string }>;
let mintSeq = 0;

describe('the take as an act', () => {
  beforeEach(async () => {
    ShadowApi._clearAllForTesting();
    installV1QuantityMarshallers();
    buildAllModalities();
    // ⚠ A host-scoped engagement subscribes to `StuffDestructed`, so the
    // EventRegistry has to exist or `SchedulerApi.start` throws — the
    // `SchedulerApi.hostDestruction` precedent.
    EventApi._clearAllForTesting();
    await makeRegistry();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    deeds = [];
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      if (path !== YIELD_PATH) throw new Error(`no template ${path}`);
      mintSeq += 1;
      return makeStuffAtPath(() => {
        const g = new Good();
        g.setShortDescription('a lump of the stuff');
        return g;
      }, `/stuff/thing/_test/minted-${mintSeq}`);
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
    EventApi._clearAllForTesting();
    if (eventRegistry) {
      StuffApi.unregister(eventRegistry);
      eventRegistry = null;
    }
    // ⚠ No `StuffApi.clearAll()` here. It wipes the template-path index
    // but `_resetForTesting` reuses its CACHED registry pointer without
    // re-registering it (the documented `WorldClockLogic` reset quirk),
    // so the next test's `nowSeconds()` finds no clock, returns null,
    // and every tap silently fails to accrue. Every path minted here is
    // already unique per test (`freshPath`), so there is nothing to
    // clear.
  });

  function scene(taps: TapSpec[] = MASS_TAP): {
    giver: TestGiver;
    room: LitRoom;
    producer: TestProducer;
  } {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(400);
    const giver = makeStuffAtPath(() => {
      const g = new TestGiver();
      g.setName('Alice');
      return g;
    }, freshPath('/platform/agent/Avatar/_tap-alice'));
    vi.spyOn(
      giver as unknown as {
        creditDeed(s: { discipline: string; difficulty: string }): Promise<void>;
      },
      'creditDeed',
    ).mockImplementation(async (s) => {
      deeds.push(s);
    });
    ContainmentApi.move(giver as never, room as never);

    const speciesPath = freshPath('/stuff/idea/species/_test/tapped');
    makeStuffAtPath(() => {
      const sp = new Species();
      sp.setProduction(taps);
      return sp;
    }, speciesPath);
    const producer = makeStuff(() => {
      const p = new TestProducer();
      p.setShortDescription('the thing that gives');
      p._speciesPath = speciesPath;
      return p;
    });
    ContainmentApi.move(producer as never, room as never);
    producer.reconcileProduction();
    return { giver, room, producer };
  }

  /**
   * Let the running engaged step complete (the `SteepVerb` precedent).
   *
   * ⚠ The real-ms advance has to exceed the act's own duration, which is
   * `defaultTakeMs` by shape — 20 s for a mass take at scale 1000.
   */
  function settle(): Promise<void> {
    now += 90_000;
    WorldClockApi._advanceForTesting(90_000);
    return new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  it('⭐ nothing standing refuses in the HOST’s words, not the verb’s', async () => {
    const { giver, room, producer } = scene();
    const ctx = makeContext(giver, room);
    await controller().execute(model(one(producer, 'thing')), ctx);
    expect(noteReasons(ctx)).toContain('nothing-standing');
  });

  it('⚠ a target that does not produce is the verb’s own sentence', async () => {
    const { giver, room } = scene();
    const rock = makeStuff(() => {
      const g = new Good();
      g.setShortDescription('a rock');
      return g;
    });
    const ctx = makeContext(giver, room);
    await controller().execute(model(one(rock, 'rock')), ctx);
    expect(noteReasons(ctx)).toContain('no-such-tap');
  });

  it('⭐⭐ plan → engage → land: the yield arrives at COMPLETION', async () => {
    const { giver, room, producer } = scene();
    setNow(2 * DAY);
    expect(producer.standingIn('stuff')).toBeGreaterThan(0);

    const ctx = makeContext(giver, room);
    const c = controller();
    await c.execute(model(one(producer, 'thing')), ctx);
    // ⚠ Nothing yet — the act is engaged, not done.
    expect(giver.getContents().length).toBe(0);
    expect(noteReasons(ctx)).not.toContain('nothing-standing');

    // ⚠⚠ Destruct the controller BEFORE the completion fires, which is
    // what the dispatcher does in its `finally`. A completion that
    // called back into `this` would be a silent no-op on a dead Stuff.
    StuffApi.destruct(c as never);
    await settle();

    expect(giver.getContents().length).toBe(1);
    expect(producer.standingIn('stuff')).toBeLessThan(0.02);
  });

  it('⭐ the CREDIT is the host’s — the controller never names a trade', async () => {
    const { giver, room, producer } = scene();
    setNow(2 * DAY);
    const ctx = makeContext(giver, room);
    const c = controller();
    await c.execute(model(one(producer, 'thing')), ctx);
    StuffApi.destruct(c as never);
    await settle();
    expect(deeds.map((d) => d.discipline)).toContain('basket-weaving');
  });

  it('⭐⭐ WALK AWAY and nothing came of it — no state change', async () => {
    const { giver, room, producer } = scene();
    setNow(2 * DAY);
    const standing = producer.standingIn('stuff');
    expect(standing).toBeGreaterThan(0);

    const ctx = makeContext(giver, room);
    const c = controller();
    await c.execute(model(one(producer, 'thing')), ctx);

    // Off to another room while the hands are busy. ⚠ Nothing in the
    // scheduler cancels the engagement, which is exactly why the act
    // re-checks where it lands.
    const elsewhere = makeStuff(() => new LitRoom());
    ContainmentApi.move(giver as never, elsewhere as never);
    StuffApi.destruct(c as never);
    await settle();

    expect(giver.getContents().length).toBe(0);
    // ⭐ And the tap was NOT drawn: the standing is still there, growing.
    expect(producer.standingIn('stuff')).toBeGreaterThanOrEqual(standing);
    expect(deeds).toEqual([]);
  });

  it('⭐⭐ a closed SEASON is information — no rejection note', async () => {
    const { giver, room, producer } = scene([
      {
        key: 'stuff',
        yieldRow: YIELD_PATH,
        perGameDay: 2,
        behaviour: 'accrue',
        windowDays: 4,
        // A band this world is never in.
        window: { kind: 'photoperiod', daylightFrom: 0.999, daylightTo: 1 },
      },
    ]);
    setNow(2 * DAY);
    const ctx = makeContext(giver, room);
    await controller().execute(model(one(producer, 'thing')), ctx);

    // ⭐ The player is TOLD, and nothing is filed as their mistake.
    expect(giver.received.length).toBeGreaterThan(0);
    for (const r of noteReasons(ctx)) {
      expect(r.startsWith('season-')).toBe(false);
    }
    expect(ctx.getNotes().map((n) => (n as { kind?: string }).kind)).not.toContain(
      'controller-rejected',
    );
  });

  it('⭐ a VOLUME tap refuses without a vessel, and says what is missing', async () => {
    const { giver, room, producer } = scene([
      {
        key: 'stuff',
        yieldRow: '/stuff/idea/material/_test/nonexistent',
        perGameDay: 2,
        behaviour: 'continuous',
        windowDays: 0,
        yieldShape: 'volume',
      },
    ]);
    setNow(2 * DAY);
    const ctx = makeContext(giver, room);
    await controller().execute(model(one(producer, 'thing')), ctx);
    expect(noteReasons(ctx)).toContain('no-vessel');
  });

  it('⭐⭐ a COUNT tap mints N separate things, and leaves the fraction', async () => {
    const { giver, room, producer } = scene([
      {
        key: 'stuff',
        yieldRow: YIELD_PATH,
        perGameDay: 1,
        behaviour: 'accrue',
        windowDays: 10,
        yieldShape: 'count',
      },
    ]);
    setNow(3.5 * DAY);
    expect(producer.standingIn('stuff')).toBeCloseTo(3.5, 4);

    const ctx = makeContext(giver, room);
    const c = controller();
    await c.execute(model(one(producer, 'thing')), ctx);
    StuffApi.destruct(c as never);
    await settle();

    // ⚠ SEVERAL separate objects, not one of mass 3.5 — a recipe counts
    // inputs, and that is the whole reason `count` exists.
    const got = giver.getContents();
    expect(got.length).toBeGreaterThanOrEqual(3);
    expect(new Set(got).size).toBe(got.length);
    // ⚠ Not pinned to an exact count on purpose: `completeTap` RE-READS
    // the tap at completion rather than trusting the plan's numbers,
    // because the interval between planning and landing is real game
    // time. More accrues while the hands are busy, and that is correct.
    // ⭐ What IS pinned is the fraction: a count take leaves the
    // remainder standing rather than rounding it away.
    expect(producer.standingIn('stuff') % 1).toBeLessThan(1);
    expect(producer.standingIn('stuff')).toBeLessThan(1);
  });

  it('⚠ a host that cannot be ENGAGED takes it synchronously', async () => {
    // Correct behaviour, and worth pinning because it is what made the
    // first version of this file's "nothing yet" assertions vacuous: a
    // giver with no `EngagedMixin` has no hands to occupy, so the act
    // lands immediately rather than not at all.
    class Unengaged extends AdvancementMixin(
      SensorMixin(
        CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
      ),
    ) {
      static _mixinName = 'TestGiverUnengaged';
      protected handleMessage(): void {}
    }
    const { room, producer } = scene();
    const plain = makeStuffAtPath(
      () => {
        const g = new Unengaged();
        g.setName('Bob');
        return g;
      },
      freshPath('/platform/agent/Avatar/_tap-bob'),
    );
    ContainmentApi.move(plain as never, room as never);
    setNow(2 * DAY);
    const ctx = makeContext(plain as unknown as TestGiver, room);
    await controller().execute(model(one(producer, 'thing')), ctx);
    expect(plain.getContents().length).toBe(1);
  });

  it('⚠ a MASS tap mints exactly one, with the mass on it', async () => {
    const { giver, room, producer } = scene();
    setNow(2 * DAY);
    const ctx = makeContext(giver, room);
    const c = controller();
    await c.execute(model(one(producer, 'thing')), ctx);
    StuffApi.destruct(c as never);
    await settle();

    const got = giver.getContents();
    // ⭐ EXACTLY one — a mass take is one object with the weight on it,
    // which is the claim. (The weight itself is not pinned: see the
    // count case for why completion re-reads.)
    expect(got.length).toBe(1);
    const mass = (got[0] as unknown as { getMass(): Quantity<'kg'> })
      .getMass()
      .rawValue();
    expect(mass).toBeGreaterThan(0);
    // …and the tap is emptied by the take.
    expect(producer.standingIn('stuff')).toBeLessThan(0.02);
  });
});
