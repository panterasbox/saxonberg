/**
 * WatercourseCatalogue — the drainage of the realm, **compiled once and
 * compared as a lookup**.
 *
 * A singleton `Idea` over the authored `Watercourse` rows. It parses
 * them, interpolates the elevations the author left out, derives every
 * edge's direction from those elevations, and compiles the whole
 * drainage into a form where *"is this place upstream of that one?"* is
 * a single set membership test.
 *
 * ## Lazy, not warmed
 *
 * ⚠ Every public read is **async and self-loading**. This codebase has
 * been bitten three times by a reference roster that nothing warms
 * reading empty forever while hand-constructed tests stayed green, so
 * there is deliberately no "warmed vs cold" state to get wrong: the
 * first caller loads, everyone after that hits the cache, and HMR drops
 * it. A `boot:` entry in the pack manifest would be an optimisation,
 * never a correctness requirement.
 *
 * ## Why a compiled reachability SET rather than a graph walk
 *
 * The requirements ask for an ordinal comparison, realm-wide, with no
 * graph walk — because upstream/downstream is asked on hot paths
 * (allocation, contamination, navigability) and a per-question walk of
 * a river is absurd. So the load compiles, for each reach, the set of
 * reaches downstream of it. A basin has tens of reaches, so the whole
 * structure is a few thousand strings; the runtime cost is one
 * `Set.has`.
 *
 * A **set**, rather than the interval labels a tree would allow,
 * because a delta is not a tree: a distributary gives one reach two
 * downstream neighbours, and nested-set labels cannot express that.
 * The set is exact for any DAG and costs the same to read.
 *
 * ## Direction is derived, including at a junction
 *
 * A course names ONE `branchesFrom` node, and which END of it attaches
 * there is worked out from elevation: whichever of the branch's own
 * endpoints sits closest to the junction's height is the junction.
 * A branch attached by its **last** node is a tributary joining; one
 * attached by its **first** node is a distributary leaving. One authored
 * structure, both behaviours, and no arrow anywhere.
 *
 * See [docs/subsystems/watershed.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type Locality from '@saxonberg/server/mud/platform/idea/Locality';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import {
  WEATHER_PROFILES,
  WEATHER_DEFAULTS,
  PRECIPITATION_RATES_MM_PER_HOUR,
  type WeatherType,
} from '@saxonberg/server/mud/lib/weather/WeatherType';
import type { Season } from '@saxonberg/server/mud/lib/time/CelestialProfile';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import {
  WATERCOURSE_PATH_PREFIX,
  type WatercourseDescriptor,
  type WatercourseNode,
} from './Watercourse';

/**
 * The catalogue singleton's own template path. Its row ships with this
 * pack, so `StuffApi.singleton` can lazily clone it wherever a conduit
 * or a verb needs the drainage.
 */
export const WATERCOURSE_CATALOGUE_PATH = '/water/idea/WatercourseCatalogue';

/** Where the kernel's `Locality` reference rows live. */
const LOCALITY_PATH_PREFIX = '/stuff/idea/Locality';

/** A reach citation, `"<courseKey>:<nodeName>"`. */
export type ReachRef = string;

/** How two reaches sit relative to each other on the drainage. */
export type ReachRelation =
  | 'upstream'
  | 'downstream'
  | 'same'
  /**
   * ⚠ Distinct from `downstream`: two reaches in different basins, or
   * on branches that never meet, have NO relation. "Not upstream" and
   * "unrelated" are different answers, and an allocation query that
   * conflated them would let a diversion in one valley curtail a right
   * in another.
   */
  | 'unrelated';

/** A reach after the load has filled in everything the author left out. */
export interface CompiledReach {
  /** `"<courseKey>:<nodeName>"`. */
  ref: ReachRef;
  courseKey: string;
  nodeName: string;
  basin: string;
  /** Position on its own course, source-first. */
  index: number;
  /** Authored at a control point, or interpolated between two. */
  elevation: number;
  /** Authored channel width, or `null`. */
  channelWidthM: number | null;
  /** Minimum hops to a sea outlet — a monotone downstream distance. */
  depthToSea: number;
  /**
   * Square kilometres draining to this reach — its own contributing
   * localities plus everything upstream of it. Accumulated at load.
   */
  catchmentKm2: number;
  /**
   * The template path of the locality whose weather stands in for this
   * catchment's — the largest contributor draining to it — or `null`.
   *
   * ⭐ Without this, the realm would have one weather and Rejection's
   * valley could not be snowier than the city it sits above, which is
   * the entire premise of the headwaters town. A reach is a position on
   * a river rather than a place you stand, so it cannot resolve a
   * covering locality of its own; the biggest contributor is the honest
   * proxy, and an unresolved one falls back to the global field rather
   * than to no weather at all.
   */
  climateLocalityPath: string | null;
}

/**
 * Withdrawals in force, in m³/s, keyed by the reach they are taken at.
 *
 * ⚠ Flow is a **takeable volume**, not a scalar you read: every intake
 * subtracts from everything below it, and capacity and seniority are
 * meaningless otherwise. The ledger is passed IN rather than discovered,
 * so this catalogue never has to know that conduits exist — the water
 * pack's own `Conduit` supplies it, and a test supplies a literal.
 */
export type DrawLedger = ReadonlyMap<ReachRef, number>;

/**
 * ⭐ **What kind of dirt it is, because that decides whether the river
 * recovers.**
 *
 * A single contamination *level* is not enough, and the reason is the
 * most important fact about water pollution: **self-purification**. A
 * river cleans itself of sewage over a few miles and never cleans
 * itself of lead. A model with one number would make the smelter and
 * the outhouse the same problem, and they are not remotely the same
 * problem.
 */
