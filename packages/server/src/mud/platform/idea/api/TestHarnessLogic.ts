// TestHarnessLogic — test-world staging, behind TestHarnessApi.
//
// The one implementation behind both doors that move the world for a
// test: the wire harness's routes (`/auth/test-clock`, through
// `TestHooks`) and the in-world `testharness` command. Every static on
// the face is `@TestOnly`, so outside a test world none of this is
// reachable at all. See docs/testing.md § The soak lane.

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { WorldClockApi } from '../../../api/worldclock';
import { PersistApi } from '../../../api/persist';
import { StuffApi } from '../../../api/stuff';
import { ExpanseApi } from '../../../api/expanse';
import { AddressApi } from '../../../api/address';
import { WeatherApi } from '../../../api/weather';
import { MixinApi } from '../../../api/mixin';
import { PersistableApi } from '../../../api/persistable';
import { GovernmentApi } from '../../../api/government';
import ShipRegister from '../ShipRegister';
import Ship from '../Ship';
import ExpanseNode from '../ExpanseNode';
import { Expanse } from '../../../lib/expanse/Expanse';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { FramePos } from '../../../lib/expanse/Frame';
import {
  WEATHER_PROFILES,
  type WeatherPinMode,
  type WeatherType,
} from '../../../lib/weather/WeatherType';

const TestHarnessApiCallers = SecurityPolicies.FromModule(
  '/api/test-harness#TestHarnessApi',
);

/**
 * What `stage` may call: the mutators a row authors (`set*`), the
 * additive ones (`add*`, `pond`), and a cache drop so a read sees what
 * was staged. Never an arbitrary method — the seam stages STATE.
 */
const STAGEABLE_METHOD = /^(set[A-Z]\w*|add[A-Z]\w*|pond|invalidateCache)$/;

/** What `testharness stage` did. */
export interface StageReport {
  path: string;
  method: string;
  /** The method's return, JSON-safe (`null` for none). */
  result: unknown;
}

/** What a clock jump reports. */
export interface ClockJump {
  /** Game-seconds before the jump. */
  readonly before: number;
  /** Game-seconds after it (the clock is held while the world settles). */
  readonly after: number;
  /** Real milliseconds the world took to catch up. */
  readonly settledMs: number;
  /** False when the backlog was still draining at the timeout. */
  readonly quiet: boolean;
}

/** What a weather pin (or its release) reports. */
export interface WeatherPinReport {
  /** The Locality pinned — the one covering the scope asked for. */
  readonly locality: string;
  /** The pin now on it, or null once released. */
  readonly pin: { type: WeatherType; mode: WeatherPinMode } | null;
}

/**
 * Where a staged ship is put: a node of a sea by its path —
 * she lies at it — or a citation on a frame (`{frame, cite}`: the river's
 * `estuary-1.2`, the chart's `lat,lon` or a node path).
 */
export type ShipStagePlace = { node: string } | { frame: string; cite: string };

/** How a ship is staged. */
export interface ShipStageSpec {
  /** Where she lies — a sea's node or a citation on a frame. */
  at?: ShipStagePlace;
  /**
   * ⭐ The band her hull READS once staged: `sound · weathered · worn ·
   * shabby · dilapidated` — after any `sleptDays`, which she weathered
   * into it through.
   */
  hull?: string;
  /** Litres in her bilge, as staged (before any `sleptDays` fill it further). */
  bilgeL?: number;
  /**
   * ⭐ Game-days she has lain unattended: her bilge has filled over
   * them at every band her hull weathered through. With `hull`, the hull
   * reads that band now; without, she has aged that long too.
   */
  sleptDays?: number;
  /**
   * ⭐ Her bilge to her deck, and the water decides: in deep water her
   * settling window opens — everyone aboard is told, and has their acts —
   * and with nobody aboard she goes down at once; at a mud berth she settles
   * onto the bottom. Applied after the rest of the spec.
   */
  settling?: boolean;
  /**
   * The government whose register a ship named by her NAME is looked up in
   * (`flag terminus-city`) — the City of Terminus by default. A register
   * is reached from the government that keeps it; none is searched.
   */
  flag?: string;
}

/** The register a ship named by name is staged out of, unless the spec names another. */
const DEFAULT_STAGE_FLAG = 'terminus-city';

/** Where in each band a staged hull is put — the band's middle, so a minute's clock does not tip it. */
const STAGED_CONDITION: Record<string, number> = {
  sound: 1,
  weathered: 0.8,
  worn: 0.6,
  shabby: 0.375,
  dilapidated: 0.1,
};

/** What staging a ship reports. */
export interface ShipStageReport {
  /** The ship staged, by row path. */
  readonly ship: string;
  /** The frame she is on now, by path, and where on it. */
  readonly frame: string;
  readonly at: FramePos | null;
}

