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
//   - Reset (DEFERRED — same shape, same home): a game-time repop sweep
//     over `ResettableMixin`, restorative-of-self. When built it installs
//     a sibling `installResetSweep()` on the game-time clock and reads
//     `residency.reset.*`; the `runResetSweep` body mirrors the eviction
//     body below.
//
// See docs/subsystems/residency.md.

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { StuffApi } from '../../api/stuff';
import { ProxyApi } from '../../api/proxy';
import { ScheduleApi, type ScheduleHandle } from '../../api/schedule';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { ConnectionApi } from '../../api/connection';
import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';

const ResidencyApiCallers = SecurityPolicies.FromModule(
  '/api/residency#ResidencyApi',
);

/** Fallbacks used when AppSettings isn't warmed yet (tests / pre-boot). */
const DEFAULT_EVICTION_INTERVAL_MS = 60_000;
const DEFAULT_IDLE_MS = 1_800_000;
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

/**
 * Presence walk (the `WeatherLogic.runBoundaryFanout` pattern). A
 * connected player *in* a room is the strongest form of touch, so before
 * each scan we refresh the recency of every room a player occupies and
 * everything nested in it (co-occupants, floor items, and — since the
 * player is himself deep-contents of his room — each player's inventory).
 * This keeps a silently-occupied room warm even when nobody's dispatching
 * methods. It is a touch *source*, not a pin: it just bumps `lastTouched`.
 */
function presenceWalkImpl(): void {
  const visited = new Set<string>();
  for (const interactive of ConnectionApi.getAllInteractives()) {
    const holder = interactive.getHolder();
    if (holder === null || !MixinApi.isContainable(holder)) continue;
    const room = (holder as Stuff & Containable).getContainer();
    if (room === null || !MixinApi.isContainer(room)) continue;
    if (visited.has(room.stuffId)) continue;
    visited.add(room.stuffId);
    ProxyApi.unwrap(room).touch();
    for (const item of (room as Stuff & Container).getDeepContents()) {
      ProxyApi.unwrap(item).touch();
    }
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
function runEvictionSweep(): void {
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
      () => runEvictionSweep(),
    );
  }

  /** Run one eviction sweep synchronously (test / manual seam). */
  @CallSecurity(ResidencyApiCallers)
  public evictNow(): void {
    runEvictionSweep();
  }
}
