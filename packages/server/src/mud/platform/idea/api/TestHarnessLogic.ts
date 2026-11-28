// TestHarnessLogic — test-world staging, behind TestHarnessApi.
//
// The one implementation behind both doors that move the world for a
// test: the wire harness's routes (`/auth/test-clock`, through
// `TestHooks`) and the in-world `testharness` command. Every static on
// the face is `@TestOnly`, so outside a test world none of this is
// reachable at all. See docs/testing.md § The soak lane.

import { Mixins } from '../../../lib/mixin';
import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { WorldClockApi } from '../../../api/worldclock';
import { PersistApi } from '../../../api/persist';
import { DocumentApi } from '../../../api/document';
import { CraftingApi } from '../../../api/crafting';
import { StoredDocument } from '../../../lib/document/StoredDocument';
import { StuffApi } from '../../../api/stuff';
import { ExpanseApi } from '../../../api/expanse';
import { AddressApi } from '../../../api/address';
import { WeatherApi } from '../../../api/weather';
import { MixinApi } from '../../../api/mixin';
import { PersistableApi } from '../../../api/persistable';
import { GovernmentApi } from '../../../api/government';
import { PlayerApi } from '../../../api/player';
import { ConsumerApi } from '../../../api/consumer';
import { RenownApi } from '../../../api/renown';
import { ProducerApi } from '../../../api/producer';
import { Quantity } from '../../../lib/quantity';
import { BankingApi } from '../../../api/banking';
import { CompactApi } from '../../../api/compact';
import { EmploymentApi } from '../../../api/employment';
import { GroupApi } from '../../../api/group';
import { ParcelApi } from '../../../api/parcel';
import { Money } from '../../../lib/banking/Money';
import { Collections } from '../../../lib/persistence/Collections';
import { Group } from '../../../lib/social/Group';
import { User } from '../../../lib/identity/User';
import { GoogleProfile } from '../../../lib/identity/GoogleProfile';
import { Refusal } from '../../../lib/errors';
import { PersistedRecord } from '../../../lib/persistence/PersistedRecord';
import type { ContentEntry, MixinSlice } from '../../../lib/persistence/PersistenceSlice';
import Condition, { HARM_DEFAULTS, type Trauma, type AfflictionRecord } from '../Condition';
import { ConditionApi, type InflictSpec, type InflictOutcome } from '../../../api/condition';
import { PerceptionApi } from '../../../api/perception';
import { CelestialApi } from '../../../api/celestial';
import { BODY_CAPACITIES } from '../../../lib/vitals/BodyCapacity';
import { CHANNELS, type Channel } from '../../../lib/material/Channel';
import type { Vitals } from '../../../lib/vitals/Vitals';
import Species from '../species/Species';
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

/**
 * What a wire purge removed (test-world-lifecycle D4) — every category and
 * its count, so the harness can print it and a drive can assert on it.
 */
export interface PurgeReport {
  /** Test characters removed (profile + user + body + per-player rows). */
  characters: number;
  /** Things destructed: what the bodies carried, and the strays in the scaffold. */
  things: number;
  /** Committee and group member rows removed. */
  seats: number;
  /** Offices vacated back to the founder default. */
  offices: number;
  /** Business seats vacated. */
  appointments: number;
  /** Accounts whose balance was retired to the reserve. */
  accounts: number;
  /** Minor units retired to the reserve (`reserve retire`, reason `wire purge`). */
  sunkMinor: number;
  /** Titles under the scaffold handed back to the fixture pack's claim. */
  titles: number;
  /** Per-player rows deleted (snapshots, frames, transcripts, beliefs, dispositions). */
  documents: number;
  /** What was found and left, with why. */
  skipped: string[];
}

/** The handle shape the wire harness mints (`uniqueHandle`). */
const WIRE_HANDLE = /^wire-/;
/** The synthetic domain the test-auth seam issues. */
const TEST_EMAIL = /@e2e\.local$/i;
/**
 * Named survivors — `founder` above all (its seats are the suite's authority).
 * The same list `scripts/purge-test-characters.ts` keeps for the browser tests.
 */