/**
 * @internal — the logic singleton behind `TestHarnessApi`. Registers at
 * `/platform/idea/api/test-harness`; methods admit only the
 * `TestHarnessApi` face.
 */
export class TestHarnessLogic extends ApiLogic {
  /**
   * ⛔ The line between a blocking drive and the soak lane: one game
   * day. A jump past it is a SPAN step (docs/workflow.md § No merge
   * waits on the clock), refused here unless the caller is a soak run.
   */
  public static readonly BLOCKING_JUMP_CAP_S = 86_400;

  /** See {@link TestHarnessApi.advanceClock}. */
  @CallSecurity(TestHarnessApiCallers)
  public async advanceClock(
    duration: string,
    opts?: { soak?: boolean },
  ): Promise<ClockJump> {
    // ⭐ Refused BEFORE the jump, by the clock's own parser, so the
    // grammar and the line are the same for every door.
    const seconds = WorldClockApi.durationSeconds(duration);
    if (seconds > TestHarnessLogic.BLOCKING_JUMP_CAP_S && !opts?.soak) {
      const days = (seconds / 86_400).toFixed(1);
      throw new Error(
        `test clock: a jump of '${duration}' (${days} game days) is a SPAN ` +
          `step and cannot run in a blocking drive — the line is one game ` +
          `day (docs/workflow.md § No merge waits on the clock). Move the ` +
          `step to a .soak. file (<feature>.soak.wire.test.ts, run by ` +
          '`pnpm wire:soak`), or shorten it to a day or less.',
      );
    }
    // (On a fresh ROOT — TestHarnessApi.advanceClock opens it.)
    const before = WorldClockApi.getNow().rawValue();
    WorldClockApi.advance(duration);
    const after = WorldClockApi.getNow().rawValue();
    console.info(
      `TestHarness: advanced world-time '${duration}' ` +
        `(${Math.round(before)}s → ${Math.round(after)}s)`,
    );
    // ⭐ The jump returns when the world has caught up with it (river D46,
    // pass 17): everything the skipped interval fired queues its reads and
    // writes behind the pool, and a drive that jumps again before they land
    // stacks one jump's backlog on the next — ~21,000 queries at 12 s each,
    // and the process grew until the box went down.
    const t0 = Date.now();
    // ⭐ The clock is HELD while it settles: the world runs at its scale
    // in real time, so a minute's wait would land the jump many game
    // minutes past where the drive asked (pass 18: a quarter of an hour's
    // jump landed past the boat it was for). Held, nothing new fires and
    // the jump lands exactly. Never left held: resumed whatever happens.
    const held = !WorldClockApi.isPaused();
    if (held) WorldClockApi.pause();
    let quiet = false;
    try {
      // Under the wire client's 300 s header timeout, so a slow drain
      // reports rather than drops.
      quiet = await PersistApi.whenQuiet(500, 240_000);
    } finally {
      if (held) WorldClockApi.resume();
    }
    const settledMs = Date.now() - t0;
    console.info(
      `TestHarness: the jump settled in ${settledMs} ms` +
        (quiet
          ? ''
          : ' — NOT quiet at the timeout; the backlog is still draining'),
    );
    return { before, after, settledMs, quiet };
  }

  /** See {@link TestHarnessApi.clockNow}. */
  @CallSecurity(TestHarnessApiCallers)
  public clockNow(): number {
    return WorldClockApi.getNow().rawValue();
  }

  /** See {@link TestHarnessApi.pinWeather}. */
  @CallSecurity(TestHarnessApiCallers)
  public async pinWeather(
    scope: string,
    type: string,
    mode: WeatherPinMode = 'frozen',
  ): Promise<WeatherPinReport> {
    // A kind is real iff the weather model has a profile for it — the
    // table the grammar itself runs on, not a second list kept here.
    if (!Object.prototype.hasOwnProperty.call(WEATHER_PROFILES, type)) {
      throw new Error(
        `testharness weather: '${type}' is not a weather kind — the model ` +
          `knows ${Object.keys(WEATHER_PROFILES).join(', ')}`,
      );
    }
    return this.setPin(scope, { type: type as WeatherType, mode });
  }

  /** See {@link TestHarnessApi.unpinWeather}. */
  @CallSecurity(TestHarnessApiCallers)
  public async unpinWeather(scope: string): Promise<WeatherPinReport> {
    return this.setPin(scope, null);
  }

