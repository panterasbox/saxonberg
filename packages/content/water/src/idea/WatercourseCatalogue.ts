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
import { WaterHardness } from '@saxonberg/server/mud/lib/cleanliness/WaterHardness';
import {
  WaterSourceMixin,
  type WaterRead,
} from '@saxonberg/server/mud/lib/location/WaterSource';
import type { WaterTide } from '@saxonberg/server/mud/lib/location/WaterSource';
import { CelestialApi } from '@saxonberg/server/mud/api/celestial';
import { Tide } from '../lib/Tide';
import {
  RiverLine,
  LINE_DIALS,
  type BankKind,
  type LineBankOverride,
  type LineHazardInput,
  type LineNodeInput,
  type LineStretchOverride,
  type LineWeirInput,
  type RiverSide,
  type LinePosition,
  type RiverStretch,
  type RiverBank,
  type LineHazard,
  type LineSpot,
} from '../lib/RiverLine';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type FisheryRegistry from './FisheryRegistry';
import type { FisheryStanding } from './FisheryRegistry';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type Locality from '@saxonberg/server/mud/platform/idea/Locality';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import {
  WEATHER_DEFAULTS,
  DEFAULT_CLIMATE_SITE,
  type ClimateSite,
} from '@saxonberg/server/mud/lib/weather/WeatherType';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import {
  WATERCOURSE_PATH_PREFIX,
  type WatercourseDescriptor,
  type WatercourseSource,
  type WatercourseMouth,
  type WatercourseStretchOverride,
  type WatercourseHazard,
  type WatercourseNode,
  type WatercourseStock,
  type WatercourseWater,
  type WatercourseSite,
} from './Watercourse';
import {
  WATER_PARAMETERS,
  type WaterState,
} from '@saxonberg/server/mud/platform/idea/species/Species';

/**
 * The catalogue singleton's own template path. Its row ships with this
 * pack, so `StuffApi.singleton` can lazily clone it wherever a conduit
 * or a verb needs the drainage.
 */
export const WATERCOURSE_CATALOGUE_PATH = '/system/water/idea/WatercourseCatalogue';

/**
 * ⭐ Skim ice is open water: at or under this thickness a cast, a bucket or
 * a body breaks it without trying. ONE threshold for the read (is the reach
 * frozen — can it be drawn or fished) and the sheet (is a patch open water),
 * so the two never disagree about the same ice (the storage-and-ice review:
 * a 5 mm night skim on a slow river refused fishing as "frozen over").
 */
export const OPEN_WATER_BELOW_M = 0.005;

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
  /** The course's display name ("the Kestrel") — what prose calls the water. */
  courseName: string;
  /**
   * ⭐ How deep light reaches in this water, m (underwater D6) — the
   * depth at which 1 % is left. The course's `water.clarityM`, else a
   * river's 3; fouled water reads 1 whatever the course says.
   */
  clarityM: number;
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
  /** Authored mean depth, or `null` (the `water.reach.meanDepthM` dial stands in). */
  meanDepthM: number | null;
  /** The species this reach holds (and any authored capacity). */
  stocks: WatercourseStock[];
  /** The works on this reach, by template path (the scan sweep). */
  works: string[];
  /**
   * ⭐ **Where on the world this reach is** (the climate build): the
   * course's authored latitude, continentality and offset, at THIS
   * node's elevation. Every temperature the reach reads — its air, its
   * snowpack, its ice — is `WeatherApi.temperatureAt(site, …)`, the same
   * expression the sky over a room reads, so the river and the street
   * beside it agree.
   */
  site: ClimateSite;
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

/**
 * ⭐ **The ice on a reach** (the climate build, D8) — its own record, not
 * a `WaterState` word: that vocabulary is the fish tank's, closed in the
 * kernel, and ice is not a tank parameter. Derived on read from the
 * weather the water has had, like the snow.
 */
export interface IceRecord {
  ref: ReachRef;
  /** How thick the sheet is, m. `0` is open water. */
  thicknessM: number;
  /**
   * `black` — clear ice, grown on open water with little snow on it,
   * the strong kind; `snow-ice` — grown under snow, white, weaker and
   * slower; `none` — no sheet.
   */
  quality: 'none' | 'black' | 'snow-ice';
  /** The last few days thawed it hard: honeycombed, dark, untrustworthy. */
  rotting: boolean;
  /** What the sheet bears, kg — Gold's `σ · h²`. */
  bearsKg: number;
  /** Why there is no sheet: the water moves, or it is too warm. */
  reason: 'running' | 'warm' | null;
  /** No open water inside the walk-back bound: a sheet older than two winters. */
  perennial: boolean;
}

/**
 * ⭐ The history of one patch of a sheet (storage-and-ice D12): the ice
 * walk run as if the patch were open water from `openedAtS` (a cut, a
 * break, a hole — it regrows from nothing) and bare of snow from
 * `bareFromS` until the next snow (a scraping — it grows faster, and
 * black). The field patch has no history: the plain walk.
 */
export interface IceHistory {
  openedAtS?: number;
  bareFromS?: number;
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
  /** Immediate upstream neighbours — the inverse of `successors`, for the chemistry mix. */
  predecessors: Map<ReachRef, ReachRef[]>;
  /** Course key → its authored water chemistry seed (fishing D22). */
  waterByCourse: Map<string, WatercourseWater>;
  /** ⭐ Course key → its compiled line (river D1); a mere has none. */
  lines: Map<string, RiverLine>;
  /** Course key → its parsed descriptor (the source and mouth read it). */
  descriptors: Map<string, WatercourseDescriptor>;
}

export default class WatercourseCatalogue extends WaterSourceMixin(Idea) {
  /** `null` until the first read; the load promise once one is running. */
  private loading: Promise<CompiledIndex> | null = null;

  /** Per-segment flow memo — see {@link naturalFlowOf}. */
  private flowCache = new Map<
    ReachRef,
    { total: number; melt: number; snowpackMm: number }
  >();
  private flowCacheSegment = -1;

  /** Per-segment ice memo — the flow memo's sibling, same clearing rule. */
  private iceCache = new Map<string, IceRecord>();
  private iceCacheSegment = -1;
  /** The compiled index once loaded — what the sync ice read uses. */
  private loaded: CompiledIndex | null = null;
  /** Reaches the async read found running (the sync read honours it). */
  private runningRefs = new Set<ReachRef>();

  /* ───────────── the water a shore cites (maritime revision 3) ───────────── */

  /**
   * ⭐ Where a cited water is read from `place`, now (river D3): on a line,
   * the **stretch id** at the citation's position — so the fishery, the ice
   * and the shared read key per stretch; a mere's or an unknown citation is
   * its own ref. A place on the line that moves (a reach patch) answers its
   * own position first (river D5).
   */
  public override currentWaterRef(citation: string, place: Stuff): string | null {
    const index = this.loaded;
    if (index === null) return citation;
    const moving = movingPositionOf(place);
    const pos = moving ?? positionIn(index, citation);
    if (pos === null) return citation;
    return index.lines.get(pos.course)?.stretchAt(pos.km)?.id ?? citation;
  }

  /**
   * ⭐ A reach as a shore reads it: what it is, the fishery standing, the
   * ice, and what a pail drawn from it holds — ⭐⭐ **fouled water where
   * the reach reads fouled** (the Conduit's rule with no treatment: a
   * river treats nothing), the water's own temperature, and nothing
   * through ice. `null` for a ref this catalogue does not know.
   */
  public override async readWater(
    citation: string,
    place: Stuff,
    nowS: number,
  ): Promise<WaterRead | null> {
    // ⭐ ONE read per water per segment, shared by every place that cites
    // it (found by the underwater drive): the bank, the basin and every
    // band of its column cite the confluence, and each read is seconds of
    // work — a diver's `descend` waited on a fresh read of the whole river
    // for the band it was entering. The read does not depend on the place
    // — except where the place MOVES on the line (river D5): then it is
    // the read of the stretch it is over.
    const moving = movingPositionOf(place);
    if (moving !== null) citation = positionCitation(moving);
    const key = `${citation}@${Math.floor(nowS / READ_SEGMENT_S)}`;
    const shared = this.sharedReads.get(key);
    if (shared) return shared;
    const read = this.readWaterNow(citation, nowS);
    this.sharedReads.set(key, read);
    if (this.sharedReads.size > 256) this.sharedReads.delete(this.sharedReads.keys().next().value!);
    read.catch(() => this.sharedReads.delete(key));
    return read;
  }

  /** stuffId-free read cache: `<citation>@<segment>` → the read (runtime). */
  private sharedReads = new Map<string, Promise<WaterRead | null>>();