export type ContaminantKind =
  /** Decays with distance — the river recovers below the town. */
  | 'organic'
  /** Does not decay — the river never recovers below the smelter. */
  | 'persistent'
  /** Settles out fastest; raises turbidity while it is suspended. */
  | 'sediment'
  /** Does not decay; accumulates where residence time is long. */
  | 'nutrient';

/** Validation array for {@link ContaminantKind}. */
export const CONTAMINANT_KINDS: readonly ContaminantKind[] = [
  'organic',
  'persistent',
  'sediment',
  'nutrient',
] as const;

/**
 * The fraction of a load that survives **one reach** downstream.
 *
 * ⚠ Per hop rather than per metre, because a reach is the unit the
 * whole subsystem reasons in and a per-metre rate would demand a
 * channel length nobody has authored. The numbers are dials; the
 * ORDERING is the model, and it is not negotiable: organic recovers,
 * sediment settles faster still, persistent and nutrient do not
 * recover at all.
 */
export const CONTAMINANT_SURVIVAL_PER_HOP: Record<ContaminantKind, number> = {
  organic: 0.55,
  sediment: 0.4,
  persistent: 1,
  nutrient: 1,
};

/** What a reach is carrying, and where it came from. */
export interface ContaminationReading {
  reachRef: ReachRef;
  /**
   * Total concentration, in load-units per m³/s of flow. `0` is clean.
   *
   * ⚠ A **concentration**, not a load: the same outfall fouls a summer
   * trickle far worse than a spring freshet, which is why the dirty
   * month and the dry month are the same month.
   */
  level: number;
  /** The same figure split by kind — what recovers and what does not. */
  byKind: Record<ContaminantKind, number>;
}

/**
 * Anything that puts something into a reach. Met over a shape, like
 * {@link Withdrawing}.
 */
export interface Discharging {
  /** The reach it outfalls into, or `''`. */
  getDischargeReach?: () => string;
  /** Load units per second, and what kind of dirt they are. */
  dischargeLoad?: () => { load: number; kind: ContaminantKind };
}

/**
 * Anything that takes water out of a reach — a conduit's intake, a
 * headgate's diversion.
 *
 * Met over a **shape**, not an interface implementation, so the
 * catalogue never has to import the things that draw from it and a
 * future withdrawer needs no edit here.
 */
export interface Withdrawing {
  /** The reach it takes from, or `''`. */
  getReachRef?: () => string;
  /**
   * Cubic metres per second it is taking, given the natural flow
   * arriving at its reach.
   *
   * ⚠ **Natural** flow, deliberately: sizing a withdrawal against the
   * already-drawn flow would make this recursive, and the honest rule
   * is that a headgate is sized by what the river brings it.
   */
  withdrawalM3S?: (naturalM3S: number) => number;
}

/** Everything a flow query worked out, for `analyze` and for tests. */
export interface FlowReading {
  /** The reach it describes. */
  ref: ReachRef;
  /** Cubic metres per second actually passing, after withdrawals. */
  m3s: number;
  /** What the catchment would deliver with nobody drawing. */
  naturalM3S: number;
  /** The share of it that is snowmelt right now (the spring rise). */
  meltM3S: number;
  /** Total upstream withdrawal, in m³/s. */
  drawnM3S: number;
  /** Water-equivalent millimetres still banked as snow on the catchment. */
  snowpackMm: number;
  /** Whether a boat gets through — derived, never authored. */
  navigable: boolean;
}

/** What one walk of the world found. */
interface WorldScan {
  /** Withdrawals in force, in m³/s, keyed by the reach taken from. */
  draws: Map<ReachRef, number>;
  /** Outfalls in force, with what they are putting in and where. */
  discharges: Array<{ at: ReachRef; load: number; kind: ContaminantKind }>;
}

interface CompiledIndex {
  reaches: Map<ReachRef, CompiledReach>;
  /** For each reach, every reach downstream of it. */
  downstream: Map<ReachRef, Set<ReachRef>>;
  /** Immediate downstream neighbours (a delta has more than one). */
  successors: Map<ReachRef, ReachRef[]>;
  /** Course key → its reaches, source-first. */
  byCourse: Map<string, ReachRef[]>;
}

export default class WatercourseCatalogue extends Idea {
  /** `null` until the first read; the load promise once one is running. */
  private loading: Promise<CompiledIndex> | null = null;

  /** Per-segment flow memo — see {@link naturalFlowOf}. */
  private flowCache = new Map<
    ReachRef,
    { total: number; melt: number; snowpackMm: number }
  >();
  private flowCacheSegment = -1;


