/**
 * RespirationDrain / RespirationRecovery — the bounded crisis-drain and
 * its sibling recovery engagement. Respiration is the **first concrete
 * engagement producer** in the codebase (the activity framework shipped
 * inert — see `docs/subsystems/activity.md`).
 *
 * Both are `SustainedEngagement`s (no `duration` / `onComplete`): they
 * run until an explicit `SchedulerApi.cancel` ends them, not until a
 * timer completes. Each carries one recurring `ScheduledEmission` that
 * delegates back to the host mixin — the drain math, the death seam, the
 * cancel-on-resume re-resolve all live on `RespirationMixin` where the
 * host state is, so the emission closure stays a thin delegate (the
 * `activity.md` decision-3 caveat: emission closures are pinned to
 * construction; keep them code-only-edit-friendly).
 *
 * Lifecycle dispatch (`onAbort`, `getHost`) routes through the
 * activity-class registry, so both register themselves at module load.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Engaged, EngagementSlot } from '../activity/Engaged';
import type {
  ScheduledEmission,
  SustainedEngagement,
} from '../../api/scheduler';
import { SchedulerApi } from '../../api/scheduler';
import type { AbortReason } from '@saxonberg/types';
import { WorldClockApi } from '../../api/worldclock';
import { RESPIRATION_DEFAULTS } from './Respiration';
import type { Respiration } from './Respiration';

/**
 * Why a body is failing to exchange air. The engine is built
 * medium-agnostic / three-trigger-ready, but only `'medium'` (W1) and
 * `'supply'` (W2 tank-exhausted) are produced in this build; `'channel'`
 * (strangulation / voice-theft) is accepted by the type and never fired
 * (no struggle/grapple substrate exists yet — a documented seam).
 */
export type RespirationCause = 'medium' | 'supply' | 'channel';

/** Stamp `startedAt` from game-time when a clock is running; else 0. */
function gameStartedAtMs(): number {
  try {
    return WorldClockApi.getNow().rawValue() * 1000;
  } catch {
    return 0;
  }
}

/**
 * The crisis drain: a body that has stopped exchanging air. Occupies the
 * `'body'` slot (the `'voice'` slot is reserved for the deferred
 * strangulation channel). Its emission lowers `spo2` past the
 * consciousness floor and on to the death seam — see
 * `RespirationMixin.respirationDrainTick`.
 */
export class RespirationDrain implements SustainedEngagement {
  engagementId = '';
  readonly type = 'respiration-drain';
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set<EngagementSlot>([
    'body',
  ]);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable = true;
  readonly cause: RespirationCause;
  readonly emissions: readonly ScheduledEmission[];

  constructor(actor: Stuff & Engaged & Respiration, cause: RespirationCause) {
    this.actor = actor;
    this.cause = cause;
    this.emissions = [
      {
        intervalMs: RESPIRATION_DEFAULTS.EMISSION_INTERVAL_MS,
        event: ({ engagement, actor }): void => {
          (actor as unknown as Respiration).respirationDrainTick(
            engagement as RespirationDrain,
          );
        },
      },
    ];
  }

  onStart(): void {
    this.startedAt = gameStartedAtMs();
  }

  onAbort(_reason: AbortReason): void {
    // No rollback — aborts fire before any state change, by design.
    void _reason;
  }

  getHost(): Stuff | null {
    return this.actor as unknown as Stuff;
  }
}

/**
 * The recovery: a body that has reached breathable air again. Same shape
 * as the drain, opposite-sign emission — re-raises `spo2` toward baseline
 * and self-cancels at baseline (no overshoot). Keeping recovery an
 * engagement (not an instant snap) makes the unconscious→conscious
 * transition observable on the same cadence the drain used, and the
 * benign steady state stays zero-cost once it self-cancels.
 */
export class RespirationRecovery implements SustainedEngagement {
  engagementId = '';
  readonly type = 'respiration-recovery';
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set<EngagementSlot>([
    'body',
  ]);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable = true;
  readonly emissions: readonly ScheduledEmission[];

  constructor(actor: Stuff & Engaged & Respiration) {
    this.actor = actor;
    this.emissions = [
      {
        intervalMs: RESPIRATION_DEFAULTS.EMISSION_INTERVAL_MS,
        event: ({ engagement, actor }): void => {
          (actor as unknown as Respiration).respirationRecoverTick(
            engagement as RespirationRecovery,
          );
        },
      },
    ];
  }

  onStart(): void {
    this.startedAt = gameStartedAtMs();
  }

  onAbort(_reason: AbortReason): void {
    void _reason;
  }

  getHost(): Stuff | null {
    return this.actor as unknown as Stuff;
  }
}

// Register both lifecycle classes at module load (the HMR seam — a
// `HotReloadApi.reload` re-runs this side-effect and overwrites the
// entries; the next lifecycle fire uses the latest class).
SchedulerApi.registerActivity('respiration-drain', RespirationDrain);
SchedulerApi.registerActivity('respiration-recovery', RespirationRecovery);
