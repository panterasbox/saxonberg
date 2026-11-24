// TestHarnessApi — test-world staging: move the clock, pin the weather.
// The thin, gated forwarding shell over TestHarnessLogic.
//
// ⛔ Scaffolding, not fiction. Nothing in the game moves the realm's
// clock or holds its weather; a test harness does, from outside the
// fiction. Every static here is `@TestOnly`, so in a world somebody
// plays in each one is a throwing stub. Two doors reach it in a test
// world — the wire harness's routes (through `backend/TestHooks`) and
// the `testharness` command — and both meet the same rules here, once.
// See docs/testing.md § The soak lane.

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { PersistApi } from './persist';
import { ExecutionContextApi } from './execution-context';
import { TestOnly } from '../lib/security/decorators';
import {
  TestHarnessLogic,
  type ClockJump,
  type StageReport,
  type WeatherPinReport,
  type ShipStageSpec,
  type ShipStagePlace,
  type ShipStageReport,
  type GravityReport,
  type AfflictReport,
  type BodyReport,
  type BodyWoundReport,
  type DaylightPinReport,
  type SpeciesReport,
  type StandingHistoryReport,
  type PurgeReport,
} from '../platform/idea/api/TestHarnessLogic';
import type { WeatherPinMode } from '../lib/weather/WeatherType';
import { fileURLToPath } from 'url';

export type {
  ClockJump,
  StageReport,
  WeatherPinReport,
  ShipStageSpec,
  ShipStagePlace,
  ShipStageReport,
  GravityReport,
  AfflictReport,
  BodyReport,
  BodyWoundReport,
  DaylightPinReport,
  SpeciesReport,
  StandingHistoryReport,
  PurgeReport,
};

const LOGIC_PATH = '/platform/idea/api/test-harness';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/TestHarnessLogic', import.meta.url),
);

/** Resolve the HMR-able TestHarnessLogic singleton (sync). */
function logic(): TestHarnessLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'TestHarnessLogic',
      ) as typeof TestHarnessLogic | null) ?? TestHarnessLogic)(),
  );
}

export class TestHarnessApi {
  /**
   * ⛔ The line between a blocking drive and the soak lane, in game
   * seconds: one game day.
   */
  public static readonly BLOCKING_JUMP_CAP_S =
    TestHarnessLogic.BLOCKING_JUMP_CAP_S;

  /**
   * Move world-time forward by `duration`, draining every schedule the
   * skipped interval contains, then hold the clock until persistence is
   * quiet (up to four minutes) and resume it.
   *
   * ⛔ **A jump past one game day is refused before it moves anything**
   * unless `opts.soak` — the soak lane's runs set it, nothing else does
   * — with a message naming the rule and the `.soak.` fix.
   *
   * @param duration the clock's grammar (`'2 hours'`, `'1 day'`).
   */
  @TestOnly(
    'In a test world, move the clock with `testharness clock-advance ' +
      '<dur>` (or the wire harness’s advanceWorldClock). Nothing in ' +
      'the game moves the realm’s clock.',
  )
  public static advanceClock(
    duration: string,
    opts?: { soak?: boolean },
  ): Promise<ClockJump> {
    // ⭐ On a fresh ROOT, whichever door called: the jump fires every
    // schedule in the skipped interval, and inside a command's frame those
    // callbacks inherit the giver's context — anything that then waits on
    // the giver's own input chain waits behind the very command running
    // the jump (the `testharness clock-advance` drive hung exactly so). A
    // root carries no scope and no jurisdiction, which is what a GLOBAL
    // jump needs; the async body keeps it across every await.
    return ExecutionContextApi.runRoot(TestHarnessApi, 'advanceClock', () =>
      logic().advanceClock(duration, opts),
    );
  }

  /** Game-seconds now — the read half of {@link advanceClock}. */
  @TestOnly(
    'In a test world, read the clock with `testharness clock` (or the ' +
      'wire harness’s worldClockNow).',
  )
  public static clockNow(): number {
    return logic().clockNow();
  }

  /**
   * Hold the weather of the Locality covering `scope` (a place's or a
   * Locality's template path) at `type` until {@link unpinWeather} —
   * `frozen` (the default) holds it exactly, `alive` lets the grammar
   * still vary the deviation. Applied at once, as a segment boundary
   * applies the weather: rooms restamp, puddles accrue, rain wets.
   *
   * ⚠ The pin is persistent on the Locality: a drive that pins, unpins.
   */
  @TestOnly(
    'In a test world, pin the weather with `testharness weather-pin <kind> ' +
      '[--at <place>]` (or the wire harness\u2019s pinWeather).',
  )
  public static pinWeather(
    scope: string,
    type: string,
    mode: WeatherPinMode = 'frozen',
  ): Promise<WeatherPinReport> {
    return logic().pinWeather(scope, type, mode);
  }