  /**
   * Residency veto — a load-bearing process-lifetime singleton is never
   * culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /** Singleton refusal — the `CorpoCatalogue` shape. */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'WatercourseCatalogue is a system singleton and cannot be ' +
        'destructed; use forceDestruct (admin-gated) if you really mean it',
    };
  }

  /** Drop the compiled drainage; the next read rebuilds. Fired by HMR. */
  public invalidateCache(): void {
    this.loading = null;
    this.flowCache.clear();
    this.flowCacheSegment = -1;
  }

  // ---------- reads ----------

  /** The compiled reach for a citation, or `null` if it names none. */
  public async reachOf(ref: ReachRef): Promise<CompiledReach | null> {
    const index = await this.index();
    return index.reaches.get(ref) ?? null;
  }

  /** Every reach on a course, source-first. */
  public async reachesOf(courseKey: string): Promise<CompiledReach[]> {
    const index = await this.index();
    const refs = index.byCourse.get(courseKey) ?? [];
    return refs.map((r) => index.reaches.get(r)!);
  }

  /** Every compiled reach in the realm. */
  public async allReaches(): Promise<CompiledReach[]> {
    return [...(await this.index()).reaches.values()];
  }

  /**
   * How `a` sits relative to `b`. Two integer-cheap set lookups; the
   * work was done at load.
   *
   * `unrelated` covers three genuinely different worlds — different
   * basins, sibling tributaries that only meet further down, and a
   * citation naming no reach at all — and none of them is "downstream".
   */
  public async compare(a: ReachRef, b: ReachRef): Promise<ReachRelation> {
    const index = await this.index();
    if (!index.reaches.has(a) || !index.reaches.has(b)) return 'unrelated';
    if (a === b) return 'same';
    if (index.downstream.get(a)?.has(b) === true) return 'upstream';
    if (index.downstream.get(b)?.has(a) === true) return 'downstream';
    return 'unrelated';
  }

  /** Whether water at `a` reaches `b`. */
  public async isUpstreamOf(a: ReachRef, b: ReachRef): Promise<boolean> {
    return (await this.compare(a, b)) === 'upstream';
  }

  /** Every reach `ref` drains into, in no particular order. */
  public async downstreamOf(ref: ReachRef): Promise<ReachRef[]> {
    const index = await this.index();
    return [...(index.downstream.get(ref) ?? [])];
  }

  /** The immediate downstream neighbours (a delta has more than one). */
  public async successorsOf(ref: ReachRef): Promise<ReachRef[]> {
    const index = await this.index();
    return [...(index.successors.get(ref) ?? [])];
  }

  /**
   * Hops from `a` down to `b`, or `null` when `b` is not downstream of
   * `a`. The monotone distance contamination decay reads.
   */
  public async hopsDownstream(
    a: ReachRef,
    b: ReachRef,
  ): Promise<number | null> {
    if ((await this.compare(a, b)) !== 'upstream') return null;
    const index = await this.index();
    const from = index.reaches.get(a)!;
    const to = index.reaches.get(b)!;
    return from.depthToSea - to.depthToSea;
  }

  // ---------- flow, snowpack, navigability ----------

  /**
   * Everything about the water passing a reach right now.
   *
   * ⭐ **The second consumer of the precipitation integral.** A bed
   * multiplies the millimetres by its land area to get litres of soil
   * moisture; a reach multiplies the same millimetres by its catchment
   * area to get cubic metres of river. One walk, two scales — that is
   * the whole spine of this build, and this method is the half of it
   * that makes a diversion matter.
   *
   * `nowS` is game-seconds; `draws` is every withdrawal in force. A
   * withdrawal at or upstream of this reach is subtracted, because flow
   * is a **takeable volume**: capacity and seniority mean nothing
   * against a number nobody can reduce.
   */
  public async flowAt(
    ref: ReachRef,
    nowS: number,
    draws: DrawLedger = new Map(),
  ): Promise<FlowReading | null> {
    const index = await this.index();
    const reach = index.reaches.get(ref);
    if (reach === undefined) return null;

    const natural = this.naturalFlowOf(reach, nowS);

    // Every draw at or upstream of here has already been taken out of
    // the water by the time it gets here. A draw BELOW is somebody
    // else's problem and must not reduce this reading.
    let drawn = 0;
    for (const [at, m3s] of draws) {
      if (m3s <= 0) continue;
      if (at === ref) {
        drawn += m3s;
        continue;
      }
      if (index.downstream.get(at)?.has(ref) === true) drawn += m3s;
    }

    const m3s = Math.max(0, natural.total - drawn);
    return {
      ref,
      m3s,
      naturalM3S: natural.total,
      meltM3S: natural.melt,
      drawnM3S: drawn,
      snowpackMm: natural.snowpackMm,
      navigable:
        m3s >= dial(AppSettingKeys.waterNavigableMinFlowM3S, 8) &&
        (reach.channelWidthM ?? 0) >=
          dial(AppSettingKeys.waterNavigableMinWidthM, 12),
    };
  }

  /**
   * The air temperature (K) over a reach's catchment right now — the
   * same lapse-rate model the snowpack runs on, exposed because a
   * conduit needs it to know whether it is frozen.
   *
   * ⚠ Not the same question as "how warm is the room by the river".
   * This is the CATCHMENT's air, derived from season and altitude,
   * because a reach is a position on a river rather than a place you
   * stand and has no biome chain to walk.
   */
  public async airTemperatureKAt(
    ref: ReachRef,
    nowS: number,
  ): Promise<number | null> {
    const index = await this.index();
    const reach = index.reaches.get(ref);
    if (reach === undefined) return null;
    const sample = WeatherApi.segmentsBetween(
      Quantity.of(nowS - WEATHER_DEFAULTS.SEGMENT_LENGTH_S, 's'),
      Quantity.of(nowS, 's'),
      climateOf(reach),
      1,
    );
    const seg = sample[sample.length - 1];
    if (seg === undefined) return null;
    return airTemperatureK(seg.season, seg.type, reach.elevation);
  }

  /**
   * Every withdrawal currently in force. One `Set`-shaped answer out of
   * {@link worldScan}'s single walk.
   */
  public async liveDraws(nowS: number): Promise<DrawLedger> {
    return (await this.worldScan(nowS)).draws;
  }

  /**
   * ⭐ **What is in the water at a reach** — summed over every outfall
   * upstream, attenuated by distance according to what kind of dirt it
   * is, and divided by the flow that is diluting it.
   *
   * This is where *the map becomes the argument*. Whether an intake
   * sits above or below an outfall is already a fact about the terrain,
   * derived from elevation and **authored by nobody**; all this method
   * does is read that fact back. An intake above the outfall is clean;
   * the same intake a reach down is not; and moving it is free, which
   * is historically the first real answer anybody found.
   */
  public async contaminationAt(
    ref: ReachRef,
    nowS: number,
  ): Promise<ContaminationReading | null> {
    const index = await this.index();
    if (!index.reaches.has(ref)) return null;

    const byKind: Record<ContaminantKind, number> = {
      organic: 0,
      persistent: 0,
      sediment: 0,
      nutrient: 0,
    };

    for (const { at, load, kind } of (await this.worldScan(nowS)).discharges) {
      // An outfall BELOW you is not your problem, and one in another
      // basin is not anybody's — `hops` answers both by being null.
      const hops = at === ref ? 0 : await this.hopsDownstream(at, ref);
      if (hops === null) continue;
      const survival = CONTAMINANT_SURVIVAL_PER_HOP[kind] ?? 1;
      byKind[kind] += load * Math.pow(survival, hops);
    }

    const total =
      byKind.organic + byKind.persistent + byKind.sediment + byKind.nutrient;
    if (total <= 0) return { reachRef: ref, level: 0, byKind };

    // Dilution. A floor on the divisor so a reach that has run dry
    // reports "filthy", not "infinite" — which is both truer and the
    // only answer a caller can do arithmetic with.
    const flow = await this.flowAt(ref, nowS, await this.liveDraws(nowS));
    const diluting = Math.max(0.01, flow?.m3s ?? 0);
    const scale = 1 / diluting;
    return {
      reachRef: ref,
      level: total * scale,
      byKind: {
        organic: byKind.organic * scale,
        persistent: byKind.persistent * scale,
        sediment: byKind.sediment * scale,
        nutrient: byKind.nutrient * scale,
      },
    };
  }

  /**
   * ⚠ **The build's one enumeration of the world, and it answers BOTH
   * questions in a single walk.**
   *
   * Who is taking water out and who is putting dirt in are the same
   * question asked of the same objects, so they share one pass.
   *
   * ⚠ **Deliberately NOT memoised**, unlike natural flow. The walk
   * itself is a `typeof` check per resident object and costs
   * microseconds; the expensive part is the snowpack integral it calls
   * per withdrawer, and that is *already* memoised per reach per
   * weather segment. Caching the walk on top bought nothing and cost
   * correctness: a player who shut a sluice would have watched the
   * river stay dirty for up to six game-hours, because the closed
   * outfall was still sitting in a cache keyed on the weather. Cache
   * the expensive derivation, never the enumeration.
   *
   * **Why a scan and not a registry.** A registry that objects joined
   * at `postRegister` would need an ordering, an eviction hook and a
   * re-registration on materialize, and every one of those is a way for
   * the roster to go quietly stale — a failure this codebase has paid
   * for three times. A scan cannot go stale.
   *
   * **Why not MQL**, which is normally how you search: MQL selects by
   * MIXIN, and a capability pack cannot ship a mixin (its module
   * categories are branches, controllers and tests — no `lib/`). Its
   * `class.X` filter matches by class NAME, and three unrelated things
   * in this codebase are called `Conduit`. So a shape scan is the
   * honest mechanism available here — and `check-world-scan` names this
   * file, so the choice is a diff a reviewer sees rather than a hole in
   * a gate.
   */
  private async worldScan(nowS: number): Promise<WorldScan> {
    const index = await this.index();
    const draws = new Map<ReachRef, number>();
    const discharges: Array<{
      at: ReachRef;
      load: number;
      kind: ContaminantKind;
    }> = [];

    for (const obj of StuffApi.getAllObjects()) {
      const w = obj as unknown as Withdrawing & Discharging;

      if (typeof w.withdrawalM3S === 'function') {
        const ref = typeof w.getReachRef === 'function' ? w.getReachRef() : '';
        const reach = index.reaches.get(ref);
        if (reach !== undefined) {
          const natural = this.naturalFlowOf(reach, nowS).total;
          const taken = w.withdrawalM3S.call(obj, natural);
          if (Number.isFinite(taken) && taken > 0) {
            draws.set(ref, (draws.get(ref) ?? 0) + taken);
          }
        }
      }

      if (typeof w.dischargeLoad === 'function') {
        const at =
          typeof w.getDischargeReach === 'function'
            ? w.getDischargeReach()
            : '';
        if (at !== '' && index.reaches.has(at)) {
          const { load, kind } = w.dischargeLoad.call(obj);
          if (Number.isFinite(load) && load > 0) {
            discharges.push({ at, load, kind });
          }
        }
      }
    }
    return { draws, discharges };
  }

  /**
   * Whether a boat gets through — **derived, never authored**.
   *
   * Nobody writes down a navigable stretch: a dry August closes one and
   * curtailing a junior right reopens it. Both conditions hold, because
   * a torrent through a gorge is not navigable and neither is a wide
   * trickle.
   */
  public async isNavigableAt(
    ref: ReachRef,
    nowS: number,
    draws: DrawLedger = new Map(),
  ): Promise<boolean> {
    return (await this.flowAt(ref, nowS, draws))?.navigable ?? false;
  }

  /**
   * Natural flow, memoised per weather **segment**.
   *
   * Weather is piecewise-constant over six-hour segments, so flow only
   * changes when the segment does — which makes the segment index a
   * cache key whose invalidation is **by construction** rather than
   * enumerated. The snowpack walk looks back half a game year and is by
   * far the most expensive read in the build; without this it would run
   * on every navigability question.
   */
  private naturalFlowOf(
    reach: CompiledReach,
    nowS: number,
  ): { total: number; melt: number; snowpackMm: number } {
    const segment = Math.floor(nowS / WEATHER_DEFAULTS.SEGMENT_LENGTH_S);
    if (segment !== this.flowCacheSegment) {
      this.flowCache.clear();
      this.flowCacheSegment = segment;
    }
    const hit = this.flowCache.get(reach.ref);
    if (hit !== undefined) return hit;
    const computed = computeNaturalFlow(reach, nowS);
    this.flowCache.set(reach.ref, computed);
    return computed;
  }

  // ---------- the load ----------

  /** Load-once, cached. Concurrent callers coalesce onto one promise. */
  private index(): Promise<CompiledIndex> {
    const inFlight = this.loading;
    if (inFlight !== null) return inFlight;
    const started = loadIndex();
    this.loading = started;
    // A failed load must not stick: drop the promise so the next caller
    // retries (and sees the parse error) rather than inheriting a
    // rejected one forever.
    void started.catch(() => {
      if (this.loading === started) this.loading = null;
    });
    return started;
  }
}

