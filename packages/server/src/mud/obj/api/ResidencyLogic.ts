// ResidencyLogic — scheduled object self-maintenance, behind ResidencyApi.
//
// Residency hosts a family of scheduled sweeps that share one shape: the
// engine periodically visits objects and lets each decide a maintenance
// action on itself ("engine informs, object decides").
//
//   - Eviction (SHIPPED): a lazy, real-time O(n) cold-tail scan. Every
//     idle object (untouched past the threshold) is asked `canEvict`;
//     consenters are culled via the ordinary `StuffApi.destruct`
//     choreography. A garbage-culler for abandoned world state, NOT a
//     swapfile — culled objects are gone; a later reference re-clones
//     them fresh from template.
//   - Reset (SHIPPED): a game-time repop sweep over `ResettableMixin`,
//     restorative-of-self (the eviction sibling). Installs
//     `installResetSweep()` on the game-time clock (`WorldClockApi.every`
//     — it freezes with a paused world) and reads `residency.reset.*`; the
//     `runResetSweep` body mirrors the eviction body, but the predicate is
//     presence-SKIP + object-override (a shop restocks while browsed), not
//     eviction's idle + `canEvict`. Only the shop's Stock is wired today.
//
// See docs/subsystems/residency.md.

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { StuffApi } from '../../api/stuff';
import { ProxyApi } from '../../api/proxy';
import { SecurityApi } from '../../api/security';
import { ScheduleApi, type ScheduleHandle } from '../../api/schedule';
import { ZoneApi } from '../../api/zone';
import { Census, type WorldCensus } from '../../lib/residency/Census';
import { SpawnTable, type SpawnCandidate } from '../../lib/residency/SpawnTable';
import type { Circulating } from '../../lib/residency/Circulating';
import { WorldClockApi, type ClockHandle } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { Quantity } from '../../lib/quantity';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { ConnectionApi } from '../../api/connection';
import { MixinApi } from '../../api/mixin';
import { PersistableApi } from '../../api/persistable';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import type { Resettable } from '../../lib/residency/Resettable';

const ResidencyApiCallers = SecurityPolicies.FromModule(
  '/api/residency#ResidencyApi',
);

/** Fallbacks used when AppSettings isn't warmed yet (tests / pre-boot). */
const DEFAULT_EVICTION_INTERVAL_MS = 60_000;
const DEFAULT_IDLE_MS = 1_800_000;
const DEFAULT_RESET_INTERVAL_S = 3_600; // one game-hour

/** Spawn-sweep cadence — a game-day. *Calibrate at launch.* */
const DEFAULT_SPAWN_INTERVAL_S = 24 * 3_600;
/**
 * How much a region's declared `favours` tag multiplies a candidate's
 * draw weight. The `inflow` half of `S* = inflow/d` is the stock TARGET;
 * this only shifts WHICH item fills it. *Calibrate at launch.*
 */
const DEFAULT_SPAWN_AFFINITY_BOOST = 3;
const OBSERVE_SAMPLE_CAP = 20;

function readInt(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback; // AppSettings not warmed (pre-boot / tests)
  }
}

function readEvictionMode(): 'observe' | 'enforce' {
  try {
    return AppApi.setting(AppSettingKeys.residencyEvictionMode) === 'enforce'
      ? 'enforce'
      : 'observe';
  } catch {
    return 'observe'; // fail safe: never cull when settings are unavailable
  }
}

function readResetMode(): 'observe' | 'enforce' {
  try {
    return AppApi.setting(AppSettingKeys.residencyResetMode) === 'enforce'
      ? 'enforce'
      : 'observe';
  } catch {
    return 'observe'; // fail safe: never repop when settings are unavailable
  }
}

/**
 * Presence walk (the `WeatherLogic.runBoundaryFanout` pattern). A
 * connected player *in* a room is the strongest form of touch, so before
 * each scan we refresh the recency of every room a player occupies and
 * everything nested in it (co-occupants, floor items, and — since the
 * player is himself deep-contents of his room — each player's inventory).
 * This keeps a silently-occupied room warm even when nobody's dispatching
 * methods. It is a touch *source*, not a pin: it just bumps `lastTouched`.
 *
 * Returns the set of present-room `stuffId`s — the eviction sweep ignores
 * it (calls for the touch side-effect), the reset sweep reads it to skip
 * repop-ing a room a player occupies (`isInPresentRoom`).
 */