  /** Release the pin {@link pinWeather} set; the procedural weather returns. */
  @TestOnly(
    'In a test world, release a pin with `testharness weather-unpin ' +
      '[--at <place>]` (or the wire harness\u2019s unpinWeather).',
  )
  public static unpinWeather(scope: string): Promise<WeatherPinReport> {
    return logic().unpinWeather(scope);
  }

  /**
   * Stage a state a drive cannot reach by playing: load the Stuff at
   * `path` (its live instance, else its singleton) and call one of its own
   * authored mutators — `set*`, `add*`, `pond`, `invalidateCache` — with
   * `args`. Outside the eval sandbox, which (rightly) will not let a
   * parcel-bound eval reach a realm-level aquifer or the catchment.
   */
  @TestOnly('In a test world, stage state with the wire harness\u2019s stage() (POST /auth/test-stage).')
  public static stage(path: string, method: string, args: readonly unknown[] = []): Promise<StageReport> {
    // Staging is the SYSTEM acting (call-security pass D3): it may set a
    // state on anybody's behalf, and every check it meets says so.
    return ExecutionContextApi.runAsSystem('test-stage', () => logic().stage(path, method, args));
  }

  /**
   * ⭐ Run `fn` as `person` acting (call-security pass D15) — the honest
   * actor a unit test of a protective method needs, stated rather than
   * assumed. A root targeting `person`, tagged as its acting author, so
   * `ExecutionContextApi.getActor()` (and the author) answer `person`.
   * Replaces the hand-copied `asGiver` helpers.
   */
  @TestOnly('Tests state who acts with TestHarnessApi.actAs; in play, the actor is whoever typed the command.')
  public static actAs<T>(person: unknown, fn: () => T): T {
    return ExecutionContextApi.runRoot(person, 'actAs', () => {
      ExecutionContextApi.tagActingAuthor(person);
      return fn();
    });
  }

  /**
   * ⭐ Stage a ship — the staged twin of sailing her there:
   * `at` puts her lying at a sea's node (`{node}`) or at a citation on a
   * frame (`{frame, cite}`), cast off from any berth and with no course.
   * Her rooms and everyone in them go with her (they are hers). Named by
   * her row path.
   */
  @TestOnly(
    'In a test world, stage a ship with `testharness ship <ship> at ' +
      'node:<path>` (or the wire harness\u2019s stageShip). Nothing in the ' +
      'game puts a ship somewhere she did not sail.',
  )
  public static stageShip(handle: string, spec: ShipStageSpec): Promise<ShipStageReport> {
    return ExecutionContextApi.runRoot(TestHarnessApi, 'stageShip', () =>
      logic().stageShip(handle, spec),
    );
  }

  /**
   * ⭐ Set a place's own gravity, m/s² (`null` clears it back to the chain):
   * the size-and-carrying drive's zero-g room. Weight follows the place
   * (D6), and whatever is no longer pressed into an open container leaves
   * it at once (D5).
   */
  @TestOnly('In a test world, set a room\u2019s gravity with `testharness gravity-set <m/s²> [--at <place>]`.')
  public static setGravity(scope: string, ms2: number | null): Promise<GravityReport> {
    return ExecutionContextApi.runRoot(TestHarnessApi, 'setGravity', () =>
      logic().setGravity(scope, ms2),
    );
  }

  /**
   * ⭐ Put a resident character under a condition — a toxin-backed one
   * (anaesthesia) dosed to its top band, any other afflicted at `stage` —
   * and read the body once, so going under happens now (its hands let go).
   */
  @TestOnly('In a test world, afflict a body with `testharness afflict <body> <condition> [stage]`.')
  public static afflict(body: string, conditionPath: string, stage?: number): Promise<AfflictReport> {
    return ExecutionContextApi.runRoot(TestHarnessApi, 'afflict', () =>
      logic().afflict(body, conditionPath, stage),
    );
  }

  /**
   * ⭐ Bodies are named by HANDLE (organism-biology D16), as `stage` and
   * `vanish` name theirs: `#<stuffId>` for one live instance (what the
   * `testharness` controllers pass for the body the binder resolved), a
   * template path, or a resident character's name.
   *
   * ⭐ Read one body as a drive asserts on it (organism-biology D16): its
   * stage, sex, names, conditions, wounds, core temperature, capacities and
   * lost parts — and, given `other`, whether it perceives `other`.
   */
  @TestOnly('In a test world, read a body with `testharness body <target> [perceiving <other>]`.')
  public static bodyReport(body: string, other: string | null = null): Promise<BodyReport> {
    return ExecutionContextApi.runRoot(TestHarnessApi, 'bodyReport', () => logic().bodyReport(body, other));
  }

  /** ⭐ Wound one part through `ConditionApi.inflict` — the channel's own fold, as in play. */
  @TestOnly('In a test world, wound a part with `testharness body-wound <target> <part> <channel> [magnitude]`.')
  public static woundBody(body: string, part: string, channel: string, magnitude: number): Promise<BodyWoundReport> {
    return ExecutionContextApi.runRoot(TestHarnessApi, 'woundBody', async () =>
      logic().woundBody(body, part, channel, magnitude),
    );
  }