const NEVER_PURGE = new Set(['founder', 'dev', 'default', 'altplayer', 'walker', 'smith', 'smith2', 'diag', 'speaker']);
/** The fixture pack: its rows are the scaffold, and its claims take back what a test held. */
const FIXTURE_PACK = 'test-fixtures';
const SCAFFOLD_ROOT = '/world/testbed';
/** The fixture pack's title claims, longest first: an extent goes back to the group that claims it. */
const SCAFFOLD_CLAIMS: ReadonlyArray<{ extent: string; group: string }> = [
  { extent: '/world/testbed/annex', group: 'testbed-annex' },
  { extent: '/world/testbed', group: 'testbed' },
];
/** Per-player rows, by the key each is filed under. */
const PER_PLAYER_ROWS: ReadonlyArray<{ collection: string; key: string }> = [
  { collection: Collections.HolderSnapshots, key: 'owner' },
  { collection: Collections.PlayerFrames, key: 'owner' },
  { collection: Collections.Transcripts, key: 'owner' },
  { collection: Collections.Beliefs, key: 'viewerId' },
  { collection: Collections.DispositionEvents, key: 'owner' },
];

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
  /**
   * The zone her deck stands in, by identity — her copy of her kind's zone
   * (zone-instancing D11/D12) — or null when her rooms are not standing.
   */
  readonly zone?: string | null;
}

/** What `testharness gravity-set` did (size and carrying drive 19). */
export interface GravityReport {
  /** The place, by template path. */
  readonly place: string;
  /** Its own override now, m/s² — null when it inherits. */
  readonly own: number | null;
  /** What it reads now (the override, else the resolved chain). */
  readonly now: number;
}

/** What `testharness afflict` did (size and carrying drive 15). */
export interface AfflictReport {
  readonly character: string;
  readonly condition: string;
  /** How the body reads after it: conscious, unconscious or dead. */
  readonly consciousness: string;
}

/**
 * What `testharness body` reads (organism-biology D16): the body of one
 * individual as a drive needs to assert on it — its stage, sex and names,
 * the conditions it carries, its core temperature, what it can still do,
 * the parts it has lost, and (with `perceiving`) whether it perceives
 * another.
 */
export interface BodyReport {
  readonly body: string;
  readonly species: string | null;
  readonly stage: string | null;
  readonly sex: string | null;
  readonly alive: boolean;
  readonly keywords: readonly string[];
  readonly conditions: readonly { templatePath: string; stage: number }[];
  readonly traumas: readonly { type: string; site: string; severity: number; mechanism: string | null }[];
  readonly coreK: number | null;
  /** The body's insulation as it stands, clo (worn + its own coat at fill). */
  readonly clo: number | null;
  readonly capacities: Readonly<Record<string, string>>;
  readonly missing: readonly string[];
  readonly massKg: number | null;
  /** Present iff `perceiving` was named: does this body perceive it? */
  readonly perceives?: boolean;
}

/** What a `testharness body-wound` / `body-sever` landed. */
export interface BodyWoundReport {
  readonly body: string;
  readonly site: string;
  readonly type: string;
  readonly severity: number;
  readonly afflicted: boolean;
  readonly missing: readonly string[];
}

/** What `testharness daylight-pin` / `daylight-unpin` left. */
export interface DaylightPinReport {
  readonly pin: number | null;
  /** How many living bodies read their seasons under the new day (the fan-out). */
  readonly bodies: number;
}

/** What `testharness standing-history` did (db-performance drive 2). */
export interface StandingHistoryReport {
  /** Past players with history after the stage. */
  readonly subjects: number;
  /** Event rows the stage asked the three ledgers to append. */
  readonly rows: number;
}

/** The identity prefix the staged past players share. */
const PAST_PLAYER_PREFIX = '/platform/agent/Avatar/dbp-past-';
/** How many subjects are staged at once (the pool, less headroom). */
const STAGE_HISTORY_CONCURRENCY = 8;
const DAY_MS = 86_400_000;

/** What `testharness species` did (size and carrying drive 7). */
export interface SpeciesReport {
  readonly character: string;
  readonly species: string;
  /** The body's mass after the change, kg. */
  readonly massKg: number;
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