function presenceWalkImpl(): Set<string> {
  const visited = new Set<string>();
  for (const interactive of ConnectionApi.getAllInteractives()) {
    const holder = interactive.getHolder();
    if (holder === null || !MixinApi.isContainable(holder)) continue;
    // The sweep runs from a field root, but a holder may be a wire body
    // standing in a circle — reading its room is a cross-boundary
    // dispatch. Residency spans the boundary BY DEFINITION: it keeps
    // alive whatever is in use, and a room someone is standing in must
    // not be culled out from under them, circle or field.
    //
    // Skipping those holders is not the answer either. This walk is the
    // keep-alive for EVERYONE, and an uncaught deny aborts it at the
    // first circle occupant — so one player stepping into their own
    // circle silently turned off residency keep-alive for the whole
    // world. Per-holder, so the aperture stays as narrow as the reach.
    SecurityApi.projectAcross(holder, undefined, () => {
      // `holder` may be raw here, so the proxy self-heal need not have
      // run — see `isInPresentRoom`. A destroyed room keeps nothing
      // alive, so drop it rather than touching it.
      const room = (holder as Stuff & Containable).getContainer();
      if (room === null || room.isDestroyed()) return;
      if (!MixinApi.isContainer(room)) return;
      if (visited.has(room.stuffId)) return;
      visited.add(room.stuffId);
      ProxyApi.unwrap(room).touch();
      for (const item of (room as Stuff & Container).getDeepContents()) {
        ProxyApi.unwrap(item).touch();
      }
    });
  }
  return visited;
}

/**
 * Whether `raw` sits (at any depth) inside one of the present rooms.
 *
 * ⚠ This walk runs on RAW targets by design (enumeration must never
 * count as a touch), and the `ref: 'instance'` self-heal lives in the
 * proxy get trap — so it does NOT run here. `getContainer()` on a raw
 * object can therefore hand back a destroyed container, where before
 * the reference-lifetime build the getter's own hand-written heal
 * caught it on any receiver.
 *
 * The explicit `isDestroyed()` break restores that. It is the honest
 * shape: the raw-target gap is a property of reading raw, so the site
 * that chooses raw carries the guard rather than every getter carrying
 * a duplicate of the framework rule.
 */
function isInPresentRoom(raw: Stuff, presentRooms: Set<string>): boolean {
  if (presentRooms.size === 0) return false;
  let node: Stuff | null = MixinApi.isContainable(raw)
    ? (raw as Stuff & Containable).getContainer()
    : null;
  while (node !== null && !node.isDestroyed()) {
    if (presentRooms.has(node.stuffId)) return true;
    node = MixinApi.isContainable(node)
      ? (node as Stuff & Containable).getContainer()
      : null;
  }
  return false;
}

/**
 * The reset sweep — the game-time repop scan, the eviction sibling. Visits
 * every `ResettableMixin` object and lets it restore itself (`reset`). The
 * predicate is presence-SKIP + object-override: an object in a room a
 * player occupies is skipped *unless* it opts in via `resetsWhilePresent()`
 * (a shop restocks while browsed). Runs on the game clock, so it freezes
 * with a paused world; mode (`residency.reset.mode`) is re-read each sweep.
 */
/** What one spawn sweep did — the `observe`-mode surface. */
export interface SpawnSweepReport {
  /** Regions considered. */
  regions: number;
  /** Draws the table DECLINED because the region was at target. */
  declined: number;
  /** Items actually placed (0 in `observe` mode). */
  placed: number;
}

/**
 * **The spawn sweep** — the random injection channel (D31).
 *
 * The census is taken **once** and shared across every decision in the
 * sweep, never re-taken per candidate: that is the difference between
 * one query per sweep and one per spawn, and it is the cost note the
 * plan's risk register flagged.
 *
 * Ships `observe`-first like its two siblings, so the algorithm can be
 * watched in production before it places anything. Weights, rates and
 * targets are *calibrate at launch* (D21) — this delivers the algorithm
 * and honest defaults, not balanced numbers.
 *
 * ⚠ It touches **nothing** about `ParcelRecord.allowance`. That field
 * exists already and is the inert Phase-1 compute-economy seam; it is
 * not a spawn budget and must not become one.
 */
