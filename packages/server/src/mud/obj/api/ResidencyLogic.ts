// ResidencyLogic — the cold-tail self-eviction sweep behind ResidencyApi.
//
// A lazy, real-time O(n) scan: every idle object (untouched past the
// threshold) is asked `canEvict`; consenters are culled via the ordinary
// `StuffApi.destruct` choreography. This is a garbage-culler for abandoned
// world state, NOT a swapfile — culled objects are gone; a later reference
// re-clones them fresh from template. See docs/subsystems/residency.md.

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { StuffApi } from '../../api/stuff';
import { ProxyApi } from '../../api/proxy';
import { ScheduleApi, type ScheduleHandle } from '../../api/schedule';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';

const ResidencyApiCallers = SecurityPolicies.FromModule(
  '/api/residency#ResidencyApi',
);

/** Fallbacks used when AppSettings isn't warmed yet (tests / pre-boot). */
const DEFAULT_SWEEP_MS = 60_000;
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

function readMode(): 'observe' | 'enforce' {
  try {
    return AppApi.setting(AppSettingKeys.residencyMode) === 'enforce'
      ? 'enforce'
      : 'observe';
  } catch {
    return 'observe'; // fail safe: never cull when settings are unavailable
  }
}

/**
 * The lazy O(n) cold-tail scan. `getAllObjects()` returns proxies, so we
 * read recency and ask `canEvict` on the **raw** target — the sweep's own
 * introspection must never count as a touch. In enforce mode, consenters
 * are culled through `StuffApi.destruct` (the full choreography). Mode is
 * re-read each sweep, so flipping `residency.mode` needs no restart.
 */
function sweepImpl(): void {
  const mode = readMode();
  const idleThreshold = readInt(
    AppSettingKeys.residencyIdleThresholdMs,
    DEFAULT_IDLE_MS,
  );
  const now = Date.now();
  let candidates = 0;
  let culled = 0;
  const sample: string[] = [];

  for (const obj of StuffApi.getAllObjects()) {
    const raw = ProxyApi.unwrap(obj);
    const idleMs = now - raw.getLastTouched();
    if (idleMs < idleThreshold) continue;
    if (!raw.canEvict({ idleMs, reason: 'idle' }).ok) continue;
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
        `[residency] observe: ${candidates} cull candidate(s) ` +
          `idle >= ${idleThreshold}ms; sample: ${sample.join(', ')}`,
      );
    }
  } else if (candidates > 0) {
    console.info(
      `[residency] enforce: culled ${culled}/${candidates} candidate(s)`,
    );
  }
}

/**
 * @internal — the logic singleton behind `ResidencyApi`. Registers at
 * `/obj/api/residency`; methods admit only the `ResidencyApi` face.
 * Extends `ApiLogic`, so it is itself residency-exempt.
 */
export class ResidencyLogic extends ApiLogic {
  /** The recurring sweep handle — retained so re-install is a no-op. */
  private sweepHandle: ScheduleHandle | null = null;

  /** Install the real-time cold-tail sweep (idempotent). */
  @CallSecurity(ResidencyApiCallers)
  public installSweep(): void {
    if (this.sweepHandle) return;
    this.sweepHandle = ScheduleApi.recurring(
      readInt(AppSettingKeys.residencySweepIntervalMs, DEFAULT_SWEEP_MS),
      () => sweepImpl(),
    );
  }

  /** Run one sweep synchronously (test / manual seam). */
  @CallSecurity(ResidencyApiCallers)
  public sweepNow(): void {
    sweepImpl();
  }
}