  /** See {@link TestHarnessApi.setGravity}. */
  @CallSecurity(TestHarnessApiCallers)
  public async setGravity(scope: string, ms2: number | null): Promise<GravityReport> {
    if (ms2 !== null && !(Number.isFinite(ms2) && ms2 >= 0)) {
      throw new Error(`testharness gravity-set: a value in m/s² (0 or more), or \`clear\` (got ${ms2})`);
    }
    const place = await StuffApi.singleton<Stuff>(scope).catch(() => null);
    if (place === null || place.isDestroyed()) throw new Error(`testharness gravity-set: nothing loads at '${scope}'`);
    if (!MixinApi.isAtmospheric(place)) throw new Error(`testharness gravity-set: '${scope}' has no gravity of its own`);
    // The place's own authored override — what a row's `gravity:` sets —
    // so what it presses and what it weighs follow at once (D5, D6).
    place.setGravity(ms2 === null ? null : Quantity.of(ms2, 'm/s²'));
    return {
      place: place.getTemplatePath() ?? scope,
      own: ms2,
      now: place.gravityNow().rawValue(),
    };
  }

  /**
   * See {@link TestHarnessApi.stageStandingHistory}. For each of `count`
   * past players (`/platform/agent/Avatar/dbp-past-<i>`, nobody's body),
   * append through the three ledgers' own doors: three participation
   * buckets, three renown receptions and one producer credit, spread over
   * the past week. Idempotent: participation and producer dedup their
   * bucket, and a subject that already has its three receptions gets no
   * more. Touches no standing row — the scoring passes fold what it wrote.
   */
  @CallSecurity(TestHarnessApiCallers)
  public async stageStandingHistory(count: number): Promise<StandingHistoryReport> {
    if (!(Number.isInteger(count) && count > 0 && count <= 5000)) {
      throw new Error(`testharness standing-history: a count is a whole number from 1 to 5000 (got ${count})`);
    }
    const now = Date.now();
    const gameNow = WorldClockApi.getNow().rawValue();
    let rows = 0;
    const one = async (i: number): Promise<void> => {
      const subject = `${PAST_PLAYER_PREFIX}${i}`;
      for (let d = 1; d <= 3; d++) {
        const realAt = now - d * 2 * DAY_MS - i * 1000;
        await ConsumerApi.append({ subject, kind: 'command', realAt, at: gameNow - d * 2 * 86_400 });
        rows++;
      }
      const have = (await RenownApi.eventsFor(subject)).filter((e) => e.kind === 'reception').length;
      for (let d = have + 1; d <= 3; d++) {
        await RenownApi.append({
          subject,
          source: `${PAST_PLAYER_PREFIX}${(i + 1) % count}`,
          kind: 'reception',
          at: gameNow - d * 2 * 86_400,
          realAt: now - d * 2 * DAY_MS,
        });
        rows++;
      }
      await ProducerApi.append({
        author: subject,
        actor: `${PAST_PLAYER_PREFIX}${(i + 1) % count}`,
        realAt: now - 3 * DAY_MS - i * 1000,
        at: gameNow - 3 * 86_400,
      });
      rows++;
    };
    let next = 0;
    const worker = async (): Promise<void> => {
      while (next < count) await one(next++);
    };
    await Promise.all(Array.from({ length: Math.min(STAGE_HISTORY_CONCURRENCY, count) }, worker));
    return { subjects: count, rows };
  }

  /**
   * See {@link TestHarnessApi.afflict}. A condition with a toxin behind it
   * (anaesthesia) is DOSED — its stage is a live read of the burden, so an
   * affliction record alone would be read back to nothing — to its top
   * band; any other is afflicted at `stage`. The body is then read once, so
   * whatever going under does (its hands let go, D13) happens now.
   */
  @CallSecurity(TestHarnessApiCallers)
  public async afflict(handle0: string, conditionPath: string, stage = 1): Promise<AfflictReport> {
    // The stage is the logic's to judge, not the verb's (lint:controller-decisions).
    // ⭐ Stage 0 RELIEVES (organism-biology D16): the staged twin of a
    // condition's clearing, so a drive can take a cow out of milk.
    if (!(Number.isFinite(stage) && stage >= 0)) throw new Error(`testharness afflict: a stage is a number, 0 to relieve (got ${stage})`);
    const body = await this.bodyByHandle(handle0, 'afflict');
    const handle = body.getPresentation();
    const row = await StuffApi.singleton<Stuff>(conditionPath).catch(() => null);
    if (!(row instanceof Condition)) throw new Error(`testharness afflict: '${conditionPath}' is not a condition`);
    if (!MixinApi.isVitals(body)) throw new Error(`testharness afflict: '${handle}' has no vitals`);
    if (stage === 0) {
      for (const c of [...body.getConditions()]) {
        if (c.kind === 'affliction' && c.templatePath === conditionPath) body.relieve(c);
      }
      return { character: handle, condition: conditionPath, consciousness: body.getConsciousness() };
    }
    const toxin = row.getToxinBehavior();
    if (toxin !== null && MixinApi.isMetabolic(body)) {
      // Bring the body current FIRST, or the dose is cleared at once by the
      // reconcile of every minute since its last read (the drive's first
      // staging read back `conscious`).
      body.getConsciousness();
      // Past the top band, and enough over it to hold for a game hour at
      // the row's clearance — long enough to be searched.
      const top = Math.max(0, ...toxin.bands.map((b) => b.threshold));
      body.introduceToxin(toxin.toxinType, top * 1.5 + toxin.clearanceRate * 60);
      if (!body.getConditions().some((c) => c.kind === 'affliction' && c.templatePath === conditionPath)) {
        body.afflict({ kind: 'affliction', templatePath: conditionPath, stage, elapsed: 0 });
      }
    } else {
      body.afflict({ kind: 'affliction', templatePath: conditionPath, stage, elapsed: 0 });
    }
    return {
      character: handle,
      condition: conditionPath,
      consciousness: body.getConsciousness(),
    };
  }