async function runSpawnSweep(): Promise<SpawnSweepReport> {
  const census = await Census.takeCensus();
  const mode = readSpawnMode();
  const report: SpawnSweepReport = {
    regions: census.size,
    declined: 0,
    placed: 0,
  };

  // v1 candidate set: every circulating template the world already
  // knows. The AUTHORED half of D31 (a declared par on a resettable
  // holder) rides the shipped reset sweep above and is deliberately
  // untouched here — `populates:` likewise stays what it is, a
  // clone-time cascade for set dressing, never the injection path for
  // economy-bearing items.
  const candidates = collectSpawnCandidates();
  if (candidates.length === 0) return report;

  for (const region of census.keys()) {
    const { stocks, affinity } = await regionStockFor(region);
    // A zone's declared count wins over the item's baseline.
    const scoped = candidates.map((c) => {
      const declared = stocks[c.censusKey];
      return typeof declared === 'number'
        ? { ...c, regionTarget: declared }
        : c;
    });
    const pick = SpawnTable.draw(scoped, census, region, { affinity });
    if (!pick) {
      // The region is at target for everything the table could place.
      // This is authored placement suppressing random spawning without
      // either channel knowing about the other — and it is REGIONAL,
      // never global (AC 34).
      report.declined++;
      continue;
    }
    if (mode === 'enforce') {
      try {
        await StuffApi.clone(pick.templatePath);
        report.placed++;
      } catch (err) {
        console.warn('[residency] spawn clone failed', pick.templatePath, err);
      }
    }
  }
  return report;
}

/**
 * **What a region stocks, and what it favours.**
 *
 * Both read off the Zone through the ordinary `lookupField` walk (the
 * `suppressesMagic` / `celestialProfile` precedent), so a parent zone's
 * declaration covers its descendants and a child can narrow it —
 * regional stock inherits exactly like every other zone field.
 *
 * - `stocks` — `{ censusKey: count }`. Overrides the item's baseline.
 * - `favours` — material tags this region prefers, which is what finally
 *   gives `Circulating.materialTags` something to multiply against. A
 *   mine stocks metal; a grove stocks wood.
 *
 * A zone that declares neither leaves every item on its own baseline and
 * a neutral affinity, so distribution works in un-authored regions
 * rather than silently placing nothing.
 */
async function regionStockFor(region: string): Promise<{
  stocks: Record<string, number>;
  affinity: Map<string, number>;
}> {
  const empty = { stocks: {}, affinity: new Map<string, number>() };
  if (!region) return empty;
  try {
    const zone = await ZoneApi.resolveZoneForPath(region);
    if (!zone) return empty;
    const stocks =
      (await zone.lookupField<Record<string, number>>('stocks')) ?? {};
    const favours = (await zone.lookupField<string[]>('favours')) ?? [];
    const affinity = new Map<string, number>();
    const boost = readInt(
      AppSettingKeys.residencySpawnAffinityBoost,
      DEFAULT_SPAWN_AFFINITY_BOOST,
    );
    for (const tag of favours) {
      if (typeof tag === 'string') affinity.set(tag, boost);
    }
    return { stocks, affinity };
  } catch {
    return empty;
  }
}

/**
 * The templates the spawn table may draw from — every live circulating
 * thing's own template, deduped by census key + path.
 *
 * v1 reads the live world rather than a separate registry, which keeps
 * the candidate set honest (a thing that exists somewhere can be
 * stocked) and avoids minting a table nobody would remember to update.
 */
function collectSpawnCandidates(): SpawnCandidate[] {
  const byPath = new Map<string, SpawnCandidate>();
  for (const obj of StuffApi.getAllObjects()) {
    const raw = ProxyApi.unwrap(obj);
    if (!MixinApi.isCirculating(raw)) continue;
    const c = obj as Stuff & Circulating;
    const templatePath = c.getTemplatePath();
    const censusKey = c.getCensusKey();
    if (!templatePath || censusKey.length === 0) continue;
    if (byPath.has(templatePath)) continue;
    byPath.set(templatePath, {
      templatePath,
      censusKey,
      effectTags: c.getEffectTags(),
      materialTags: c.getMaterialTags(),
      // The ITEM's own baseline. A Zone that declares a stock list
      // overrides it per region (see `regionStockFor`) — "how many
      // wands this forest holds" is properly a fact about the forest.
      regionTarget: c.getRegionTarget(),
    });
  }
  return [...byPath.values()];
}

/** `observe` (default) | `enforce` — the sibling of the two shipped modes. */
function readSpawnMode(): string {
  try {
    const raw = AppApi.setting(AppSettingKeys.residencySpawnMode);
    return raw === 'enforce' ? 'enforce' : 'observe';
  } catch {
    return 'observe';
  }
}