/* ─────────────────────────── the compile ─────────────────────────── */

/** Read every authored row and compile the realm's drainage. */
async function loadIndex(): Promise<CompiledIndex> {
  const templates = await Template.findDescendants(WATERCOURSE_PATH_PREFIX);
  const problems: string[] = [];
  const courses = new Map<string, WatercourseDescriptor>();

  for (const tpl of templates) {
    const d = descriptorOf(tpl.data as Record<string, unknown>);
    if (d === null) continue;
    if (courses.has(d.key)) {
      problems.push(
        `two watercourses claim the key '${d.key}' — a key is an ` +
          `identity, and every reach citation on it would be ambiguous`,
      );
      continue;
    }
    if (d.basin === '') {
      problems.push(
        `watercourse '${d.key}' declares no basin — a course with no ` +
          `drainage cannot be compared with anything, and "unrelated to ` +
          `everything" is never what an author meant`,
      );
      continue;
    }
    courses.set(d.key, d);
  }

  const reaches = new Map<ReachRef, CompiledReach>();
  const byCourse = new Map<string, ReachRef[]>();

  for (const course of courses.values()) {
    const filled = interpolate(course, problems);
    const refs: ReachRef[] = [];
    const seen = new Set<string>();
    filled.forEach((node, i) => {
      if (seen.has(node.name)) {
        problems.push(
          `watercourse '${course.key}' has two nodes named ` +
            `'${node.name}' — a reach citation must name exactly one`,
        );
        return;
      }
      seen.add(node.name);
      const ref = `${course.key}:${node.name}`;
      refs.push(ref);
      reaches.set(ref, {
        ref,
        courseKey: course.key,
        nodeName: node.name,
        basin: course.basin,
        index: i,
        elevation: node.elevation ?? 0,
        channelWidthM: node.channelWidthM ?? null,
        depthToSea: 0, // filled below
        // The wild ground the author declared on the node itself;
        // localities add theirs in `accumulateCatchments`.
        catchmentKm2: node.catchmentKm2 ?? 0,
        climateLocalityPath: null, // filled below
      });
    });
    byCourse.set(course.key, refs);
  }

  const successors = buildSuccessors(courses, byCourse, reaches, problems);

  // The wild catchment declared on a node drains downstream exactly as a
  // locality's does — the fell above the town is above the city too.
  // Done here rather than in the node loop because it needs the
  // downstream sets, which need the successors.

  if (problems.length > 0) {
    throw new Error(
      `WatercourseCatalogue: the authored drainage does not describe a ` +
        `world water can run downhill in:\n  - ${problems.join('\n  - ')}`,
    );
  }

  const downstream = compileDownstream(reaches, successors);
  assignDepths(reaches, successors);
  cascadeWildCatchments(reaches, downstream);
  await accumulateCatchments(reaches, downstream);
  return { reaches, downstream, successors, byCourse };
}