  /** See {@link TestHarnessApi.bodyReport}. */
  @CallSecurity(TestHarnessApiCallers)
  public async bodyReport(handle: string, otherHandle: string | null): Promise<BodyReport> {
    const body = await this.bodyByHandle(handle, 'body');
    const other = otherHandle === null ? null : await this.bodyByHandle(otherHandle, 'body');
    const organism = MixinApi.isOrganism(body) ? body : null;
    const vitals = MixinApi.isVitals(body) ? body : null;
    const capacities: Record<string, string> = {};
    if (vitals) for (const k of BODY_CAPACITIES) capacities[k] = vitals.capacity(k);
    let coreK: number | null = null;
    let clo: number | null = null;
    if (vitals && MixinApi.isThermalRegulation(body)) {
      coreK = vitals.getVitalSign('coreTemperature').rawValue();
      clo = Math.round(body.insulationClo() * 1000) / 1000;
    }
    const conditions = (vitals?.getConditions() ?? [])
      .filter((c): c is AfflictionRecord => c.kind === 'affliction')
      .map((c) => ({ templatePath: c.templatePath, stage: c.stage }));
    const traumas = (vitals?.getConditions() ?? [])
      .filter((c): c is Trauma => c.kind === 'trauma')
      .map((t) => ({ type: t.type, site: t.site, severity: t.severity, mechanism: t.mechanism ?? null }));
    const report: BodyReport = {
      body: body.getPresentation(),
      species: organism?.getSpecies()?.getTemplatePath() ?? null,
      stage: organism?.getLifeStage() ?? null,
      sex: organism?.getSex() ?? null,
      alive: organism?.isAlive() ?? false,
      keywords: MixinApi.isPerceptible(body) ? [...body.getKeywords()] : [],
      conditions,
      traumas,
      coreK,
      clo,
      capacities,
      missing: vitals?.getMissingParts().map((p) => p.key) ?? [],
      massKg: MixinApi.isTangible(body) ? body.getMass().rawValue() : null,
    };
    if (other === null) return report;
    return { ...report, perceives: PerceptionApi.perceives(body, other) };
  }

  /** See {@link TestHarnessApi.woundBody}. */
  @CallSecurity(TestHarnessApiCallers)
  public async woundBody(handle: string, part: string, channel: string, magnitude: number): Promise<BodyWoundReport> {
    const body = await this.bodyByHandle(handle, 'body-wound');
    if (!MixinApi.isVitals(body)) throw new Error(`testharness body-wound: '${body.getPresentation()}' has no vitals`);
    if (!(Number.isFinite(magnitude) && magnitude > 0)) {
      throw new Error(`testharness body-wound: a magnitude is a number above 0 (got ${magnitude})`);
    }
    if (body.getPart(part) === null) {
      throw new Error(`testharness body-wound: '${body.getPresentation()}' has no part '${part}'`);
    }
    if (!(CHANNELS as readonly string[]).includes(channel)) {
      throw new Error(`testharness body-wound: '${channel}' is not a channel — ${CHANNELS.join(', ')}`);
    }
    const c = channel as Channel;
    const spec: InflictSpec =
      c === 'shock'
        ? { mechanism: 'shock', site: part, current: Quantity.of(magnitude, 'A') }
        : c === 'corrosion'
          ? { mechanism: 'corrosion', site: part, energy: magnitude, corrosiveTo: [], bare: true }
          : { mechanism: c, site: part, energy: magnitude };
    const out = ConditionApi.inflict(body, spec);
    return this.woundReport(body, out);
  }