async function runResetSweep(): Promise<void> {
  let presentRooms: Set<string>;
  try {
    presentRooms = presenceWalkImpl();
  } catch (err) {
    console.warn('[residency] presence walk failed; resetting anyway', err);
    presentRooms = new Set();
  }

  const mode = readResetMode();
  let candidates = 0;
  let reset = 0;
  const sample: string[] = [];

  // Deliberately NOT an MQL query (the antipattern-sweep exemption):
  // the sweep works on RAW unwrapped targets so enumeration never
  // counts as a residency touch, which fights MQL's proxy-mediated,
  // recognition-relative candidate emission. Engine self-maintenance
  // over raw proxies stays a hand walk; everything else uses MQL.
  for (const obj of StuffApi.getAllObjects()) {
    const raw = ProxyApi.unwrap(obj);
    if (!MixinApi.isResettable(raw)) continue;
    // Ask/act on the proxy so `this`-relative framework state resolves.
    const r = obj as Stuff & Resettable;
    // Presence skip (respect a watched room) unless the object opts in.
    if (isInPresentRoom(raw, presentRooms) && !r.resetsWhilePresent()) {
      continue;
    }
    candidates++;
    if (mode === 'enforce') {
      try {
        await r.reset();
        reset++;
      } catch (err) {
        console.warn(`[residency] reset failed for ${raw.stuffId}`, err);
      }
    } else if (sample.length < OBSERVE_SAMPLE_CAP) {
      sample.push(raw.getTemplatePath() || raw.stuffId);
    }
  }

  if (mode === 'observe') {
    if (candidates > 0) {
      console.info(
        `[residency] reset observe: ${candidates} resettable candidate(s); ` +
          `sample: ${sample.join(', ')}`,
      );
    }
  } else if (candidates > 0) {
    console.info(
      `[residency] reset enforce: reset ${reset}/${candidates} candidate(s)`,
    );
  }
}

/**
 * The eviction sweep — the lazy O(n) cold-tail scan. `getAllObjects()`
 * returns proxies. Recency is read on the **raw** target
 * (`getLastTouched`) so the idle check never counts as a touch — that's
 * what keeps idle detection honest. `canEvict`, by contrast, is asked on
 * the **proxy**, because a veto's self-knowledge may be `this`-relative
 * through the framework (a shadow's host lives in a proxy-keyed WeakMap,
 * so `this.host` only resolves when `this` is the proxy). The touch that
 * proxy-dispatch incurs is harmless here: only cold-tail candidates
 * (already past the idle threshold) are asked, and the ask happens
 * *after* the idle decision — a culled candidate is moot, a vetoing one
 * is merely refreshed (it would veto again anyway). In enforce mode,
 * consenters are culled through `StuffApi.destruct` (the full
 * choreography). Mode is re-read each sweep, so flipping
 * `residency.eviction.mode` needs no restart.
 */
async function runEvictionSweep(): Promise<void> {
  // Refresh presence first, so a silently-occupied room and its contents
  // read as warm when the scan below evaluates them. Best-effort: a
  // connection-layer hiccup must never crash the sweep.
  try {
    presenceWalkImpl();
  } catch (err) {
    console.warn('[residency] presence walk failed; scanning anyway', err);
  }

  const mode = readEvictionMode();
  const idleThreshold = readInt(
    AppSettingKeys.residencyEvictionIdleThresholdMs,
    DEFAULT_IDLE_MS,
  );
  const now = Date.now();
  let candidates = 0;
  let culled = 0;
  const sample: string[] = [];

  // Raw hand walk, not MQL — same exemption as the reset sweep above
  // (enumeration over unwrapped targets must never count as a touch).
  for (const obj of StuffApi.getAllObjects()) {
    const raw = ProxyApi.unwrap(obj);
    const idleMs = now - raw.getLastTouched(); // raw: idle check must not touch
    if (idleMs < idleThreshold) continue;
    // Ask on the proxy so `this`-relative vetoes resolve (e.g. a shadow's
    // proxy-keyed host); harmless post-decision touch of a cold candidate.
    if (!obj.canEvict({ idleMs, reason: 'idle' }).ok) continue;
    candidates++;

    if (mode === 'enforce') {
      try {
        // Persistence spine: a persistable host must capture its contents
        // to a durable `PersistedRecord` BEFORE the cull — rooms/chests
        // have no autosave backstop, so a dropped eviction write is silent
        // data loss (pre-build note #1). Await the capture, then destruct;
        // the sync `PersistableMixin.cleanupOnDestruct` remains the
        // non-sweep backstop. Capture failure aborts THIS cull (keep the
        // resident host over losing its contents) and keeps sweeping.
        if (MixinApi.isPersistable(raw)) {
          await PersistableApi.capture(obj);
        }
        StuffApi.destruct(obj);
        culled++;
      } catch (err) {
        // `canEvict` and `canDestruct` are independent gates: an object
        // that permits eviction may still veto destruct. Log and keep
        // sweeping rather than crashing the tick.
        console.warn(
          `[residency] destruct refused for ${raw.stuffId}; skipping`,
          err,
        );
      }
    } else if (sample.length < OBSERVE_SAMPLE_CAP) {
      sample.push(raw.getTemplatePath() || raw.stuffId);
    }
  }

  if (mode === 'observe') {
    if (candidates > 0) {
      console.info(
        `[residency] eviction observe: ${candidates} cull candidate(s) ` +
          `idle >= ${idleThreshold}ms; sample: ${sample.join(', ')}`,
      );
    }
  } else if (candidates > 0) {
    console.info(
      `[residency] eviction enforce: culled ${culled}/${candidates} candidate(s)`,
    );
  }
}