  private async readWaterNow(citation: string, nowS: number): Promise<WaterRead | null> {
    const reach = await this.reachOf(citation);
    if (reach === null) return null;
    // ⭐ On a line the read is OF a stretch (river D3): its id is the ref
    // every reader keys on, and the river's own state rides the opaque.
    const pos = await this.positionOf(citation).catch(() => null);
    const river = pos !== null ? await this.riverStateAt(pos, nowS).catch(() => null) : null;
    if (river !== null) citation = river.stretch.id;
    let registry: FisheryRegistry | null = null;
    try {
      registry = await StuffApi.singleton<FisheryRegistry>(FISHERY_PATH);
    } catch {
      registry = null;
    }
    const standing = registry ? await registry.standingAt(citation, nowS).catch(() => null) : null;
    const ice = await this.iceAt(citation, nowS).catch(() => null);
    const contamination =
      standing?.contamination ?? (await this.contaminationAt(citation, nowS).catch(() => null));
    const water = standing?.water ?? (await this.waterStateAt(citation, nowS).catch(() => null));
    const frozen = ice !== null && ice.thicknessM > OPEN_WATER_BELOW_M;
    const tide = this.tideOf(reach, nowS);
    const fouled = (contamination?.level ?? 0) > dial(AppSettingKeys.waterFouledAt, 0.35);
    const opaque: ReachReadState = {
      reach,
      standing,
      ice,
      fouled,
      disciplineKey: registry ? await registry.readDisciplineKey() : null,
      river,
    };
    return {
      ref: citation,
      atS: nowS,
      name: reach.courseName || reach.courseKey,
      frozen,
      levelM: tide?.levelM ?? 0,
      ...(tide !== null ? { tide: tide.tide } : {}),
      ...(water ? { oxygenMgL: fouled ? water.oxygenMgL * 0.3 : water.oxygenMgL } : {}),
      clarityM: fouled ? Math.min(FOULED_CLARITY_M, reach.clarityM) : reach.clarityM,
      ...(river !== null ? { currentMps: river.currentHereMps, roughness: river.roughness } : {}),
      draw: frozen
        ? null
        : {
            materialPath: fouled ? FOULED_WATER_PATH : FRESH_WATER_PATH,
            temperatureK: water?.temperatureK ?? UNDER_ICE_K,
            // ⭐ The water carries its source's hardness (cleanliness D12).
            ...(water ? { hardnessDgh: water.hardnessDgh } : {}),
          },
      // ⭐ The water under the ice (storage-and-ice D15): what comes up
      // through a hole — the reach's own water, at the under-ice floor.
      ...(frozen
        ? {
            underIce: {
              materialPath: fouled ? FOULED_WATER_PATH : FRESH_WATER_PATH,
              temperatureK: UNDER_ICE_K,
              ...(water ? { hardnessDgh: water.hardnessDgh } : {}),
            },
          }
        : {}),
      opaque,
    };
  }

  /** Everyone's physical read, then the fishery read the viewer earns. Never *fouled*. */
  /** ⭐ The tide brought current on a read this catalogue already gave (D25). */
  public override retide(read: WaterRead, nowS: number): WaterRead | null {
    const state = read.opaque as ReachReadState | undefined;
    if (!state) return null;
    const tide = this.tideOf(state.reach, nowS);
    if (tide === null) return null;
    return { ...read, levelM: tide.levelM, tide: tide.tide };
  }

  public override waterLinesFor(read: WaterRead, viewer: Stuff): string[] {
    const state = read.opaque as ReachReadState | undefined;
    if (!state) return [];
    const lines = physicalRead(state);
    if (state.standing !== null) {
      const registry = StuffApi.findByTemplatePath<FisheryRegistry>(FISHERY_PATH);
      if (registry) lines.push(...registry.readForViewer(state.standing, state.disciplineKey, viewer));
    }
    return lines;
  }


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

  /**
   * ⭐ **The works the reaches name** (the scan sweep, 2026-10-14) — the
   * union of every node's authored `works:`, read off the compiled index.
   * Authored content, so it changes only at install, and the installer's
   * go-live fires {@link invalidateCache}. The rows behind them are read
   * with ONE exact query (`findByPaths`) and memoised the same way; what is
   * STANDING is still read live on every scan.
   */
  private async works(): Promise<string[]> {
    const index = await this.index();
    const out = new Set<string>();
    for (const reach of index.reaches.values()) {
      for (const w of reach.works) out.add(w);
    }
    return [...out];
  }

  private workRowsLoading: Promise<Map<string, Record<string, unknown>>> | null = null;

  private workRows(): Promise<Map<string, Record<string, unknown>>> {
    if (!this.workRowsLoading) {
      this.workRowsLoading = this.works().then(async (paths) => {
        const out = new Map<string, Record<string, unknown>>();
        for (const tpl of await Template.findByPaths(paths)) {
          out.set(tpl.path, { class: tpl.class, ...(tpl.data ?? {}) });
        }
        return out;
      });
    }
    return this.workRowsLoading;
  }

  /** Drop the compiled drainage; the next read rebuilds. Fired by HMR. */
  public invalidateCache(): void {
    this.loading = null;
    this.workRowsLoading = null;
    this.flowCache.clear();
    this.flowCacheSegment = -1;
    this.iceCache.clear();
    this.iceCacheSegment = -1;
    this.riverCache.clear();
    this.riverCacheSegment = -1;
    this.loaded = null;
  }

  /**
   * ⭐⭐ **The ice on a reach right now** (the climate build, D8) — `null`
   * when the citation names nothing.
   *
   * - **Running water does not freeze over here.** A reach whose current
   *   is at or above `water.ice.stillWaterMps` reads `running` (the thin
   *   place over the current is the ice trade's).
   * - **Still water grows ice by Stefan's law.** Freezing degree-days
   *   thicken the sheet as `h² += α²·ΔFDD` — a sheet thickens as the root
   *   of the cold it has had, because its own thickness insulates the
   *   water beneath — with `α` the clear-ice coefficient, or the smaller
   *   snow-ice one while snow lies on it (the kernel's one snow function,
   *   segment by segment). Thawing degree-days melt it back.
   * - **Walked back to the last open water**, from a capped start, the
   *   snow's D15 discipline: once the capped sheet opens, every thinner
   *   start would have too, and the history after is exact.
   * - **It bears `σ·h²`** (Gold's formula): about a person at 6 cm, a
   *   horse at 14, a loaded cart at 20.
   */
  public async iceAt(
    ref: ReachRef,
    nowS: number,
    history?: IceHistory,
  ): Promise<IceRecord | null> {
    const index = await this.index();
    const reach = resolveReach(index, ref);
    if (reach === undefined) return null;
    this.rollIceCache(nowS);
    const key = iceKey(ref, history);
    const hit = this.iceCache.get(key);
    if (hit !== undefined) return hit;

    // ⭐ On a line the stretch's own current decides (river D16): a pool
    // freezes, a rapid runs open all winter.
    const water = await this.waterStateAt(ref, nowS);
    const still = dial('water.ice.stillWaterMps', 0.5);
    const running = water !== null && water.currentMps >= still;
    if (running) this.runningRefs.add(ref);
    else this.runningRefs.delete(ref);
    const record: IceRecord = running ? runningRecord(ref) : { ...computeIce(reach, nowS, history), ref };
    this.iceCache.set(key, record);
    return record;
  }

  /**
   * ⭐ The ice of a patch NOW, synchronously — what a floor's `bears` asks
   * (storage-and-ice D12). `null` until the drainage has been compiled
   * once (an async `iceAt` warms it). The running check is the last async
   * read's; the walk itself is exact and cached per weather segment.
   */
  public iceAtSync(ref: ReachRef, nowS: number, history?: IceHistory): IceRecord | null {
    const index = this.loaded;
    if (index === null) return null;
    const reach = resolveReach(index, ref);
    if (reach === undefined) return null;
    this.rollIceCache(nowS);
    const key = iceKey(ref, history);
    const hit = this.iceCache.get(key);
    if (hit !== undefined) return hit;
    const record = this.runningRefs.has(ref) ? runningRecord(ref) : { ...computeIce(reach, nowS, history), ref };
    this.iceCache.set(key, record);
    return record;
  }

  private rollIceCache(nowS: number): void {
    const segment = Math.floor(nowS / WEATHER_DEFAULTS.SEGMENT_LENGTH_S);
    if (segment !== this.iceCacheSegment) {
      this.iceCache.clear();
      this.iceCacheSegment = segment;
    }
  }

  // ---------- reads ----------