  /**
   * See {@link TestHarnessApi.severBodyPart}: the REAL avulsion — a
   * `tearing` insult at the sever severity, so the wound, the sever and
   * whatever a sever does in play all happen. Never a woundless loss.
   */
  @CallSecurity(TestHarnessApiCallers)
  public async severBodyPart(handle: string, part: string, sealedByWord: string | null = null): Promise<BodyWoundReport> {
    // ⭐ What sealed the stump is the logic's to judge, not the controller's
    // (one act per controller): `heat` or `corrosion`, else a usage error.
    if (sealedByWord !== null && sealedByWord !== 'heat' && sealedByWord !== 'corrosion') {
      throw new Error('testharness body-sever: a stump is sealed by `heat` or `corrosion`');
    }
    const sealedBy: 'heat' | 'corrosion' | null = sealedByWord;
    const body = await this.bodyByHandle(handle, 'body-sever');
    if (!MixinApi.isVitals(body)) throw new Error(`testharness body-sever: '${body.getPresentation()}' has no vitals`);
    const p = body.getPart(part);
    if (p === null) throw new Error(`testharness body-sever: '${body.getPresentation()}' has no part '${part}'`);
    if (!p.severable) throw new Error(`testharness body-sever: '${part}' is not a part that comes off`);
    const energy = HARM_DEFAULTS.SEVER_SEVERITY / HARM_DEFAULTS.SEVERITY_PER_ENERGY;
    if (sealedBy !== null) {
      // ⭐ A sealed stump (D7): a burn at the site, and the part taken with
      // its seal recorded (heat or a caustic) — it never regrows.
      const out = ConditionApi.inflict(body, { mechanism: 'heat', site: part, energy });
      body.severPart(part, { sealed: sealedBy });
      return this.woundReport(body, out);
    }
    const out = ConditionApi.inflict(body, { mechanism: 'tearing', site: part, energy });
    return this.woundReport(body, out);
  }

  /** See {@link TestHarnessApi.killBody}: the single death transition. */
  @CallSecurity(TestHarnessApiCallers)
  public async killBody(handle: string): Promise<{ body: string; alive: boolean }> {
    const body = await this.bodyByHandle(handle, 'body-kill');
    if (!MixinApi.isOrganism(body)) throw new Error(`testharness body-kill: '${body.getPresentation()}' is not a living thing`);
    const name = body.getPresentation();
    await ConditionApi.die(body, 'staged');
    return { body: name, alive: body.isAlive() };
  }

  /** See {@link TestHarnessApi.pinDaylight}. */
  @CallSecurity(TestHarnessApiCallers)
  public pinDaylight(fraction: number | null): DaylightPinReport {
    if (fraction !== null && !(Number.isFinite(fraction) && fraction >= 0 && fraction <= 1)) {
      throw new Error(`testharness daylight-pin: a fraction of the day that is light, 0 to 1 (got ${fraction})`);
    }
    CelestialApi.pinDaylightFraction(fraction);
    // ⭐ A pin is a setter and fans out (organism-biology D9), the way a
    // weather pin is applied at once: every living body brings its core
    // current and reads its seasons under the new day — the den, the rut,
    // the milk — with no clock advanced and nobody looking.
    let bodies = 0;
    for (const o of StuffApi.findByMixin(Mixins.Vitals)) {
      if (!MixinApi.isVitals(o) || !MixinApi.isOrganism(o) || !o.isLivingBody()) continue;
      if (MixinApi.isThermalRegulation(o)) o.reconcileThermalRegulation();
      o.reconcilePhenology();
      bodies++;
    }
    return { pin: fraction, bodies };
  }

  private woundReport(body: Stuff & Vitals, out: InflictOutcome): BodyWoundReport {
    return {
      body: body.getPresentation(),
      site: out.trauma.site,
      type: out.trauma.type,
      severity: out.trauma.severity,
      afflicted: out.afflicted,
      missing: body.getMissingParts().map((p) => p.key),
    };
  }