/**
 * Fill in the elevations the author left out, and complain about the
 * ones that cannot be filled in honestly.
 *
 * The source and the mouth are control points **by definition** — there
 * is nothing outside them to interpolate from — so both must be
 * authored. Everything between them is linear in the node index, which
 * is what makes an uphill reach unrepresentable rather than merely
 * illegal: there is no way to write one down.
 */
function interpolate(
  course: WatercourseDescriptor,
  problems: string[],
): WatercourseNode[] {
  const nodes = course.nodes.map((n) => ({ ...n }));
  if (nodes.length === 0) {
    problems.push(`watercourse '${course.key}' declares no nodes`);
    return nodes;
  }
  const first = nodes[0]!;
  const last = nodes[nodes.length - 1]!;
  if (typeof first.elevation !== 'number') {
    problems.push(
      `watercourse '${course.key}': its source '${first.name}' authors ` +
        `no elevation — a source is a control point by definition`,
    );
  }
  if (typeof last.elevation !== 'number') {
    problems.push(
      `watercourse '${course.key}': its mouth '${last.name}' authors ` +
        `no elevation — a mouth is a control point by definition`,
    );
  }
  if (
    typeof first.elevation !== 'number' ||
    typeof last.elevation !== 'number'
  ) {
    return nodes;
  }
  // A lake is one node: it is its own source and mouth, and there is
  // nothing to compare or interpolate.
  if (nodes.length === 1) return nodes;

  if (last.elevation > first.elevation) {
    problems.push(
      `watercourse '${course.key}': its mouth '${last.name}' ` +
        `(${last.elevation} m) is ABOVE its source '${first.name}' ` +
        `(${first.elevation} m) — water does not run uphill`,
    );
    return nodes;
  }

  // Every authored control point must sit at or below the one before
  // it. Report the offending PAIR, because a lone number means nothing.
  let lastControl = 0;
  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i]!;
    if (typeof node.elevation !== 'number') continue;
    const prev = nodes[lastControl]!;
    if (node.elevation > prev.elevation!) {
      problems.push(
        `watercourse '${course.key}': control point '${node.name}' ` +
          `(${node.elevation} m) is above '${prev.name}' ` +
          `(${prev.elevation} m), which is upstream of it`,
      );
    }
    // Linear fill between the two control points.
    const span = i - lastControl;
    const drop = prev.elevation! - node.elevation;
    for (let j = lastControl + 1; j < i; j++) {
      nodes[j]!.elevation = prev.elevation! - (drop * (j - lastControl)) / span;
    }
    lastControl = i;
  }
  return nodes;
}