  /** See {@link TestHarnessApi.stage}. */
  @CallSecurity(TestHarnessApiCallers)
  public async stage(
    path: string,
    method: string,
    args: readonly unknown[],
  ): Promise<StageReport> {
    if (!STAGEABLE_METHOD.test(method)) {
      throw new Error(
        `testharness stage: '${method}' is not a mutator a row authors — ` +
          `stage calls set*/add*/pond/invalidateCache only`,
      );
    }
    // `singleton` is the get-or-create: the live instance when one stands.
    const target = await StuffApi.singleton<Stuff>(path).catch(() => null);
    if (target === null || target.isDestroyed()) {
      throw new Error(`testharness stage: nothing loads at '${path}'`);
    }
    const fn = (target as unknown as Record<string, unknown>)[method];
    if (typeof fn !== 'function') {
      throw new Error(`testharness stage: '${path}' has no method '${method}'`);
    }
    const result: unknown = await (fn as (...a: unknown[]) => unknown).apply(target, [...args]);
    return {
      path,
      method,
      result: result === undefined ? null : JSON.parse(JSON.stringify(result) ?? 'null'),
    };
  }

  /** See {@link TestHarnessApi.weatherPinAt}. */
  @CallSecurity(TestHarnessApiCallers)
  public async weatherPinAt(scope: string): Promise<WeatherPinReport> {
    const locality = await this.localityOf(scope);
    const pin = locality.getWeatherPin();
    return {
      locality: locality.getTemplatePath() ?? '?',
      pin: pin ? { type: pin.type, mode: pin.mode } : null,
    };
  }

  /** See {@link TestHarnessApi.stageShip}. */
  @CallSecurity(TestHarnessApiCallers)
  public async stageShip(handle: string, spec: ShipStageSpec): Promise<ShipStageReport> {
    // ⭐ A ship is named by her handle — her identity: minted
    // `<kind>/<serial>` for a ship of a kind, her row for
    // an authored ship — and stood up if she sleeps.
    // ⭐ Or by her NAME in a register (no leading `/`) — a drive knows
    // the name it gave her at `buy`, never the serial she was minted with.
    // The name is read in ONE register — the government's the spec names
    // (Terminus by default), reached from that government.
    if (!handle.startsWith('/')) {
      const flag = spec.flag ?? DEFAULT_STAGE_FLAG;
      const path = GovernmentApi.getGovernment(flag)?.shipRegister;
      const reg = path ? await StuffApi.singleton<Stuff>(path).catch(() => null) : null;
      if (!(reg instanceof ShipRegister)) throw new Error(`testharness ship: ${flag} keeps no register of ships`);
      const entry = await reg.entryNamed(handle);
      if (entry === null) throw new Error(`testharness ship: the register of ${flag} has no ship named '${handle}'`);
      handle = entry.key;
    }
    const found = await ExpanseApi.standUpCraft(handle).catch(() => null);
    if (!(found instanceof Ship)) {
      throw new Error(`testharness ship: '${handle}' is not a ship (name her by her name, her row path, or a ship of a kind by her identity)`);
    }
    const ship = found;
    const wear = spec.hull !== undefined || spec.bilgeL !== undefined || spec.sleptDays !== undefined;
    const settle = spec.settling === true;
    if (!spec.at && !wear && !settle) {
      throw new Error('testharness ship: say what — `at node:<path>`, `at <frame> <cite>`, `hull <band>`, `bilge <L>`, `slept <days>` or `settling`');
    }
    const nowS = WorldClockApi.getNow().rawValue();
    let framePath = ship.getExpanse() ?? '';
    let pos: FramePos | null = null;
    if (spec.at) {
      const placed = await this.placeFor(spec.at);
      framePath = placed.framePath;
      pos = placed.pos;
      // Staged, she leaves her berth and any course she held: she is put down
      // where the drive says, lying there, with nothing about her else changed.
      if (ship.isMoored()) await ship.castOff();
      if (ship.getCourse() !== null) await ship.anchorHere();
      ship.placeAt(pos, nowS, framePath);
      const frame = await ship.liveFrame();
      frame?.adopt(ship as never);
    }
    if (wear) await this.stageWear(ship, spec, nowS);
    if (settle) {
      ship.stageBilge(ship.bilgeCapacityL(), nowS);
      await ship.reconcileBilge(); // the water decides: settling, settled or gone
    }
    await PersistableApi.capture(ship as unknown as Stuff);
    console.info(`TestHarness: staged ${ship.getTemplatePath()} on ${framePath}`);
    return { ship: ship.getDurableHandle() ?? handle, frame: framePath, at: pos ?? this.lyingAt(ship) };
  }