  /**
   * ⭐ Take a part off by a real avulsion at the sever severity — never a
   * woundless loss. `sealedBy` (`heat` | `corrosion`) stages the stump a
   * burn or a caustic sealed, which never regrows (organism-biology D7).
   */
  @TestOnly('In a test world, sever a part with `testharness body-sever <target> <part> [heat|corrosion]`.')
  public static severBodyPart(body: string, part: string, sealedBy: string | null = null): Promise<BodyWoundReport> {
    return ExecutionContextApi.runRoot(TestHarnessApi, 'severBodyPart', async () =>
      logic().severBodyPart(body, part, sealedBy),
    );
  }

  /** ⭐ Kill a body through the single death transition (`ConditionApi.die`). */
  @TestOnly('In a test world, kill a body with `testharness body-kill <target>`.')
  public static killBody(body: string): Promise<{ body: string; alive: boolean }> {
    return ExecutionContextApi.runRoot(TestHarnessApi, 'killBody', () => logic().killBody(body));
  }

  /**
   * ⭐ Hold the length of the day at `fraction` of the rotation (`null`
   * releases it): a ewe in winter without waiting for one. ⚠ The pin is
   * the world's: whoever pins, unpins.
   */
  @TestOnly('In a test world, pin the daylength with `testharness daylight-pin <fraction>` (and `daylight-unpin`).')
  public static pinDaylight(fraction: number | null): Promise<DaylightPinReport> {
    return ExecutionContextApi.runRoot(TestHarnessApi, 'pinDaylight', async () => logic().pinDaylight(fraction));
  }

  /** ⭐ A staged body of another species: the species set and the mass re-seeded from it. */
  @TestOnly('In a test world, stage a body of another species with `testharness species <name> <species>`.')
  public static setSpecies(handle: string, speciesPath: string): Promise<SpeciesReport> {
    return ExecutionContextApi.runRoot(TestHarnessApi, 'setSpecies', () =>
      logic().setSpecies(handle, speciesPath),
    );
  }

  /**
   * ⭐ A long-lived world in one call: `count` past players with a week of
   * participation, renown and producer history, appended through the three
   * ledgers (db-performance drive 2 — what an idle world's scoring costs
   * when hundreds have played). Idempotent per subject.
   */
  @TestOnly('In a test world, stage past players with `testharness standing-history <count>`.')
  public static stageStandingHistory(count: number): Promise<StandingHistoryReport> {
    return ExecutionContextApi.runRoot(TestHarnessApi, 'stageStandingHistory', () =>
      logic().stageStandingHistory(count),
    );
  }

  /** ⭐ Take a thing out of the world by id, wherever it is (a wizard's reach into a shut pack). */
  @TestOnly('In a test world, remove a thing with `testharness vanish #<id>`.')
  public static removeThing(stuffId: string): Promise<{ removed: string }> {
    return ExecutionContextApi.runRoot(TestHarnessApi, 'removeThing', () => logic().removeThing(stuffId));
  }

  /**
   * ⭐ Stage an outage (failure-model D8): the next `calls` reads or writes
   * of the records fail as a lost connection would, so a verb meets the
   * `unavailable` refusal end to end.
   */
  /**
   * ⭐ Remove what wire runs left in this world (test-world-lifecycle D4):
   * every `wire-` test character (and what it held, sat in and was paid),
   * and the strays in the scaffold. Each owner removes its own; the
   * append-only ledgers are never touched; money is retired to the reserve
   * on the record (`reserve retire`, reason `wire purge`). Returns a count per
   * category. The wire runner calls it at the start and the end of a run.
   */
  @TestOnly('In a test world, the wire runner purges its own litter (POST /auth/test-purge).')
  public static purgeTestLitter(): Promise<PurgeReport> {
    return logic().purgeTestLitter();
  }

  @TestOnly('In a test world, stage an outage with the wire harness\u2019s failDatastore() (POST /auth/test-datastore-fail).')
  public static failDatastore(calls = 1): { failing: number } {
    PersistApi.failNext(calls);
    return { failing: calls };
  }

  /**
   * ⭐ Write a document PAST its validator (failure-model D6) — the staged
   * twin of a bad row forced through, so the drive sees a content error
   * meet a player. Forgets the kind's resident copy so the next read sees it.
   */
  @TestOnly('In a test world, force a bad row with the wire harness\u2019s forceDocument() (POST /auth/test-force-document).')
  public static forceDocument(path: string, kind: string, data: Record<string, unknown>): Promise<{ path: string; kind: string }> {
    return ExecutionContextApi.runRoot(TestHarnessApi, 'forceDocument', () => logic().forceDocument(path, kind, data));
  }

  /** The pin on the Locality covering `scope`, if any. */
  @TestOnly('In a test world, read the pin with `testharness weather`.')
  public static weatherPinAt(scope: string): Promise<WeatherPinReport> {
    return logic().weatherPinAt(scope);
  }
}

SecurityApi.decorateApiClass(TestHarnessApi);