/**
 * Immediate downstream neighbours. Within a course, node `i` runs to
 * node `i + 1`. Across courses, `branchesFrom` attaches one end of the
 * branch to a node of its parent — and **which end is derived from
 * elevation**, so a tributary and a distributary need no separate
 * authoring.
 */
function buildSuccessors(
  courses: Map<string, WatercourseDescriptor>,
  byCourse: Map<string, ReachRef[]>,
  reaches: Map<ReachRef, CompiledReach>,
  problems: string[],
): Map<ReachRef, ReachRef[]> {
  const successors = new Map<ReachRef, ReachRef[]>();
  const link = (from: ReachRef, to: ReachRef): void => {
    const bucket = successors.get(from) ?? [];
    if (!bucket.includes(to)) bucket.push(to);
    successors.set(from, bucket);
  };

  for (const refs of byCourse.values()) {
    for (let i = 0; i + 1 < refs.length; i++) link(refs[i]!, refs[i + 1]!);
  }

  for (const course of courses.values()) {
    const parentRef = course.branchesFrom;
    if (parentRef === null) continue;
    const junction = reaches.get(parentRef);
    if (junction === undefined) {
      problems.push(
        `watercourse '${course.key}' branches from '${parentRef}', ` +
          `which names no reach`,
      );
      continue;
    }
    if (junction.basin !== course.basin) {
      problems.push(
        `watercourse '${course.key}' (basin '${course.basin}') branches ` +
          `from '${parentRef}' in basin '${junction.basin}' — a branch ` +
          `and its parent are the same drainage by definition`,
      );
      continue;
    }
    const refs = byCourse.get(course.key) ?? [];
    if (refs.length === 0) continue;
    const head = reaches.get(refs[0]!)!;
    const tail = reaches.get(refs[refs.length - 1]!)!;

    // Which end meets the parent is a question about heights, not about
    // what the author called it. The endpoint nearest the junction's
    // elevation is the one that touches it.
    const headGap = Math.abs(head.elevation - junction.elevation);
    const tailGap = Math.abs(tail.elevation - junction.elevation);
    if (tailGap <= headGap) link(tail.ref, junction.ref); // tributary joins
    else link(junction.ref, head.ref); // distributary leaves
  }

  return successors;
}

/**
 * For every reach, the full set of reaches downstream of it — a
 * memoised DFS with a visiting guard, so an author who somehow wrote a
 * loop gets a named error instead of a hang.
 */
function compileDownstream(
  reaches: Map<ReachRef, CompiledReach>,
  successors: Map<ReachRef, ReachRef[]>,
): Map<ReachRef, Set<ReachRef>> {
  const out = new Map<ReachRef, Set<ReachRef>>();
  const visiting = new Set<ReachRef>();

  const resolve = (ref: ReachRef): Set<ReachRef> => {
    const done = out.get(ref);
    if (done !== undefined) return done;
    if (visiting.has(ref)) {
      throw new Error(
        `WatercourseCatalogue: '${ref}' is downstream of itself — the ` +
          `authored drainage contains a loop`,
      );
    }
    visiting.add(ref);
    const set = new Set<ReachRef>();
    for (const next of successors.get(ref) ?? []) {
      set.add(next);
      for (const further of resolve(next)) set.add(further);
    }
    visiting.delete(ref);
    out.set(ref, set);
    return set;
  };

  for (const ref of reaches.keys()) resolve(ref);
  return out;
}

/**
 * Push each reach's own declared wild catchment down onto everything
 * below it. Read from a snapshot so a reach's own contribution is not
 * counted again as it cascades past the next one.
 */
function cascadeWildCatchments(
  reaches: Map<ReachRef, CompiledReach>,
  downstream: Map<ReachRef, Set<ReachRef>>,
): void {
  const own = new Map<ReachRef, number>();
  for (const [ref, reach] of reaches) own.set(ref, reach.catchmentKm2);
  for (const [ref, km2] of own) {
    if (km2 <= 0) continue;
    for (const below of downstream.get(ref) ?? []) {
      const r = reaches.get(below);
      if (r !== undefined) r.catchmentKm2 += km2;
    }
  }
}