  /** The compiled reach for a citation, or `null` if it names none. */
  public async reachOf(ref: ReachRef): Promise<CompiledReach | null> {
    const index = await this.index();
    return resolveReach(index, ref) ?? null;
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
    const ra = resolveReach(index, a);
    const rb = resolveReach(index, b);
    if (ra === undefined || rb === undefined) return 'unrelated';
    a = ra.ref;
    b = rb.ref;
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
    const from = resolveReach(index, a)!;
    const to = resolveReach(index, b)!;
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
    const reach = resolveReach(index, ref);
    if (reach === undefined) return null;
    ref = reach.ref;

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
        // ⭐ The code fallback agrees with the shipped dial (river D36).
        m3s >= dial(AppSettingKeys.waterNavigableMinFlowM3S, 3) &&
        (reach.channelWidthM ?? 0) >=
          dial(AppSettingKeys.waterNavigableMinWidthM, 12),
    };
  }

  /**
   * The air temperature (K) over a reach right now — **the realm's one
   * temperature** (`WeatherApi.temperatureAt`) at the reach's site and
   * its catchment's weather. A conduit reads it to know whether it is
   * frozen; the water's own temperature floors it at the under-ice
   * figure.
   *
   * ⚠ Since the climate build this is the same expression the sky over a
   * room reads: a street at the reach's latitude and elevation, under the
   * same Locality, reads the same kelvin. The catchment's old four-row
   * seasonal table is gone.
   */
  public async airTemperatureKAt(
    ref: ReachRef,
    nowS: number,
  ): Promise<number | null> {
    const index = await this.index();
    const reach = resolveReach(index, ref);
    if (reach === undefined) return null;
    return WeatherApi.temperatureAt(
      reach.site,
      climateOf(reach),
      Quantity.of(nowS, 's'),
    ).rawValue();
  }

  /** A reach's climate site, or `null` when the citation names nothing. */
  public async siteOf(ref: ReachRef): Promise<ClimateSite | null> {
    return resolveReach(await this.index(), ref)?.site ?? null;
  }

  /**
   * ⭐ The tide at a reach (underwater D4): a reach at the sea's level is
   * the sea's tide, felt up the river mouth; any reach above it has none.
   * The range is the realm's dial (`water.tide.rangeM`, the Greywater's 3).
   */
  private tideOf(reach: { elevation: number }, nowS: number): { levelM: number; tide: WaterTide } | null {
    if (reach.elevation > 0) return null;
    const rangeM = dial('water.tide.rangeM', 3);
    if (!(rangeM > 0)) return null;
    let moon = 0;
    try {
      moon = CelestialApi.moonPhase(Quantity.of(nowS, 's'));
    } catch {
      moon = 0;
    }
    const t = new Tide(rangeM, dial('water.tide.lagH', 0) * 3600).at(nowS, moon);
    return {
      levelM: t.levelM,
      tide: {
        atS: nowS,
        rangeM: t.rangeM,
        rising: t.rising,
        nextHighS: t.nextHighS,
        nextLowS: t.nextLowS,
        streamMps: t.streamFactor * dial('water.tide.peakStreamMps', 1.2),
      },
    };
  }

  /**
   * ⭐⭐ **Everything a body of water reports** (fishing D22) — every word
   * of `WATER_PARAMETERS`, derived where it can be and seeded on the
   * course row where it cannot, so a species' tolerances and, one day,
   * a tank's ledger are read against one vocabulary:
   *
   * | parameter | derivation |
   * |---|---|
   * | `temperatureK` | the catchment's air ({@link airTemperatureKAt}; no thermocline — the underwater slate's depth) |
   * | `currentMps` | `flow / (width × depth)`; an unauthored width or depth from the flow by hydraulic geometry |
   * | `salinityPpt` | 33 at sea level; brackish (the dial) one hop above the sea below the brackish elevation; 0.3 fresh — the one function a tide clock replaces |
   * | `oxygenMgL` | saturation at temperature (14.6 at 273 K → 7.5 at 303 K) × turbulence by current band |
   * | `pH` · `hardnessDgh` · `nitrateMgL` | the course row's `water:` seed, **flow-weighted where a tributary joins** |
   * | `ammoniaMgL` · `nitriteMgL` | 0 in a flowing river |
   * | `contamination` | {@link contaminationAt}'s level |
   *
   * Nothing consumes oxygen or nitrate in a river; they are reads.
   * `null` when the citation names no reach.
   */
  public async waterStateAt(
    ref: ReachRef,
    nowS: number,
  ): Promise<WaterState | null> {
    const index = await this.index();
    const reach = resolveReach(index, ref);
    if (reach === undefined) return null;
    // ⭐ On a line, the stretch's own read (river D1/D17): the current by
    // Manning at its gradient, the temperature by its source.
    const pos = positionIn(index, ref);
    const river = pos !== null ? await this.riverStateAt(pos, nowS) : null;
    ref = reach.ref;

    // The catchment's air, floored at the temperature of water under
    // ice: a river does not go below freezing, it freezes over, and the
    // fish are in the liquid beneath.
    const temperatureK = Math.max(
      UNDER_ICE_K,
      (await this.airTemperatureKAt(ref, nowS)) ?? UNDER_ICE_K,
    );
    const flow = await this.flowAt(ref, nowS, await this.liveDraws(nowS));
    const m3s = flow?.m3s ?? 0;
    // Hydraulic geometry where the row is silent (Leopold & Maddock's
    // at-a-station relations, `w ∝ Q^0.5`, `d ∝ Q^0.4`): a channel is as
    // wide and as deep as the water it carries has cut it. An authored
    // width or depth wins.
    const widthM = Math.max(1, reach.channelWidthM ?? 5 * Math.sqrt(Math.max(m3s, 0.04)));
    const depthM = Math.max(0.1, reach.meanDepthM ?? 0.4 * Math.pow(Math.max(m3s, 0.04), 0.4));
    const currentMps = river !== null ? river.currentMps : m3s / (widthM * depthM);

    const brackishBelowM = dial('water.fishery.brackishBelowM', 50);
    let salinityPpt = 0.3;
    const tide = this.tideOf(reach, nowS);
    if (tide !== null) {
      // ⭐ The tide replaces the step (underwater D4): sea water at the
      // top of the flood, brackish at the bottom of the ebb.
      const sea = dial('water.fishery.salinity.sea', 33);
      const brackish = dial('water.fishery.salinity.brackish', 15);
      const up = Math.max(0, Math.min(1, tide.levelM / Math.max(0.01, tide.tide.rangeM) + 0.5));
      salinityPpt = brackish + (sea - brackish) * up;
    } else if (reach.elevation <= 0) salinityPpt = dial('water.fishery.salinity.sea', 33);
    else if (reach.depthToSea <= 1 && reach.elevation < brackishBelowM) {
      salinityPpt = dial('water.fishery.salinity.brackish', 15);
    }

    // Oxygen: a two-point saturation table, then turbulence — a fast
    // reach is at saturation, a still one holds less.
    const t = Math.max(0, Math.min(1, (temperatureK - 273) / 30));
    const saturation = 14.6 + (7.5 - 14.6) * t;
    const turbulence = currentMps >= 0.5 ? 1 : currentMps >= 0.2 ? 0.9 : 0.8;
    const oxygenMgL = saturation * turbulence;

    const chemistry = this.chemistryAt(index, reach, nowS, new Map());
    const contamination = (await this.contaminationAt(ref, nowS))?.level ?? 0;

    const state: WaterState = {
      temperatureK: river !== null ? river.temperatureK : temperatureK,
      currentMps,
      salinityPpt,
      oxygenMgL,
      pH: chemistry.pH,
      hardnessDgh: chemistry.hardnessDgh,
      nitrateMgL: chemistry.nitrateMgL,
      ammoniaMgL: 0,
      nitriteMgL: 0,
      contamination,
    };
    for (const word of WATER_PARAMETERS) {
      if (!Number.isFinite(state[word])) state[word] = 0;
    }
    return state;
  }

  /**
   * The course seed, **flow-weighted at every join**: a reach's
   * chemistry is its predecessors' mixed by their natural flow, plus its
   * own course's seed carrying the water that arrived between. Where
   * nothing flows the course's own seed answers.
   */
  private chemistryAt(
    index: CompiledIndex,
    reach: CompiledReach,
    nowS: number,
    memo: Map<ReachRef, Required<WatercourseWater>>,
  ): Required<WatercourseWater> {
    const done = memo.get(reach.ref);
    if (done !== undefined) return done;
    const own = seedOf(index.waterByCourse.get(reach.courseKey));
    const total = this.naturalFlowOf(reach, nowS).total;
    const preds = (index.predecessors.get(reach.ref) ?? [])
      .map((p) => index.reaches.get(p))
      .filter((p): p is CompiledReach => p !== undefined);
    let mixed: Required<WatercourseWater> = { pH: 0, hardnessDgh: 0, nitrateMgL: 0 };
    let weight = 0;
    for (const pred of preds) {
      const w = this.naturalFlowOf(pred, nowS).total;
      if (w <= 0) continue;
      const c = this.chemistryAt(index, pred, nowS, memo);
      mixed = add(mixed, c, w);
      weight += w;
    }
    const arrived = Math.max(0, total - weight);
    mixed = add(mixed, own, arrived);
    weight += arrived;
    const out = weight > 0 ? scale(mixed, 1 / weight) : own;
    memo.set(reach.ref, out);
    return out;
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
    const resolved = resolveReach(index, ref);
    if (resolved === undefined) return null;
    ref = resolved.ref;

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
   * at `onCreate` would need an ordering, an eviction hook and a
   * re-registration on materialize, and every one of those is a way for
   * the roster to go quietly stale — a failure this codebase has paid
   * for three times. A scan cannot go stale.
   *
   * ⭐⭐ **It used to walk every object in the world** and duck-type each
   * one for a `withdrawalM3S`. It now walks the works the REACHES name
   * (`works:` on a node — the scan sweep replaced a class scan of the
   * template table) — five objects rather than eighteen hundred — reading
   * each LIVE when standing and from its ROW when not.
   *
   * ⭐ Nothing in the paragraphs above changes: the ROW list is memoised
   * (authored content only moves at install), the LIVE resolution is
   * not (so a shut sluice stops drawing on the very next query), and
   * there is still no registry to go stale.
   *
   * ⚠ **And it took no new interface.** The obvious alternative — written
   * in this build, then withdrawn in review — was a
   * `WithdrawingMixin` the works compose: self-declaring, and it would
   * make a third-party withdrawer possible. It was written and then
   * withdrawn: two composers in one pack do not earn an interface, the
   * mechanism is this pack's so a new work is a local edit here anyway,
   * and *"we need an interface change to stop a scan"* is the wrong
   * shape of answer. The rows already knew.
   */
  private async worldScan(nowS: number): Promise<WorldScan> {
    const index = await this.index();
    const draws = new Map<ReachRef, number>();
    const discharges: Array<{
      at: ReachRef;
      load: number;
      kind: ContaminantKind;
    }> = [];

    const rows = await this.workRows();
    for (const path of await this.works()) {
      const obj = StuffApi.findByTemplatePath(path);
      // ⭐ Authored but not standing: the ROW is the record (the scan
      // sweep). An outfall nobody has visited still discharges as its row
      // says, and a work's unpersisted live state — lost when it unloads —
      // comes back as the row says.
      const w = (
        obj && !obj.isDestroyed() ? obj : rowWork(rows.get(path))
      ) as (Withdrawing & Discharging) | null;
      if (!w) continue;

      if (typeof w.withdrawalM3S === 'function') {
        const ref = typeof w.getReachRef === 'function' ? w.getReachRef() : '';
        const reach = index.reaches.get(ref);
        if (reach !== undefined) {
          const natural = this.naturalFlowOf(reach, nowS).total;
          const taken = w.withdrawalM3S.call(w, natural);
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
          const { load, kind } = w.dischargeLoad.call(w);
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

  // ---------- the line (river D1) ----------

  /** The compiled line of a course, or `null` (a mere, an unknown key). */
  public async lineOf(courseKey: string): Promise<RiverLine | null> {
    return (await this.index()).lines.get(courseKey) ?? null;
  }

  /** The line of a course once compiled, synchronously; `null` before. */
  public lineOfSync(courseKey: string): RiverLine | null {
    return this.loaded?.lines.get(courseKey) ?? null;
  }

  /**
   * ⭐ Where a citation stands on its river (river D3):
   * `course:node[±km][,side]` (a positive offset is downstream), or a
   * stretch id. `null` for a mere, a sea, or a citation naming nothing.
   */
  public async positionOf(citation: string): Promise<LinePosition | null> {
    return positionIn(await this.index(), citation);
  }

  /** {@link positionOf} once the drainage is compiled; `null` before. */
  public positionOfSync(citation: string): LinePosition | null {
    return this.loaded === null ? null : positionIn(this.loaded, citation);
  }

  /** The stretch at a position, or `null` off any line. */
  public async stretchAt(pos: LinePosition): Promise<RiverStretch | null> {
    return (await this.lineOf(pos.course))?.stretchAt(pos.km) ?? null;
  }

  /** Both banks at a position. */
  public async banksAt(pos: LinePosition): Promise<Record<RiverSide, RiverBank> | null> {
    return (await this.stretchAt(pos))?.banks ?? null;
  }

  /** The hazards between two km of a course, in the order met going from `a` to `b`. */
  public async hazardsBetween(course: string, kmA: number, kmB: number, side?: RiverSide): Promise<LineHazard[]> {
    return (await this.lineOf(course))?.hazardsBetween(kmA, kmB, side) ?? [];
  }

  /** The eddies between two km of a course. */
  public async eddiesBetween(course: string, kmA: number, kmB: number): Promise<LineSpot[]> {
    return (await this.lineOf(course))?.eddiesBetween(kmA, kmB) ?? [];
  }

  /** The next spot downstream where what floats fetches up. */
  public async collectsAt(course: string, km: number): Promise<LineSpot | null> {
    return (await this.lineOf(course))?.collectsAt(km) ?? null;
  }

  /** How far along the line is in view from a position, each way. */
  public async sightKm(pos: LinePosition, eyeHeightM: number): Promise<{ upKm: number; downKm: number }> {
    const line = await this.lineOf(pos.course);
    return line ? line.sightKm(pos.km, eyeHeightM) : { upKm: 0, downKm: 0 };
  }

  /** How a course starts and ends, as authored; `null` for a mere. */
  public async endsOf(courseKey: string): Promise<{ source: WatercourseSource; mouth: WatercourseMouth } | null> {
    const d = (await this.index()).descriptors.get(courseKey);
    return d?.source && d.mouth ? { source: d.source, mouth: d.mouth } : null;
  }

  /**
   * ⭐⭐ **The river at a position, now** (river D1/D17) — what a body in
   * it feels and a boatman reads. Memoised per weather segment beside the
   * flow memo (flow changes only when the segment does).
   *
   * - **Flow** interpolated by km between the node pair that brackets it.
   * - **Depth and current by Manning at the stretch's own gradient**
   *   (`v = (1/n)·R^(2/3)·S^(1/2)`, with continuity `Q = w·d·v` solved for
   *   the normal depth): a pool is deep and slow, a riffle shallow and
   *   fast, from the same water. `n` by the bed.
   * - **Across**: the channel's current and depth at the thalweg, the
   *   bank's fraction of each toward the margin you are at.
   * - **Temperature by the source**: a spring river holds near the
   *   ground's temperature for its first tens of km, a melt river is
   *   pulled toward freezing by its meltwater's share; the air otherwise,
   *   floored at the under-ice figure.
   * - **Roughness**: 0 in a pool to 1 in a rapid, scaled by the current.
   * - **A tidal reach** carries the tide's stream against the river's.
   */
  public async riverStateAt(pos: LinePosition, nowS: number): Promise<RiverState | null> {
    const index = await this.index();
    const line = index.lines.get(pos.course);
    if (!line) return null;
    const stretch = line.stretchAt(pos.km);
    if (!stretch) return null;
    const segment = Math.floor(nowS / WEATHER_DEFAULTS.SEGMENT_LENGTH_S);
    if (segment !== this.riverCacheSegment) {
      this.riverCache.clear();
      this.riverCacheSegment = segment;
    }
    const key = `${stretch.id}@${Math.round(pos.km * 1000)}@${Math.round(pos.across)}`;
    const hit = this.riverCache.get(key);
    if (hit !== undefined && (hit.tidal === false || Math.abs(hit.atS - nowS) < 600)) return hit;

    const { up, down, t } = line.nodePairAt(pos.km);
    const draws = await this.liveDraws(nowS);
    const fUp = await this.flowAt(`${pos.course}:${up.name}`, nowS, draws);
    const fDown = up === down ? fUp : await this.flowAt(`${pos.course}:${down.name}`, nowS, draws);
    const flowM3S = Math.max(0, (fUp?.m3s ?? 0) + ((fDown?.m3s ?? 0) - (fUp?.m3s ?? 0)) * t);
    const meltM3S = Math.max(0, (fUp?.meltM3S ?? 0) + ((fDown?.meltM3S ?? 0) - (fUp?.meltM3S ?? 0)) * t);
    const widthM = Math.max(1, line.authoredWidthAt(pos.km) ?? 5 * Math.sqrt(Math.max(flowM3S, 0.04)));
    const n = MANNING_N[stretch.bed] ?? 0.035;
    const S = Math.max(1e-5, stretch.gradient);
    const q = Math.max(flowM3S, 0.001);
    const normal = Math.pow((q * n) / (widthM * Math.sqrt(S)), 0.6);
    const meanDepthM = Math.max(0.05, normal * (stretch.flow === 'pool' ? 1.3 : 1));
    let currentMps = flowM3S > 0 ? Math.min(MAX_CURRENT_MPS, flowM3S / (widthM * meanDepthM)) : 0;
    const depthM = meanDepthM * 1.4;

    // The tide's stream against the river's, where the river meets the sea.
    const elevation = line.elevationAtKm(pos.km);
    const reachRef = `${pos.course}:${line.nearestNode(pos.km).name}`;
    const reach = index.reaches.get(reachRef);
    let tidal = false;
    if (elevation <= 0 && reach) {
      const tide = this.tideOf({ elevation }, nowS);
      if (tide !== null) {
        currentMps -= tide.tide.streamMps;
        tidal = true;
      }
    }

    const channelAt = widthM * stretch.channelAcross;
    const side: RiverSide = pos.across < channelAt ? 'left' : 'right';
    const bank = stretch.banks[side];
    const off = Math.abs(pos.across - channelAt) / (widthM / 2);
    const f = Math.max(0, Math.min(1, (off - 0.3) / 0.6));
    const currentHereMps = currentMps * (1 + (bank.currentFraction - 1) * f);
    const depthHereM = depthM * (1 + (bank.depthFraction - 1) * f);

    const air = Math.max(UNDER_ICE_K, (await this.airTemperatureKAt(reachRef, nowS)) ?? UNDER_ICE_K);
    const source = index.descriptors.get(pos.course)?.source;
    let temperatureK = air;
    if (source?.kind === 'spring') {
      const fromSourceKm = line.sourceKm - pos.km;
      const w = Math.max(0, Math.min(1, fromSourceKm / dial('water.river.springMixKm', 30)));
      temperatureK = dial('water.river.springK', 282) * (1 - w) + air * w;
    } else if (source?.kind === 'melt' && flowM3S > 0) {
      temperatureK = air - (air - UNDER_ICE_K) * Math.min(1, meltM3S / flowM3S);
    }
    temperatureK = Math.max(UNDER_ICE_K, temperatureK);

    const speed = Math.abs(currentHereMps);
    const roughness = Math.min(1, (ROUGHNESS[stretch.flow] ?? 0) * Math.max(0.5, speed / 2));
    const tt = Math.max(0, Math.min(1, (temperatureK - 273) / 30));
    const saturation = 14.6 + (7.5 - 14.6) * tt;
    const turbulence = speed >= 0.5 ? 1 : speed >= 0.2 ? 0.9 : 0.8;

    const state: RiverState = {
      atS: nowS,
      position: { ...pos },
      stretch,
      flowM3S,
      widthM,
      depthM,
      meanDepthM,
      currentMps,
      currentHereMps,
      depthHereM,
      margins: {
        left: { currentMps: currentMps * stretch.banks.left.currentFraction, depthM: depthM * stretch.banks.left.depthFraction },
        right: { currentMps: currentMps * stretch.banks.right.currentFraction, depthM: depthM * stretch.banks.right.depthFraction },
      },
      temperatureK,
      roughness,
      oxygenMgL: saturation * turbulence,
      elevationM: elevation,
      tidal,
      dry: flowM3S <= 0.001,
    };
    this.riverCache.set(key, state);
    if (this.riverCache.size > 2048) this.riverCache.delete(this.riverCache.keys().next().value!);
    return state;
  }

  /** Per-segment river memo — see {@link riverStateAt}. */
  private riverCache = new Map<string, RiverState>();
  private riverCacheSegment = -1;

  // ---------- the load ----------

  /** Load-once, cached. Concurrent callers coalesce onto one promise. */
  private index(): Promise<CompiledIndex> {
    const inFlight = this.loading;
    if (inFlight !== null) return inFlight;
    const started = loadIndex();
    this.loading = started;
    void started.then((idx) => {
      if (this.loading === started) this.loaded = idx;
    }, () => undefined);
    // A failed load must not stick: drop the promise so the next caller
    // retries (and sees the parse error) rather than inheriting a
    // rejected one forever.
    void started.catch(() => {
      if (this.loading === started) this.loading = null;
    });
    return started;
  }
}

/** ⭐ A river at a position, now — see {@link WatercourseCatalogue.riverStateAt}. */
export interface RiverState {
  atS: number;
  position: LinePosition;
  stretch: RiverStretch;
  /** m³/s passing, interpolated between the bracketing nodes. */
  flowM3S: number;
  widthM: number;
  /** At the thalweg, m. */
  depthM: number;
  meanDepthM: number;
  /** The channel's current, m/s; + downstream, − when the flood tide runs up. */
  currentMps: number;
  /** The current at this position's across. */
  currentHereMps: number;
  /** The depth at this position's across. */
  depthHereM: number;
  margins: Record<RiverSide, { currentMps: number; depthM: number }>;
  temperatureK: number;
  /** 0 (glassy) to 1 (white water). */
  roughness: number;
  oxygenMgL: number;
  /** The water surface's elevation here, m. */
  elevationM: number;
  tidal: boolean;
  /** A sink river run out this season. */
  dry: boolean;
}

/** Manning's roughness by bed. */
const MANNING_N: Record<string, number> = { ground: 0.035, gravel: 0.035, rock: 0.05, sand: 0.03, mud: 0.025 };
/** How rough each kind of water is before the current scales it. */
const ROUGHNESS: Record<string, number> = { pool: 0, run: 0.2, riffle: 0.4, rapid: 1, falls: 1 };
/** No river here runs faster than this, m/s (a falls' sheet is not a current). */
const MAX_CURRENT_MPS = 6;

/**
 * ⭐ A citation resolved to the NODE whose hydrology stands for it (river
 * D3): a reach ref is itself; a stretch id or a `node±km` position is the
 * node nearest it on its line — so flow, chemistry, contamination and the
 * fishery's stock all read the node, while the current and the temperature
 * are the position's own (`riverStateAt`).
 */
function resolveReach(index: CompiledIndex, citation: string): CompiledReach | undefined {
  const direct = index.reaches.get(citation);
  if (direct !== undefined) return direct;
  const at = AT_POSITION.exec(citation);
  const course = at ? at[1]! : citation.slice(0, citation.indexOf(':'));
  const line = index.lines.get(course);
  if (!line) {
    const cite = RiverLine.parseCitation(citation);
    return cite ? index.reaches.get(`${cite.course}:${cite.node}`) : undefined;
  }
  const pos = positionIn(index, citation);
  if (pos === null) return undefined;
  return index.reaches.get(`${course}:${line.nearestNode(pos.km).name}`);
}

/** Where a citation stands on its course's line, or `null`. */
function positionIn(index: CompiledIndex, citation: string): LinePosition | null {
  const at = AT_POSITION.exec(citation);
  if (at) {
    const line = index.lines.get(at[1]!);
    if (!line) return null;
    const km = Math.max(line.mouthKm, Math.min(line.sourceKm, Number.parseFloat(at[2]!)));
    return { course: at[1]!, km, across: Number.parseFloat(at[3]!) };
  }
  const course = citation.slice(0, citation.indexOf(':'));
  const line = index.lines.get(course);
  if (!line) return null;
  if (RiverLine.isStretchId(citation)) {
    const s = line.stretchById(citation);
    if (!s) return null;
    const km = (s.upKm + s.downKm) / 2;
    const w = line.authoredWidthAt(km) ?? 10;
    return { course, km, across: w * s.channelAcross };
  }
  const cite = RiverLine.parseCitation(citation);
  if (!cite) return null;
  const km = line.kmOf(cite.node, cite.offsetKm);
  if (km === null) return null;
  return line.positionOf(cite, line.authoredWidthAt(km) ?? 10);
}

/** A place's own position on a line, when it moves on one (river D5) — read through its methods. */
function movingPositionOf(place: Stuff): LinePosition | null {
  const p = place as unknown as { getLinePosition?: () => LinePosition | null };
  if (typeof p.getLinePosition !== 'function') return null;
  try {
    return p.getLinePosition() ?? null;
  } catch {
    return null;
  }
}

/** `<course>@<km>~<across>` — a moving place's position as a citation. */
const AT_POSITION = /^([^@:/\s]+)@(-?\d+(?:\.\d+)?)~(\d+(?:\.\d+)?)$/;

/** A position as a citation the read memo keys on: the course and km. */
function positionCitation(pos: LinePosition): string {
  return `${pos.course}@${pos.km.toFixed(3)}~${Math.round(pos.across)}`;
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
    if (!lineEndsHold(d, problems)) continue;
    courses.set(d.key, d);
  }

  const reaches = new Map<ReachRef, CompiledReach>();
  const byCourse = new Map<string, ReachRef[]>();
  const lines = new Map<string, RiverLine>();
  // ⭐ The weirs the courses' works name (river D1): every one makes a
  // hydraulic below it. Read by the rows' exact paths — no scan.
  const workPaths = new Set<string>();
  for (const course of courses.values()) {
    for (const n of course.nodes) for (const w of n.works ?? []) workPaths.add(w);
  }
  const workRowsByPath = new Map<string, Record<string, unknown>>();
  if (workPaths.size > 0) {
    for (const tpl of await Template.findByPaths([...workPaths])) {
      workRowsByPath.set(tpl.path, { class: tpl.class, ...(tpl.data ?? {}) });
    }
  }

  for (const course of courses.values()) {
    const filled = interpolate(course, problems);
    if (filled.length >= 2 && filled.every((n) => typeof n.km === 'number')) {
      try {
        lines.set(course.key, compileLine(course, filled, workRowsByPath));
      } catch (err) {
        problems.push(`watercourse '${course.key}': ${(err as Error).message}`);
      }
    }
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
        courseName: course.name,
        clarityM: course.clarityM ?? RIVER_CLARITY_M,
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
        meanDepthM: node.meanDepthM ?? null,
        stocks: node.stocks ?? [],
        works: node.works ?? [],
        site: {
          latitudeDeg: course.site?.latitudeDeg ?? DEFAULT_CLIMATE_SITE.latitudeDeg,
          continentality:
            course.site?.continentality ?? DEFAULT_CLIMATE_SITE.continentality,
          offsetK: course.site?.offsetK ?? DEFAULT_CLIMATE_SITE.offsetK,
          elevationM: node.elevation ?? 0,
        },
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
  const predecessors = new Map<ReachRef, ReachRef[]>();
  for (const [from, tos] of successors) {
    for (const to of tos) {
      const bucket = predecessors.get(to) ?? [];
      bucket.push(from);
      predecessors.set(to, bucket);
    }
  }
  const waterByCourse = new Map<string, WatercourseWater>();
  for (const course of courses.values()) {
    if (course.water) waterByCourse.set(course.key, course.water);
  }
  const descriptors = new Map(courses);
  return {
    reaches,
    downstream,
    successors,
    byCourse,
    predecessors,
    waterByCourse,
    lines,
    descriptors,
  };
}

/** The seed a course's meander is laid from: authored, else FNV of its key. */
function meanderSeed(course: WatercourseDescriptor): number {
  if (typeof course.meander?.seed === 'number') return course.meander.seed;
  let h = 2166136261;
  for (let i = 0; i < course.key.length; i++) {
    h ^= course.key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * ⭐ Compile one course's line (river D1): its nodes in km, its overrides,
 * hazards and named bends resolved from `node±km` citations, and a weir for
 * every `ControlStructure` of kind `weir` with a head among its works. A
 * citation naming no node of the course throws, naming itself.
 */
function compileLine(
  course: WatercourseDescriptor,
  filled: WatercourseNode[],
  workRows: Map<string, Record<string, unknown>>,
): RiverLine {
  const nodes: LineNodeInput[] = filled.map((n) => ({
    name: n.name,
    km: n.km!,
    elevation: n.elevation ?? 0,
    widthM: n.channelWidthM ?? null,
    drop: n.drop ?? 0,
  }));
  const kmOf = (at: string, what: string): number => {
    const cite = RiverLine.parseCitation(at.includes(':') ? at : `${course.key}:${at}`);
    const node = cite ? nodes.find((n) => n.name === cite.node) : undefined;
    if (!cite || !node) throw new Error(`${what} '${at}' names no node of the course`);
    return Math.max(nodes[nodes.length - 1]!.km, Math.min(nodes[0]!.km, node.km - cite.offsetKm));
  };
  const sideOf = (v: unknown): RiverSide => (v === 'right' ? 'right' : 'left');
  const stretches: LineStretchOverride[] = [];
  const bankOverrides: LineBankOverride[] = [];
  for (const o of course.stretches ?? []) {
    if (typeof o.at === 'string' && typeof o.bank === 'string') {
      bankOverrides.push({ km: kmOf(o.at, 'a bank override at'), side: sideOf(o.side), bank: o.bank });
      continue;
    }
    if (typeof o.from !== 'string' || typeof o.to !== 'string') continue;
    const a = kmOf(o.from, 'a stretch override from');
    const b = kmOf(o.to, 'a stretch override to');
    const banks = o.banks === 'walls'
      ? 'walls' as const
      : o.banks && typeof o.banks === 'object'
        ? (o.banks as Partial<Record<RiverSide, BankKind>>)
        : undefined;
    stretches.push({
      upKm: Math.max(a, b),
      downKm: Math.min(a, b),
      ...(o.kind ? { kind: o.kind } : {}),
      ...(o.bed ? { bed: o.bed } : {}),
      ...(banks ? { banks } : {}),
    });
  }
  const hazards: LineHazardInput[] = (course.hazards ?? []).map((h) => ({
    km: kmOf(h.at, 'a hazard at'),
    side: sideOf(h.side),
    kind: h.kind,
    ...(h.row ? { row: h.row } : {}),
  }));
  const bends = (course.bends ?? []).map((b) => ({ km: kmOf(b.at, `the bend '${b.name}' at`), name: b.name }));
  const weirs: LineWeirInput[] = [];
  for (const n of filled) {
    for (const path of n.works ?? []) {
      const row = workRows.get(path);
      if (!row || !String(row.class ?? '').endsWith('/thing/ControlStructure')) continue;
      if ((row.controlKind ?? 'weir') !== 'weir') continue;
      if (!(typeof row.headM === 'number' && row.headM > 0)) continue;
      const at = typeof row.at === 'string' && row.at !== '' ? row.at : `${course.key}:${n.name}`;
      const cite = RiverLine.parseCitation(at);
      if (!cite || cite.course !== course.key) continue;
      weirs.push({ km: kmOf(at, `the weir ${path} at`), row: path });
    }
  }
  return new RiverLine(
    {
      key: course.key,
      bed: course.bed ?? 'ground',
      wooded: course.banks?.wooded ?? true,
      seed: meanderSeed(course),
      nodes,
      stretches,
      bankOverrides,
      hazards,
      bends,
      weirs,
    },
    {
      poolGradient: dial('water.river.poolGradient', LINE_DIALS.poolGradient),
      stepGradient: dial('water.river.stepGradient', LINE_DIALS.stepGradient),
      rapidGradient: dial('water.river.rapidGradient', LINE_DIALS.rapidGradient),
      crossingFraction: dial('water.river.crossingFraction', LINE_DIALS.crossingFraction),
      strainerPerKm: dial('water.river.strainerPerKm', LINE_DIALS.strainerPerKm),
    },
  );
}

/**
 * A water work read from its ROW when it is not standing — the same two
 * answers its class gives live (`Conduit`, `ControlStructure`), from the
 * authored fields, with the classes' own defaults. `null` for a row that
 * is neither.
 */
function rowWork(
  row: Record<string, unknown> | undefined,
): (Withdrawing & Discharging) | null {
  if (!row) return null;
  const cls = String(row.class ?? '');
  const reachRef = str(row.reachRef);
  const num = (v: unknown, d: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : d;
  if (cls.endsWith('/thing/ControlStructure')) {
    const pass = Math.min(1, Math.max(0, num(row.passFraction, 1)));
    return {
      getReachRef: () => reachRef,
      withdrawalM3S: (natural: number) => Math.max(0, natural) * (1 - pass),
    };
  }
  if (cls.endsWith('/thing/Conduit')) {
    const direction = str(row.direction) || 'supply';
    const running = row.on === true && row.cut !== true;
    return {
      getReachRef: () => reachRef,
      withdrawalM3S: (natural: number) =>
        direction === 'supply' && running
          ? Math.min(num(row.capacityM3S, 0), Math.max(0, natural))
          : 0,
      getDischargeReach: () =>
        direction === 'disposal' && running ? reachRef : '',
      dischargeLoad: () => ({
        load: num(row.dischargeLoadPerSecond, 0),
        kind: (str(row.dischargeKind) || 'organic') as ContaminantKind,
      }),
    };
  }
  return null;
}

/**
 * ⭐ **A river's ends are required** (river D1): a course of two or more
 * nodes declares how it starts and where it ends, and every node its km
 * from the mouth, strictly decreasing source-first. A one-node still water
 * (a mere) is exempt — a lake has no direction to declare. Each failure
 * names the course, the shape of the uphill rule's message.
 */
function lineEndsHold(d: WatercourseDescriptor, problems: string[]): boolean {
  if (d.nodes.length < 2) return true;
  const before = problems.length;
  if (!d.source) {
    problems.push(
      `watercourse '${d.key}' declares no source — a river of two or more ` +
        `nodes says how it starts (rills, a spring, an outlet, melt)`,
    );
  }
  if (!d.mouth) {
    problems.push(
      `watercourse '${d.key}' declares no mouth — a river of two or more ` +
        `nodes says where it ends (a river, a still water, the sea, a sink)`,
    );
  }
  let prevKm = Infinity;
  for (const n of d.nodes) {
    if (typeof n.km !== 'number') {
      problems.push(`watercourse '${d.key}': node '${n.name}' authors no km from the mouth`);
      continue;
    }
    if (!(n.km < prevKm)) {
      problems.push(
        `watercourse '${d.key}': node '${n.name}' (km ${n.km}) is not below ` +
          `the node before it — km from the mouth falls source-first`,
      );
    }
    prevKm = n.km;
  }
  return problems.length === before;
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
    // Linear fill between the two control points — in km where the line
    // has them (river D1), else by index.
    const span = i - lastControl;
    const drop = prev.elevation! - (prev.drop ?? 0) - node.elevation;
    const kmSpan = (prev.km ?? 0) - (node.km ?? 0);
    for (let j = lastControl + 1; j < i; j++) {
      const t =
        typeof prev.km === 'number' && typeof node.km === 'number' && typeof nodes[j]!.km === 'number' && kmSpan > 0
          ? (prev.km - nodes[j]!.km!) / kmSpan
          : (j - lastControl) / span;
      nodes[j]!.elevation = prev.elevation! - (prev.drop ?? 0) - drop * t;
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

/** The register a shore's fishery read comes from (a path, not an import — no cycle). */
const FISHERY_PATH = '/system/water/idea/FisheryRegistry';
/** What a pail drawn from clean fresh water holds. */
/** How deep light reaches in a river nobody described, m. */
const RIVER_CLARITY_M = 3;
/** How deep light reaches in fouled water, m. */
const FOULED_CLARITY_M = 1;
const FRESH_WATER_PATH = '/stuff/idea/material/bulk/water';
/** What a pail drawn below an outfall holds — no sense announces it. */
const FOULED_WATER_PATH = '/stuff/idea/material/bulk/fouled-water';

/** The source's own half of a reach's read. */
interface ReachReadState {
  reach: CompiledReach;
  standing: FisheryStanding | null;
  ice: IceRecord | null;
  fouled: boolean;
  disciplineKey: string | null;
  /** The river at the read's position, on a line (river D1). */
  river: RiverState | null;
}

/**
 * The physical read: for everyone, and never a number. ⛔ Never *fouled*
 * — contamination announces itself to no sense; the outfall line is a
 * fact about the map.
 */
function physicalRead(state: ReachReadState): string[] {
  const reach = state.reach;
  const out: string[] = [];
  const name = reach.courseName || reach.courseKey;
  const river = state.river;
  out.push(`This is ${name}, ${breadthWords(river?.widthM ?? reach.channelWidthM)}.`);
  // ⭐ On a line: the stretch, its current in words, both banks (river D1)
  // — read from the water, never appended to an author's room prose.
  if (river !== null) out.push(...stretchLines(river));
  const water = state.standing?.water ?? null;
  if (water !== null) {
    const words = [
      currentWords(water.currentMps),
      salinityWords(water.salinityPpt),
      temperatureWords(water.temperatureK),
      hardnessWords(water.hardnessDgh),
    ];
    out.push(`The water is ${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}.`);
  }
  if ((state.standing?.contamination?.level ?? 0) > 0) {
    out.push('An outfall discharges into this water.');
  }
  // ⭐ The ice, for everyone and with no number in it (the climate build).
  // Whether it would bear you is a judgement, and `analyze water` is where
  // a trained eye makes it.
  const ice = state.ice;
  if (ice !== null && ice.thicknessM > 0) {
    out.push(
      ice.rotting
        ? 'Ice lies on it from bank to bank, grey and rotten.'
        : 'Ice lies on it from bank to bank.',
    );
  } else if (ice !== null && ice.reason === 'warm') {
    out.push('It is open water.');
  }
  return out;
}

/** The line at a read's position, in words: what the water does, both banks. */
function stretchLines(river: RiverState): string[] {
  const s = river.stretch;
  const out: string[] = [];
  const bend = s.bendName ? ` at ${s.bendName}` : '';
  out.push(`${STRETCH_WORDS[s.kind] ?? 'The river runs on'}${bend}; ${flowWords(river)}.`);
  out.push(`On the left, ${bankWords(s.banks.left)}; on the right, ${bankWords(s.banks.right)}.`);
  return out;
}

const STRETCH_WORDS: Record<string, string> = {
  pool: 'Here it lies in a long deep pool',
  run: 'Here it runs smooth and steady',
  riffle: 'Here it breaks over gravel in a shallow riffle',
  rapid: 'Here it is white water, pouring over rock',
  falls: 'Here it goes over the falls in a roaring sheet',
  gorge: 'Here it is shut in a gorge, rock walls on both hands',
};

/** How fast, how deep, how cold — never a number. */
function flowWords(river: RiverState): string {
  const v = Math.abs(river.currentMps);
  const pace = v < 0.1 ? 'barely moving' : v < 0.4 ? 'moving slowly' : v < 1 ? 'running briskly' : v < 2 ? 'running fast' : 'racing';
  const deep = river.depthM < 0.6 ? 'shallow enough to wade' : river.depthM < 1.5 ? 'about chest deep' : river.depthM < 4 ? 'over your head' : 'deep and dark';
  const up = river.currentMps < -0.05 ? ', the tide pushing it upstream' : '';
  return `the water is ${pace}${up}, ${deep}`;
}

function bankWords(bank: RiverBank): string {
  switch (bank.kind) {
    case 'bar':
      return 'shingle shelves out of the water';
    case 'shelving':
      return 'the gravel shelves gently up';
    case 'steep':
      return bank.wooded ? 'a steep bank of roots and earth' : 'a steep earth bank';
    case 'undercut':
      return 'a steep undercut of roots, the water sucking in beneath it';
    case 'wall':
      return 'sheer rock';
    case 'place':
      return bank.place ? `the ${bank.place}` : 'a made bank';
  }
}

function breadthWords(widthM: number | null): string {
  if (widthM === null || widthM < 10) return 'a narrow water';
  if (widthM < 30) return 'a stream you could throw a stone across';
  if (widthM < 100) return 'a broad river';
  return 'a great wide water';
}

function currentWords(mps: number): string {
  if (mps < 0.05) return 'still';
  if (mps < 0.3) return 'slow';
  return 'fast';
}

function salinityWords(ppt: number): string {
  if (ppt < 1) return 'fresh';
  if (ppt < 25) return 'brackish';
  return 'salt';
}

function temperatureWords(k: number): string {
  if (k < 280) return 'cold';
  if (k < 290) return 'cool';
  return 'warm';
}

function hardnessWords(dgh: number): string {
  // ⭐ The kernel's one rule (cleanliness D12): the river and the tap say
  // *soft* and *hard* the same way.
  return new WaterHardness(dgh).word();
}
/** Liquid water under a frozen surface — the floor a river's temperature reads. */
const UNDER_ICE_K = 274;

/** Numeric AppSetting read with a seeded-literal fallback. */
/** A read is shared for one weather segment (the shore's own memo window). */
const READ_SEGMENT_S = 6 * 3600;

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
 * ⭐ Both terms read the reach's SITE: the runoff takes only what fell
 * as rain there, and the snowmelt is the kernel's one snow function
 * (`WeatherApi.snowCoverAt`) — the same pack a floor at that latitude and
 * elevation reports lying on it. The lapse rate in the shared climate
 * expression is what makes altitude the thing that banks snow: the same
 * storm rains on the city and snows on the headwaters.
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
    reach.site,
  );
  const covered = fell.coveredS > 0 ? fell.coveredS : windowS;
  // mm over the window → metres per second over the catchment.
  const runoffM3S =
    ((fell.liquid.rawValue() / 1000) / covered) * areaM2 * runoff;

  const snow = WeatherApi.snowCoverAt(
    reach.site,
    climateOf(reach),
    Quantity.of(nowS, 's'),
    { meltWindowS: windowS },
  );
  const meltM3S = ((snow.meltMm / 1000) / snow.overS) * areaM2 * runoff;

  return {
    total: runoffM3S + meltM3S,
    melt: meltM3S,
    snowpackMm: snow.packMm,
  };
}

/* ─────────────────────────── ice ─────────────────────────── */

/**
 * The sheet on a still reach, walked over the kernel's exact snow walk
 * (which hands every segment's air and snow) from a capped start.
 */
function iceKey(ref: ReachRef, history?: IceHistory): string {
  if (!history) return ref;
  return `${ref}|${history.openedAtS ?? ''}|${history.bareFromS ?? ''}`;
}

function runningRecord(ref: ReachRef): IceRecord {
  return {
    ref,
    thicknessM: 0,
    quality: 'none',
    rotting: false,
    bearsKg: 0,
    reason: 'running',
    perennial: false,
  };
}

function computeIce(reach: CompiledReach, nowS: number, history?: IceHistory): IceRecord {
  const alphaClear = dial('water.ice.growthClear', 0.027);
  const alphaSnow = dial('water.ice.growthUnderSnow', 0.017);
  const meltPerKd = dial('water.ice.meltMPerKd', 0.005);
  const rotTdd = dial('water.ice.rotTddK', 10);
  const capM = dial('water.ice.perennialMaxM', 2.0);
  const bearing = dial('water.ice.bearingKgPerM2', 2.5e4);

  // ⭐ A patch opened (a cut, a break, a hole) is open water on its date:
  // nothing before it matters, and it regrows from nothing.
  const openedAtS = history?.openedAtS;
  const bareFromS = history?.bareFromS;
  let h = openedAtS !== undefined ? 0 : capM;
  let opened = openedAtS !== undefined;
  /** A scraped patch is bare until the first snow after it. */
  let bare = bareFromS !== undefined;
  /**
   * ⭐ Scraping planes the white top off: the grade from then on is the new
   * growth's, so the snow-ice fraction restarts at the scraping.
   */
  let planed = bareFromS === undefined;
  let fddTotal = 0;
  let fddUnderSnow = 0;
  /** Thawing degree-days per step, for the rot window. */
  const thaw: Array<{ atS: number; tdd: number }> = [];
  const freezeK = 273.15;

  WeatherApi.snowCoverAt(reach.site, climateOf(reach), Quantity.of(nowS, 's'), {
    onStep: (raw) => {
      let step = raw;
      if (openedAtS !== undefined) {
        const end = step.startsAtS + step.overlapS;
        if (end <= openedAtS) return;
        if (step.startsAtS < openedAtS) {
          step = { ...step, startsAtS: openedAtS, overlapS: end - openedAtS };
        }
      }
      if (bareFromS !== undefined && step.startsAtS + step.overlapS > bareFromS) {
        if (!planed) {
          planed = true;
          fddTotal = 0;
          fddUnderSnow = 0;
        }
        if (bare && step.phase === 'snow' && step.startsAtS >= bareFromS) bare = false;
        if (bare) step = { ...step, packMm: 0 };
      }
      const days = step.overlapS / SECONDS_PER_DAY;
      if (step.airK < freezeK) {
        const fdd = (freezeK - step.airK) * days;
        const alpha = step.packMm > 0 ? alphaSnow : alphaClear;
        h = Math.min(capM, Math.sqrt(h * h + alpha * alpha * fdd));
        fddTotal += fdd;
        if (step.packMm > 0) fddUnderSnow += fdd;
        thaw.push({ atS: step.startsAtS, tdd: 0 });
      } else {
        const tdd = (step.airK - freezeK) * days;
        h = Math.max(0, h - meltPerKd * tdd);
        thaw.push({ atS: step.startsAtS, tdd });
      }
      if (h <= 0) {
        // Open water: everything before this moment no longer matters.
        opened = true;
        fddTotal = 0;
        fddUnderSnow = 0;
      }
    },
  });

  if (h <= 0) {
    return {
      ref: reach.ref,
      thicknessM: 0,
      quality: 'none',
      rotting: false,
      bearsKg: 0,
      reason: 'warm',
      perennial: false,
    };
  }
  const recentTdd = thaw
    .filter((t) => t.atS >= nowS - 5 * SECONDS_PER_DAY)
    .reduce((sum, t) => sum + t.tdd, 0);
  return {
    ref: reach.ref,
    thicknessM: h,
    quality: fddTotal > 0 && fddUnderSnow / fddTotal >= 0.3 ? 'snow-ice' : 'black',
    rotting: recentTdd > rotTdd,
    bearsKg: bearing * h * h,
    reason: null,
    perennial: !opened,
  };
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
    if (typeof r.meanDepthM === 'number' && Number.isFinite(r.meanDepthM)) {
      node.meanDepthM = r.meanDepthM;
    }
    if (typeof r.km === 'number' && Number.isFinite(r.km)) node.km = r.km;
    if (typeof r.drop === 'number' && Number.isFinite(r.drop) && r.drop > 0) node.drop = r.drop;
    const stocks = stocksOf(r.stocks);
    if (stocks.length > 0) node.stocks = stocks;
    if (Array.isArray(r.works)) {
      const works = r.works.map(str).filter((p) => p !== '');
      if (works.length > 0) node.works = works;
    }
    out.push(node);
  }
  return out;
}

/** The authored stocking on a node — a species path and a count each. */
function stocksOf(value: unknown): WatercourseStock[] {
  if (!Array.isArray(value)) return [];
  const out: WatercourseStock[] = [];
  for (const raw of value) {
    if (raw === null || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const species = str(r.species);
    if (species === '') continue;
    if (typeof r.capacity === 'number' && Number.isFinite(r.capacity)) {
      out.push({ species, capacity: Math.max(0, Math.round(r.capacity)) });
    } else {
      out.push({ species });
    }
  }
  return out;
}

/** The course row's `water:` block, or `undefined` when it authors none. */
function waterOf(value: unknown): WatercourseWater | undefined {
  if (value === null || typeof value !== 'object') return undefined;
  const r = value as Record<string, unknown>;
  const out: WatercourseWater = {};
  for (const word of ['pH', 'hardnessDgh', 'nitrateMgL'] as const) {
    const n = r[word];
    if (typeof n === 'number' && Number.isFinite(n)) out[word] = n;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** The chemistry seed, every word filled from the dials where the row is silent. */
function seedOf(water: WatercourseWater | undefined): Required<WatercourseWater> {
  return {
    pH: water?.pH ?? dial('water.chemistry.pH', 7.2),
    hardnessDgh: water?.hardnessDgh ?? dial('water.chemistry.hardnessDgh', 8),
    nitrateMgL: water?.nitrateMgL ?? dial('water.chemistry.nitrateMgL', 1),
  };
}

function add(
  a: Required<WatercourseWater>,
  b: Required<WatercourseWater>,
  w: number,
): Required<WatercourseWater> {
  return {
    pH: a.pH + b.pH * w,
    hardnessDgh: a.hardnessDgh + b.hardnessDgh * w,
    nitrateMgL: a.nitrateMgL + b.nitrateMgL * w,
  };
}

function scale(a: Required<WatercourseWater>, k: number): Required<WatercourseWater> {
  return { pH: a.pH * k, hardnessDgh: a.hardnessDgh * k, nitrateMgL: a.nitrateMgL * k };
}

/** Build a descriptor from a template's `data`, or `null` if it is not one. */
function descriptorOf(
  data: Record<string, unknown>,
): WatercourseDescriptor | null {
  const key = str(data.key) || str(data.name);
  if (key === '') return null;
  const water = waterOf(data.water);
  const site = siteOfData(data.site);
  return {
    key,
    name: str(data.name) || key,
    basin: str(data.basin),
    nodes: nodesOf(data.nodes),
    branchesFrom: str(data.branchesFrom) === '' ? null : str(data.branchesFrom),
    ...(water ? { water } : {}),
    ...(site ? { site } : {}),
    ...(typeof data.clarityM === 'number' && data.clarityM > 0 ? { clarityM: data.clarityM } : {}),
    ...lineFieldsOf(data),
  };
}

/**
 * ⭐ The line's authored fields (river D1) — copied through by hand, for
 * the reason {@link nodesOf} gives: a field this parser does not copy is
 * silently discarded.
 */
function lineFieldsOf(data: Record<string, unknown>): Partial<WatercourseDescriptor> {
  const out: Partial<WatercourseDescriptor> = {};
  const obj = (v: unknown): Record<string, unknown> | null =>
    v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  const src = obj(data.source);
  if (src && typeof src.kind === 'string') out.source = { ...src } as WatercourseSource;
  const mouth = obj(data.mouth);
  if (mouth && typeof mouth.into === 'string') out.mouth = { ...mouth } as WatercourseMouth;
  if (typeof data.bed === 'string') out.bed = data.bed as WatercourseDescriptor['bed'];
  const banks = obj(data.banks);
  if (banks) out.banks = { ...(typeof banks.wooded === 'boolean' ? { wooded: banks.wooded } : {}) };
  const list = (v: unknown): Array<Record<string, unknown>> =>
    Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => obj(x) !== null) : [];
  const stretches = list(data.stretches);
  if (stretches.length > 0) out.stretches = stretches.map((x) => ({ ...x })) as WatercourseStretchOverride[];
  const hazards = list(data.hazards).filter((h) => typeof h.at === 'string' && typeof h.kind === 'string');
  if (hazards.length > 0) out.hazards = hazards.map((x) => ({ ...x })) as unknown as WatercourseHazard[];
  const bends = list(data.bends).filter((b) => typeof b.at === 'string' && typeof b.name === 'string');
  if (bends.length > 0) out.bends = bends.map((b) => ({ at: String(b.at), name: String(b.name) }));
  const meander = obj(data.meander);
  if (meander && typeof meander.seed === 'number') out.meander = { seed: meander.seed };
  return out;
}

/** The authored `site:` block, numbers only; `null` when absent. */
function siteOfData(value: unknown): WatercourseSite | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const num = (x: unknown): number | undefined =>
    typeof x === 'number' && Number.isFinite(x) ? x : undefined;
  const out: WatercourseSite = {};
  const lat = num(v.latitudeDeg);
  const cont = num(v.continentality);
  const off = num(v.offsetK);
  if (lat !== undefined) out.latitudeDeg = lat;
  if (cont !== undefined) out.continentality = cont;
  if (off !== undefined) out.offsetK = off;
  return out;
}

/** The authored shapes this catalogue speaks, re-exported for callers. */
export type { WatercourseDescriptor, WatercourseNode, WatercourseStock, WatercourseWater };