/**
 * @internal — the logic singleton behind `ResidencyApi`. Registers at
 * `/obj/api/residency`; methods admit only the `ResidencyApi` face.
 * Extends `ApiLogic`, so it is itself residency-exempt. Owns one retained
 * handle per scheduled sweep (the eviction sweep today; the reset sweep
 * gets a sibling handle + `installResetSweep()` when built).
 */
export class ResidencyLogic extends ApiLogic {
  /** The recurring eviction-sweep handle — retained so re-install is a no-op. */
  private evictionHandle: ScheduleHandle | null = null;

  /** Install the real-time cold-tail eviction sweep (idempotent). */
  @CallSecurity(ResidencyApiCallers)
  public installEvictionSweep(): void {
    if (this.evictionHandle) return;
    this.evictionHandle = ScheduleApi.recurring(
      readInt(
        AppSettingKeys.residencyEvictionIntervalMs,
        DEFAULT_EVICTION_INTERVAL_MS,
      ),
      // Fire-and-forget the async sweep; a persistable host's capture is
      // awaited INSIDE the sweep before its cull, so durability holds even
      // though the recurring callback doesn't await the sweep itself.
      () => {
        void runEvictionSweep().catch((err) =>
          console.warn('[residency] eviction sweep failed', err),
        );
      },
    );
  }

  /** Run one eviction sweep (test / manual seam). Awaits durable capture. */
  @CallSecurity(ResidencyApiCallers)
  public async evictNow(): Promise<void> {
    await runEvictionSweep();
  }

  /** The recurring reset-sweep handle (game-time) — retained so re-install no-ops. */
  private resetHandle: ClockHandle | null = null;

  /** Install the game-time reset (repop) sweep (idempotent). */
  @CallSecurity(ResidencyApiCallers)
  public installResetSweep(): void {
    if (this.resetHandle) return;
    this.resetHandle = WorldClockApi.every(
      Quantity.of(
        readInt(
          AppSettingKeys.residencyResetIntervalS,
          DEFAULT_RESET_INTERVAL_S,
        ),
        's',
      ),
      () => {
        void runResetSweep().catch((err) =>
          console.warn('[residency] reset sweep failed', err),
        );
      },
    );
  }

  /** Run one reset sweep (test / manual seam). */
  @CallSecurity(ResidencyApiCallers)
  public async resetNow(): Promise<void> {
    await runResetSweep();
  }

  /** The recurring spawn-sweep handle (game-time) — retained so re-install no-ops. */
  private spawnHandle: ClockHandle | null = null;

  /**
   * Install the game-time **spawn sweep** (idempotent) — the third
   * member of the self-maintenance family, alongside eviction and
   * reset (magic-items D30/D31).
   *
   * Same shape, same clock, same `observe`/`enforce` discipline, and the
   * same file on purpose: it is the one home already allowlisted for raw
   * enumeration, so if the census ever needs to become sweep-cached the
   * move is local rather than an allowlist edit.
   */
  @CallSecurity(ResidencyApiCallers)
  public installSpawnSweep(): void {
    if (this.spawnHandle) return;
    this.spawnHandle = WorldClockApi.every(
      Quantity.of(
        readInt(
          AppSettingKeys.residencySpawnIntervalS,
          DEFAULT_SPAWN_INTERVAL_S,
        ),
        's',
      ),
      () => {
        void runSpawnSweep().catch((err) =>
          console.warn('[residency] spawn sweep failed', err),
        );
      },
    );
  }

  /** Run one spawn sweep (test / manual seam). */
  @CallSecurity(ResidencyApiCallers)
  public async spawnNow(): Promise<SpawnSweepReport> {
    return runSpawnSweep();
  }

  /** See {@link ResidencyApi.takeCensus}. */
  @CallSecurity(ResidencyApiCallers)
  public takeCensus(): Promise<WorldCensus> {
    return Census.takeCensus();
  }
}