  /**
   * See {@link TestHarnessApi.setSpecies}: a staged body of another kind —
   * the species set and the mass re-seeded from it (the frame the species
   * gives; `Creature.getMass` seeds a zero mass on its next read).
   */
  @CallSecurity(TestHarnessApiCallers)
  public async setSpecies(handle: string, speciesPath: string): Promise<SpeciesReport> {
    const body = await this.bodyByHandle(handle, 'species');
    const species = await StuffApi.singleton<Stuff>(speciesPath).catch(() => null);
    if (!(species instanceof Species)) throw new Error(`testharness species: '${speciesPath}' is not a species`);
    if (!MixinApi.isOrganism(body) || !MixinApi.isTangible(body)) {
      throw new Error(`testharness species: '${handle}' is not a body`);
    }
    body.setSpecies(species);
    body.setMass(Quantity.of(0, 'kg'));
    return {
      character: handle,
      species: speciesPath,
      massKg: body.getMass().rawValue(),
    };
  }

  /**
   * See {@link TestHarnessApi.removeThing}: a thing taken out of the world
   * by id wherever it is — a wizard reaching into a character's shut pack
   * (size and carrying drive, step 14). The thing is destructed.
   */
  @CallSecurity(TestHarnessApiCallers)
  public async removeThing(stuffId: string): Promise<{ removed: string }> {
    const id = stuffId.replace(/^#/, '');
    const thing = StuffApi.findById(id);
    if (!thing || thing.isDestroyed()) throw new Error(`testharness remove: nothing has the id '${id}'`);
    if (thing.isAgent()) throw new Error('testharness remove: a body is not a thing to remove');
    const name = thing.getPresentation();
    await StuffApi.destruct(thing);
    return { removed: name };
  }

  /** See {@link TestHarnessApi.forceDocument}. */
  @CallSecurity(TestHarnessApiCallers)
  public async forceDocument(path: string, kind: string, data: Record<string, unknown>): Promise<{ path: string; kind: string }> {
    const doc = (await StoredDocument.findByPath(path)) ?? new StoredDocument();
    doc.path = path;
    doc.kind = kind;
    doc.data = data;
    await doc.save();
    DocumentApi.catalogueFor(kind)?.forget([path]);
    // ⚠ Recipes are read through a warmed dictionary with no per-path
    // forget: re-warm it, as a recipe go-live would.
    if (kind === 'recipe') await CraftingApi.recipes().warm();
    return { path, kind };
  }

  /**
   * A body by handle (organism-biology D16): `#<stuffId>` for one live
   * instance, a `/`-path for a template's live instance, else a resident
   * character's name.
   */
  private async bodyByHandle(handle: string, verb: string): Promise<Stuff> {
    if (handle.startsWith('#')) {
      const hit = StuffApi.findById(handle.slice(1));
      if (!hit || hit.isDestroyed()) throw new Error(`testharness ${verb}: nothing has the id '${handle.slice(1)}'`);
      return hit;
    }
    if (handle.startsWith('/')) {
      const hit = await StuffApi.singleton<Stuff>(handle).catch(() => null);
      if (!hit || hit.isDestroyed()) throw new Error(`testharness ${verb}: nothing loads at '${handle}'`);
      return hit;
    }
    return this.residentCharacter(handle, verb);
  }

  /** See {@link TestHarnessApi.failSavesOf}. */
  @CallSecurity(TestHarnessApiCallers)
  public async failSavesOf(handle: string, on: boolean): Promise<{ scope: string; refusing: boolean }> {
    const body = this.residentCharacter(handle, 'save-fail');
    const scope = body.getIdentityPath();
    if (!scope) throw new Error(`testharness save-fail: '${handle}' has no record`);
    PersistableApi.refuseSavesOf(scope, on);
    return { scope, refusing: on };
  }

  /** See {@link TestHarnessApi.captureBatch}. */
  @CallSecurity(TestHarnessApiCallers)
  public async captureBatch(handles: readonly string[]): Promise<{ captured: number; failed: number; refused: string[] }> {
    const bodies = handles.map((h) => this.residentCharacter(h, 'save'));
    const r = await PersistableApi.captureBatch(bodies);
    return { captured: r.captured, failed: r.failed, refused: r.refused };
  }

  /** A resident character by name — what the staging verbs act on. */
  private residentCharacter(handle: string, verb: string): Stuff {
    const avatar = PlayerApi.findAvatarByName(handle);
    if (!avatar) throw new Error(`testharness ${verb}: no resident character named '${handle}'`);
    return avatar as unknown as Stuff;
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
    // `#<stuffId>` names ONE live instance (aether-devices: a phone in a
    // pocket is one of many of its kind, so a path cannot address it);
    // otherwise `singleton` is the get-or-create — the live instance when
    // one stands.
    const target = path.startsWith('#')
      ? (StuffApi.findById(path.slice(1)) ?? null)
      : await StuffApi.singleton<Stuff>(path).catch(() => null);
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
      // ⭐ Nothing to change: she is stood up where she lies, with her rooms
      // (zone-instancing D12 — every ship's rooms are a copy she stands, so
      // a drive opening a session in one stands HER first).
      const deck = await ship.watchRoom();
      return {
        ship: ship.getDurableHandle() ?? handle,
        frame: ship.getExpanse() ?? '',
        at: this.lyingAt(ship),
        zone: deck?.getZone()?.getIdentityPath() ?? null,
      };
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

  /**
   * See {@link TestHarnessApi.purgeTestLitter}: remove what wire runs left
   * in this world (test-world-lifecycle D4). Test litter is a profile whose
   * handle starts `wire-` AND whose email ends `@e2e.local` — never a named
   * survivor. Each owner removes its own: the seats, offices and business
   * appointments are vacated, every balance is retired to the reserve (D10),
   * a scaffold title goes back to its claim, the body and what it carries are
   * destructed, then the per-player rows and the profile go. The append-only
   * ledgers are never touched. Then the scaffold: strays in its places
   * (anything not an authored prop, cast member or connected body) are
   * destructed, and the balances its rows hold are retired.
   */
  @CallSecurity(TestHarnessApiCallers)
  public async purgeTestLitter(): Promise<PurgeReport> {
    const report: PurgeReport = {
      characters: 0, things: 0, seats: 0, offices: 0, appointments: 0,
      accounts: 0, sunkMinor: 0, titles: 0, documents: 0, skipped: [],
    };
    const profiles = (await GoogleProfile.find<GoogleProfile>({})).filter(
      (p) => !NEVER_PURGE.has(p.displayName) && WIRE_HANDLE.test(p.displayName) && TEST_EMAIL.test(p.email),
    );
    const connected = new Set(PlayerApi.connectedAvatars().map((a) => a.getIdentityPath()));
    const roster = await CompactApi.officeRoster();
    const groups = await GroupApi.registry();

    // ⭐ In PHASES, never per character: one wire run leaves ~300 of them,
    // and a per-character quiet wait, group query and title walk took the
    // end-of-run purge past the harness's 300 s request (the indifference
    // drive's first pass). Select · seats · titles · bodies · one quiet
    // wait · keyed deletes.
    const doomed: Array<{ profile: GoogleProfile; users: User[]; ids: Array<{ user: User; pid: string; key: string }> }> = [];
    const allUsers = await User.find<User>({ googleProfileId: { $in: profiles.map((p) => String(p._id)) } });
    for (const profile of profiles) {
      const users = allUsers.filter((u) => u.googleProfileId === String(profile._id));
      const ids = users.flatMap((u) => u.playerIds.map((pid) => ({ user: u, pid, key: `/platform/agent/Avatar/${pid}` })));
      if (ids.some((i) => connected.has(i.key))) {
        report.skipped.push(`${profile.displayName} (connected)`);
        continue;
      }
      doomed.push({ profile, users, ids });
    }
    const all = doomed.flatMap((d) => d.ids);
    const keys = new Set(all.map((i) => i.key));
    const pids = new Set(all.map((i) => i.pid));

    // Offices: back to the founder default.
    for (const row of roster) {
      if (!row.isFounderDefault && row.holderPlayerId && pids.has(row.holderPlayerId) && (await CompactApi.vacateOfficeForTest(row.key))) {
        report.offices++;
      }
    }
    // Group member rows (committee seats), one query for every identity.
    if (keys.size > 0) {
      for (const group of await Group.find<Group>({ memberIds: { $in: [...keys] } })) {
        let changed = false;
        for (const key of keys) {
          if (group.removeMember(key)) {
            report.seats++;
            changed = true;
          }
        }
        if (changed) {
          await group.save();
          if (group._id) groups.managed().fireChange(String(group._id));
        }
      }
    }
    // Titles under the scaffold, back to the pack's claim — one walk.
    const held = keys.size > 0 ? await ParcelApi.extentsHeldBy(async (o) => o.kind === 'player' && keys.has(o.templatePath)) : [];
    for (const extent of held) {
      const claim = SCAFFOLD_CLAIMS.find((c) => extent === c.extent || extent.startsWith(`${c.extent}/`));
      if (!claim) {
        report.skipped.push(`a test character holds ${extent}, outside the scaffold`);
        continue;
      }
      await ParcelApi.transfer(extent, { kind: 'group', name: claim.group });
      report.titles++;
    }
    // The bodies: loaded so each owner can act on them, then destructed.
    for (const { user, pid, key } of all) {
      const body = PlayerApi.findAvatarByPlayerId(pid) ?? (await PlayerApi.loadAvatarsForUser(user)).find((a) => a.getIdentityPath() === key);
      if (body) {
        report.appointments += (await EmploymentApi.vacate(body)).length;
        if (MixinApi.isContainer(body)) {
          for (const thing of [...body.getContents()]) {
            if (thing.isDestroyed()) continue;
            await StuffApi.destruct(thing);
            report.things++;
          }
        }
        await StuffApi.destruct(body);
      }
      await this.retireAccountsOf(key, report);
    }
    // A body's onDestruct saves once more; let them land before the rows go.
    if (all.length > 0) await PersistApi.whenQuiet();
    if (keys.size > 0) {
      for (const r of PER_PLAYER_ROWS) report.documents += await PersistApi.deleteMany(r.collection, { [r.key]: { $in: [...keys] } });
    }
    for (const { profile, users } of doomed) {
      for (const u of users) if (u._id) await PersistApi.delete(Collections.Users, String(u._id));
      if (profile._id) await PersistApi.delete(Collections.GoogleProfiles, String(profile._id));
      report.characters++;
    }

    await this.sweepScaffold(report, connected);
    return report;
  }

  /** Retire every balance an owner holds to the reserve (D10), reason `wire purge`. */
  private async retireAccountsOf(ownerKey: string, report: PurgeReport): Promise<void> {
    for (const accountId of await BankingApi.accountIdsOf(ownerKey)) {
      const minor = BankingApi.balanceOf(accountId).minor;
      if (minor <= 0) continue;
      try {
        await BankingApi.retire(accountId, Money.of(minor, BankingApi.balanceOf(accountId).currency), 'wire purge');
        report.accounts++;
        report.sunkMinor += minor;
      } catch (err) {
        if (!(err instanceof Refusal)) throw err;
        report.skipped.push(`${accountId}: ${err.reason}`);
      }
    }
  }

  /**
   * The scaffold's own litter: in every place the fixture pack ships that is
   * loaded, destruct what is neither one of its authored `props:` / `cast:`
   * nor a connected body; then retire what every scaffold row's accounts
   * hold (the shop's takings, the venue's float, the staff's wages). The
   * places come from the pack's own rows, never a world scan (P7).
   */
  private async sweepScaffold(report: PurgeReport, connected: Set<string | null>): Promise<void> {
    const rows = (await PersistApi.find(Collections.Content, { sourcePack: FIXTURE_PACK })) as Array<{
      path?: string;
      data?: { props?: unknown[]; cast?: unknown[] };
    }>;
    for (const row of rows) {
      if (!row.path || !row.path.startsWith(SCAFFOLD_ROOT)) continue;
      await this.retireAccountsOf(row.path, report);
      // Only a PLACE is swept — a row under a `place/` segment (the
      // pack's convention). Every other row (an NPC a drive clones, a thing)
      // may have many instances and is no host here. ⚠ Not "a row with
      // props or cast": the approach authors neither, and its strays were
      // never swept (the indifference drive's reuse pass).
      if (!/\/place\//.test(row.path)) continue;
      const place = StuffApi.findByTemplatePath(row.path);
      if (!place || !MixinApi.isContainer(place)) continue;
      const authored = new Set(
        [...(row.data?.props ?? []), ...(row.data?.cast ?? [])].map((e) =>
          typeof e === 'string' ? e : String((e as { template?: unknown }).template ?? ''),
        ),
      );
      for (const thing of [...place.getContents()]) {
        if (thing.isDestroyed()) continue;
        if (authored.has(thing.getTemplatePath() ?? '')) continue;
        if (PlayerApi.isAvatarStuff(thing)) {
          if (!connected.has(thing.getIdentityPath())) report.skipped.push(`${thing.getPresentation()} (a body in ${row.path})`);
          continue;
        }
        await StuffApi.destruct(thing);
        report.things++;
      }
    }
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