  /**
   * ⭐ Her hull, her bilge and her sleep: the bilge is first brought up
   * to now as she stood; the hull is put in its band; then the bilge's stamp
   * is moved back `sleptDays`, so the next read fills her over every band
   * her hull's line passed through on the way to where it is now. (With no
   * `hull`, her hull ages the same days — at its bare rate.)
   */
  private async stageWear(ship: Ship, spec: ShipStageSpec, nowS: number): Promise<void> {
    await ship.reconcileBilge();
    const days = spec.sleptDays ?? 0;
    if (!(days >= 0) || !Number.isFinite(days)) throw new Error(`testharness ship: slept wants days (got ${spec.sleptDays})`);
    const sleptS = days * 86_400;
    if (spec.hull !== undefined) {
      const c = STAGED_CONDITION[spec.hull];
      if (c === undefined) {
        throw new Error(`testharness ship: hull wants a band — ${Object.keys(STAGED_CONDITION).join(', ')} (got '${spec.hull}')`);
      }
      ship.stageHull(c, nowS);
    } else if (sleptS > 0) {
      const line = ship.hullTrajectory();
      const was = line.stampS > 0 ? line.condition : 1;
      ship.stageHull(was - line.perSecond * sleptS, nowS);
    }
    if (spec.bilgeL !== undefined && !(spec.bilgeL >= 0)) {
      throw new Error(`testharness ship: bilge wants litres (got ${spec.bilgeL})`);
    }
    if (spec.hull !== undefined && sleptS > 0) {
      // ⭐ Her hull was staged in its band NOW,
      // so the line read backwards from now is SOUNDER the further back it
      // goes — a 60-day sleep "through every band" leaked like a sound hull
      // and her well was dry. Staged hull and staged sleep mean: she lay
      // that long leaking at the band she reads.
      const leak = (await ship.bilgeState()).leakLps;
      const base = spec.bilgeL ?? ship.bilgeNowL();
      ship.stageBilge(Math.min(ship.bilgeCapacityL(), base + leak * sleptS), nowS);
    } else {
      ship.stageBilge(spec.bilgeL ?? ship.bilgeNowL(), nowS - sleptS);
    }
    await ship.reconcileBilge();
    await PersistableApi.capture(ship as unknown as Stuff);
  }

  /** Where she lies now, for the report when she was not moved. */
  private lyingAt(ship: Ship): FramePos | null {
    const line = ship.getLinePosition();
    if (line !== null) return { frame: 'line', at: line } as FramePos;
    const chart = ship.getExpansePosition();
    return chart === null ? null : ({ frame: 'chart', at: chart } as FramePos);
  }

  /** The frame and position a stage place names — or a throw in words. */
  private async placeFor(at: ShipStagePlace): Promise<{ framePath: string; pos: FramePos }> {
    if ('node' in at) {
      const node = await StuffApi.singleton<Stuff>(at.node).catch(() => null);
      if (!(node instanceof ExpanseNode)) throw new Error(`testharness ship: '${at.node}' is not a node of any sea`);
      const sea = node.getFrame();
      const where = node.getExpansePosition();
      if (sea === null || where === null) throw new Error(`testharness ship: the node '${at.node}' is on no chart`);
      return { framePath: sea.getTemplatePath() ?? '', pos: { frame: 'chart', at: where } };
    }
    const frame = await StuffApi.singleton<Stuff>(at.frame).catch(() => null);
    if (frame instanceof Expanse) await frame.nodes();
    const pos = frame instanceof Expanse
      ? frame.siteOf(at.cite)
      : frame !== null && MixinApi.isLineFrame(frame)
        ? await frame.locate(at.cite).then((p) => (p === null ? null : ({ frame: 'line', at: p }) as FramePos))
        : null;
    if (pos === null) throw new Error(`testharness ship: '${at.cite}' is no place on '${at.frame}'`);
    return { framePath: at.frame, pos };
  }

  // The Locality-tier pin: the only tier the precipitation integral and
  // the snow walk read (weather.md § The coexistence resolve), so a pinned
  // `snow` lies on the ground and freezes the mere, not just a word.
  private async setPin(
    scope: string,
    pin: { type: WeatherType; mode: WeatherPinMode } | null,
  ): Promise<WeatherPinReport> {
    const locality = await this.localityOf(scope);
    locality.setWeatherPin(pin);
    const where = locality.getTemplatePath() ?? '?';
    console.info(
      `TestHarness: weather ${pin ? `pinned ${pin.type} (${pin.mode})` : 'unpinned'} at ${where}`,
    );
    // ⭐ Applied NOW, as a segment boundary applies the weather: every
    // occupied room restamps its ambient, puddles accrue, and rain wets
    // whoever is out in it — not at the next boundary, hours away.
    await WeatherApi.onBoundary();
    return { locality: where, pin };
  }

  private async localityOf(scope: string) {
    const stuff = StuffApi.findByTemplatePath(scope);
    if (!stuff) {
      throw new Error(`testharness weather: nothing is loaded at '${scope}'`);
    }
    const locality = await AddressApi.resolveLocalityFor(stuff);
    if (!locality) {
      throw new Error(
        `testharness weather: no Locality covers '${scope}' — the weather ` +
          'there is the global field',
      );
    }
    return locality;
  }
}
