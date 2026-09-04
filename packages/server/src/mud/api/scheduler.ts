/**
 * SchedulerApi — thin facade over the engagement-framework runtime.
 *
 * Stable caller-facing surface. The orchestration + registry resolution
 * live in the hot-reloadable {@link SchedulerLogic} singleton at
 * `/platform/idea/api/scheduler`, reached synchronously via
 * `StuffApi.singletonSync`; the Logic resolves the `SchedulerRegistry`
 * singleton (at `/platform/idea/SchedulerRegistry`) where all engagement state
 * actually lives. `dest /platform/idea/api/scheduler` reloads the Logic; the
 * Registry's state is unaffected.
 *
 * The Registry's public methods carry a gate that admits this module
 * AND the logic singleton (`FromTemplate('/platform/idea/api/scheduler')`), so
 * external code that grabs the Registry Stuff via
 * `StuffApi.findByTemplatePath` still cannot call its methods. The
 * narrow-entry pattern holds: state has one home, and one
 * structurally-enforced path between callers and it.
 *
 * `SecurityApi.decorateApiClass` at the bottom stamps frame-push
 * wrappers on every static method so downstream `ApiOnly` checks find
 * `SchedulerApi` on the stack.
 */

import type {
  AbortReason,
  EngagementCancelledNote,
  EngagementCompletedNote,
  EngagementStartedNote,
} from '@saxonberg/types';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Engaged, EngagementSlot } from '../lib/activity/Engaged';
import { SecurityApi } from './security';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SchedulerLogic } from '../platform/idea/api/SchedulerLogic';
import { fileURLToPath } from 'url';

// DI seam: re-exported so `SchedulerRegistry` registers its class through
// this facade rather than importing the logic singleton directly (the
// no-import-from-*Logic rule). The load-time mechanism lives in
// `SchedulerLogic`; this is a pure pass-through re-export.

/* ─────────────────────────── public surface types ─────────────────────────── */

/**
 * Activity-specific cadenced side-effect descriptor.
 */
export interface ScheduledEmission {
  intervalMs: number;
  event: (ctx: {
    engagement: Engagement;
    actor: Stuff & Engaged;
    elapsed: number;
  }) => unknown;
}

/**
 * Base shape of an engagement. Both `DurativeActivity` (timed) and
 * `SustainedEngagement` (untimed) satisfy this.
 */
export interface Engagement {
  engagementId: string;
  readonly type: string;
  readonly actor: Stuff & Engaged;
  readonly startedAt: number;
  readonly slots: ReadonlySet<EngagementSlot>;
  readonly interruptibleBy: ReadonlySet<AbortReason>;
  readonly emissions?: readonly ScheduledEmission[];
  readonly cancelable: boolean;
  onStart(): void;
  onAbort(reason: AbortReason): void;
  getHost?(): Stuff | null;
}

export interface DurativeActivity extends Engagement {
  readonly duration: number;
  readonly replaceableBy: readonly string[];
  onComplete(): void;
}

export type SustainedEngagement = Engagement;

export type StartResult =
  | {
      ok: true;
      status: 'started' | 'replaced';
      engagement: Engagement;
      note: EngagementStartedNote;
      replaced?: readonly Engagement[];
    }
  | {
      ok: true;
      status: 'completed-sync';
      engagement: Engagement;
    }
  | {
      ok: false;
      reason: 'engagement-conflict';
      conflicts: readonly Engagement[];
    }
  | {
      ok: false;
      reason: 'start-rejected';
      error: Error;
    };

/** Lifecycle-class shape held in the dispatch index (capture-at-start). */
export type ActivityClass = new (...args: never[]) => Engagement;

// Re-export the note types so consumers don't need a second import.
export type {
  EngagementStartedNote,
  EngagementCompletedNote,
  EngagementCancelledNote,
};

export { registerSchedulerRegistryClass } from '../platform/idea/api/SchedulerLogic';

/* ─────────────────────────── logic resolution ─────────────────────────── */

const LOGIC_PATH = '/platform/idea/api/scheduler';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/SchedulerLogic', import.meta.url)
);

/** Resolve the HMR-able SchedulerLogic singleton (sync). */
function logic(): SchedulerLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'SchedulerLogic'
      ) as typeof SchedulerLogic | null) ?? SchedulerLogic)()
  );
}

/* ─────────────────────────── SchedulerApi ─────────────────────────── */

export class SchedulerApi {
  private constructor() {}

  /* ─────────────── activity-class dispatch index ───────────────
   * There is no registration surface: `start(engagement)` captures the
   * instance's own class into the type→class dispatch index
   * (capture-at-start). `getActivityClass` reads it; `reloadActivity`
   * re-points it for in-flight engagements after a hot reload. */

  public static getActivityClass(type: string): ActivityClass | undefined {
    return logic().getActivityClass(type);
  }

  public static async reloadActivity(type: string): Promise<void> {
    await logic().reloadActivity(type);
  }

  /* ──────────────────── lifecycle: start ──────────────────── */

  public static start(engagement: Engagement): StartResult {
    return logic().start(engagement);
  }

  /* ──────────────────── lifecycle: cancel family ──────────────────── */

  public static cancel(engagement: Engagement, reason: AbortReason): void {
    logic().cancel(engagement, reason);
  }

  /**
   * End a **sustained** engagement on its own terms — the work is done
   * rather than interrupted.
   *
   * ⭐ `cancel` used to be the only exit an untimed engagement had, so
   * *arriving* and *being stopped* were the same event in the envelope.
   * A journey's arrival is a completion (logistics D4), and an
   * engagement that can only ever abort cannot say so. Timed activities
   * are unaffected — their own timer already completes them.
   */
  public static complete(engagement: Engagement): void {
    logic().complete(engagement);
  }

  public static cancelAll(actor: Stuff & Engaged): void {
    logic().cancelAll(actor);
  }

  public static cancelByType(actor: Stuff & Engaged, type: string): void {
    logic().cancelByType(actor, type);
  }

  public static cancelByPredicate(
    actor: Stuff & Engaged,
    pred: (e: Engagement) => boolean
  ): void {
    logic().cancelByPredicate(actor, pred);
  }

  /* ─────────────────── introspection ───────────────────
   * (Per-actor engagement reads live on the actor itself —
   * `Engaged.getEngagements()` / `getEngagementBySlot()`; the Api keeps
   * only the registry-keyed lookup below.) */

  public static getEngagementById(id: string): Engagement | undefined {
    return logic().getEngagementById(id);
  }

  /* ──────────────────── test seams ──────────────────── */

  public static _clearAllForTesting(): void {
    SecurityApi.assertTestOnly('_clearAllForTesting');
    logic()._clearAllForTesting();
  }

  public static _unregisterActivityForTesting(type: string): void {
    SecurityApi.assertTestOnly('_unregisterActivityForTesting');
    logic()._unregisterActivityForTesting(type);
  }
}

SecurityApi.decorateApiClass(SchedulerApi);