/**
 * Fold every locality's declared catchment onto the reach it drains to,
 * then onto every reach downstream of that one.
 *
 * ⭐ **This is where the second hierarchy actually joins the first.** A
 * locality declares one string; the drainage turns it into "how much
 * ground is above this point", which is the number the precipitation
 * integral is multiplied by to make a river.
 *
 * A locality that declares no reach — or a reach that no longer exists —
 * contributes to nothing and is silently skipped. That is deliberate:
 * being off the watershed is a normal state of the world, and three
 * localities ship rootless today. It is not an error, and it must not
 * become one.
 */
async function accumulateCatchments(
  reaches: Map<ReachRef, CompiledReach>,
  downstream: Map<ReachRef, Set<ReachRef>>,
): Promise<void> {
  const localities = await Template.findDescendants(LOCALITY_PATH_PREFIX);
  /** Reach → the largest single contribution seen, for the climate proxy. */
  const biggest = new Map<ReachRef, number>();
  for (const tpl of localities) {
    const data = tpl.data as Record<string, unknown>;
    const ref = str(data._reach);
    const km2 = typeof data._catchmentKm2 === 'number' ? data._catchmentKm2 : 0;
    if (ref === '' || km2 <= 0) continue;
    const own = reaches.get(ref);
    if (own === undefined) continue;
    const path = tpl.path;
    const credit = (r: CompiledReach): void => {
      r.catchmentKm2 += km2;
      const best = biggest.get(r.ref) ?? 0;
      if (km2 > best) {
        biggest.set(r.ref, km2);
        r.climateLocalityPath = path;
      }
    };
    credit(own);
    for (const below of downstream.get(ref) ?? []) {
      const r = reaches.get(below);
      if (r !== undefined) credit(r);
    }
  }
}

/** Minimum hops to a sea outlet — the monotone downstream distance. */
function assignDepths(
  reaches: Map<ReachRef, CompiledReach>,
  successors: Map<ReachRef, ReachRef[]>,
): void {
  const memo = new Map<ReachRef, number>();
  const depth = (ref: ReachRef, guard: Set<ReachRef>): number => {
    const done = memo.get(ref);
    if (done !== undefined) return done;
    if (guard.has(ref)) return 0;
    guard.add(ref);
    const next = successors.get(ref) ?? [];
    const d =
      next.length === 0
        ? 0
        : 1 + Math.min(...next.map((n) => depth(n, guard)));
    guard.delete(ref);
    memo.set(ref, d);
    return d;
  };
  for (const [ref, reach] of reaches) reach.depthToSea = depth(ref, new Set());
}

/* ─────────────────────── flow and snowpack ─────────────────────── */

const SECONDS_PER_DAY = 86_400;
const FREEZING_K = 273.15;

/** Numeric AppSetting read with a seeded-literal fallback. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The mm/h a segment delivers — the operator dial in front of the
 * kernel's authored table, so the river and the soil never disagree
 * about how hard it is raining.
 */
function precipitationRateOf(type: keyof typeof PRECIPITATION_RATES_MM_PER_HOUR): number {
  const authored = PRECIPITATION_RATES_MM_PER_HOUR[type];
  switch (type) {
    case 'rain':
      return dial(AppSettingKeys.waterRainRateMmPerHour, authored);
    case 'storm':
      return dial(AppSettingKeys.waterStormRateMmPerHour, authored);
    case 'snow':
      return dial(AppSettingKeys.waterSnowRateMmPerHour, authored);
    default:
      return authored;
  }
}

/**
 * The locality whose weather stands in for a catchment's, resolved live
 * and sync. `null` — no declared contributor, or a process where the
 * localities are not resident — falls back to the global weather field,
 * which is a weaker answer but never a wrong one.
 */
function climateOf(reach: CompiledReach): Locality | null {
  if (reach.climateLocalityPath === null) return null;
  return (
    (StuffApi.findByTemplatePath(reach.climateLocalityPath) as Locality | null) ??
    null
  );
}

/**
 * Air temperature over a catchment: the seasonal sea-level mean, the
 * weather type's own deviation, and the **lapse rate** acting on
 * altitude.
 *
 * ⭐ That last term is the whole of why a headwaters town has a
 * different water problem from the city below it: the same storm rains
 * on one and snows on the other.
 */
function airTemperatureK(
  season: Season,
  type: WeatherType,
  elevationM: number,
): number {
  const lapseKPerM = dial(AppSettingKeys.waterSnowLapseRateKPerKm, 6.5) / 1000;
  return (
    seasonMeanK(season) +
    WEATHER_PROFILES[type].deviation.temperature.rawValue() -
    lapseKPerM * elevationM
  );
}

/** Mean sea-level air temperature (K) for a season. */
function seasonMeanK(season: Season): number {
  switch (season) {
    case 'spring':
      return dial(AppSettingKeys.waterSeasonMeanKSpring, 285);
    case 'summer':
      return dial(AppSettingKeys.waterSeasonMeanKSummer, 295);
    case 'fall':
      return dial(AppSettingKeys.waterSeasonMeanKFall, 283);
    case 'winter':
      return dial(AppSettingKeys.waterSeasonMeanKWinter, 272);
  }
}

/**
 * Natural flow at a reach: **what the catchment delivers, plus what the
 * mountain is releasing**.
 *
 * Two terms, and the second one is the reason seasonality is in scope
 * at all:
 *
 *  1. **Runoff.** The mean liquid precipitation over the catchment's
 *     response window, times its area, times the runoff coefficient. A
 *     mean rather than an instantaneous rate because a real catchment
 *     stores water — without the window a river would empty in a dry
 *     week and flood the moment it rained.
 *  2. **Snowmelt.** Water banked at altitude and released when the air
 *     there rises above freezing. This is what produces the **spring
 *     rise and the late-summer low**, and that low is *why senior
 *     rights matter*: without it, seniority never binds and the whole
 *     allocation layer is decoration.
 *
 * ⚠ The temperature model is the catchment's own, because a **reach has
 * no room to resolve a biome from** — it is a position on a river, not
 * a place you stand. So a seasonal sea-level mean is authored and the
 * atmospheric **lapse rate** does the rest. That one number is what
 * makes altitude the thing that banks snow: the same storm rains on the
 * city and snows on the headwaters.
 */
