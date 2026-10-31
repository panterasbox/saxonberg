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
import { ExecutionContextApi } from './execution-context';
import { TestOnly } from '../lib/security/decorators';
import {
  TestHarnessLogic,
  type ClockJump,
  type WeatherPinReport,
  type ShipStageSpec,
  type ShipStagePlace,
  type ShipStageReport,
} from '../platform/idea/api/TestHarnessLogic';
import type { WeatherPinMode } from '../lib/weather/WeatherType';
import { fileURLToPath } from 'url';

export type { ClockJump, WeatherPinReport, ShipStageSpec, ShipStagePlace, ShipStageReport };

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
    'In a test world, move the clock with `testharness clock advance ' +
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
    // the jump (the `testharness clock advance` drive hung exactly so). A
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
    'In a test world, pin the weather with `testharness weather pin <kind> ' +
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
    'In a test world, release a pin with `testharness weather unpin ' +
      '[--at <place>]` (or the wire harness\u2019s unpinWeather).',
  )
  public static unpinWeather(scope: string): Promise<WeatherPinReport> {
    return logic().unpinWeather(scope);
  }

  /**
   * ⭐ Stage a ship (harbors P25) — the staged twin of sailing her there:
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

  /** The pin on the Locality covering `scope`, if any. */
  @TestOnly('In a test world, read the pin with `testharness weather`.')
  public static weatherPinAt(scope: string): Promise<WeatherPinReport> {
    return logic().weatherPinAt(scope);
  }
}

SecurityApi.decorateApiClass(TestHarnessApi);
