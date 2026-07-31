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
      const room = (holder as Stuff & Containable).getContainer();
      if (room === null || !MixinApi.isContainer(room)) return;
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

/** Whether `raw` sits (at any depth) inside one of the present rooms. */
function isInPresentRoom(raw: Stuff, presentRooms: Set<string>): boolean {
  if (presentRooms.size === 0) return false;
  let node: Stuff | null = MixinApi.isContainable(raw)
    ? (raw as Stuff & Containable).getContainer()
    : null;
  while (node !== null) {
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
}