function computeNaturalFlow(
  reach: CompiledReach,
  nowS: number,
): { total: number; melt: number; snowpackMm: number } {
  const areaM2 = reach.catchmentKm2 * 1_000_000;
  if (areaM2 <= 0) return { total: 0, melt: 0, snowpackMm: 0 };

  const runoff = dial(AppSettingKeys.waterRunoffCoefficient, 0.35);
  const windowDays = Math.max(
    1,
    dial(AppSettingKeys.waterBaseflowWindowDays, 30),
  );
  const windowS = windowDays * SECONDS_PER_DAY;

  const fell = WeatherApi.precipitationBetween(
    Quantity.of(nowS - windowS, 's'),
    Quantity.of(nowS, 's'),
    climateOf(reach),
  );
  const covered = fell.coveredS > 0 ? fell.coveredS : windowS;
  // mm over the window → metres per second over the catchment.
  const runoffM3S =
    ((fell.liquid.rawValue() / 1000) / covered) * areaM2 * runoff;

  const snow = snowpackOf(reach, nowS);
  const meltM3S = ((snow.meltMm / 1000) / snow.overS) * areaM2 * runoff;

  return {
    total: runoffM3S + meltM3S,
    melt: meltM3S,
    snowpackMm: snow.packMm,
  };
}

/**
 * Walk the snow year: accumulate what fell as snow at this catchment's
 * altitude, melt it back on a degree-day model, and report both what is
 * still lying and what came off during the flow window.
 *
 * The oldest and most robust snowmelt model there is, and the right
 * level of abstraction for a river you look at rather than forecast.
 */
function snowpackOf(
  reach: CompiledReach,
  nowS: number,
): { packMm: number; meltMm: number; overS: number } {
  const windowDays = Math.max(1, dial(AppSettingKeys.waterSnowWindowDays, 180));
  const meltFactor = dial(AppSettingKeys.waterSnowMeltMmPerKPerDay, 4);
  const flowWindowS =
    Math.max(1, dial(AppSettingKeys.waterBaseflowWindowDays, 30)) *
    SECONDS_PER_DAY;

  const segments = WeatherApi.segmentsBetween(
    Quantity.of(nowS - windowDays * SECONDS_PER_DAY, 's'),
    Quantity.of(nowS, 's'),
    climateOf(reach),
    Math.ceil(
      (windowDays * SECONDS_PER_DAY) / WEATHER_DEFAULTS.SEGMENT_LENGTH_S,
    ),
  );

  let packMm = 0;
  let meltInFlowWindowMm = 0;
  const flowWindowStart = nowS - flowWindowS;

  for (const seg of segments) {
    const hours = seg.overlapS / 3600;
    const days = seg.overlapS / SECONDS_PER_DAY;
    const airK = airTemperatureK(seg.season, seg.type, reach.elevation);

    if (WEATHER_PROFILES[seg.type].precipitation === 'snow') {
      packMm += precipitationRateOf(seg.type) * hours;
    }
    if (airK > FREEZING_K && packMm > 0) {
      const released = Math.min(packMm, meltFactor * (airK - FREEZING_K) * days);
      packMm -= released;
      if (seg.startsAtS >= flowWindowStart) meltInFlowWindowMm += released;
    }
  }
  return { packMm, meltMm: meltInFlowWindowMm, overS: flowWindowS };
}

/* ─────────────────────────── parsing ─────────────────────────── */

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function nodesOf(value: unknown): WatercourseNode[] {
  if (!Array.isArray(value)) return [];
  const out: WatercourseNode[] = [];
  for (const raw of value) {
    if (raw === null || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const name = str(r.name);
    if (name === '') continue;
    const node: WatercourseNode = { name };
    if (typeof r.elevation === 'number' && Number.isFinite(r.elevation)) {
      node.elevation = r.elevation;
    }
    if (
      typeof r.channelWidthM === 'number' &&
      Number.isFinite(r.channelWidthM)
    ) {
      node.channelWidthM = r.channelWidthM;
    }
    // ⚠ Every authored key needs a line HERE. A field added to
    // `WatercourseNode` and not copied through this parser is silently
    // discarded — which is the orphaned-`data` failure the content
    // lints exist to catch, wearing a different hat.
    if (typeof r.catchmentKm2 === 'number' && Number.isFinite(r.catchmentKm2)) {
      node.catchmentKm2 = r.catchmentKm2;
    }
    out.push(node);
  }
  return out;
}

/** Build a descriptor from a template's `data`, or `null` if it is not one. */
function descriptorOf(
  data: Record<string, unknown>,
): WatercourseDescriptor | null {
  const key = str(data.key) || str(data.name);
  if (key === '') return null;
  return {
    key,
    name: str(data.name) || key,
    basin: str(data.basin),
    nodes: nodesOf(data.nodes),
    branchesFrom: str(data.branchesFrom) === '' ? null : str(data.branchesFrom),
  };
}

/** The authored shapes this catalogue speaks, re-exported for callers. */
export type { WatercourseDescriptor, WatercourseNode };
