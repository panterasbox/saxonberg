/**
 * ManualBuildStep — a generic timed `DurativeActivity` for one
 * manual-build verb (pour / add / stir / shake / strain / garnish).
 *
 * Each manual-build verb is an **engaged activity**: it occupies the
 * actor's `hands` slot for a game-time duration and applies its effect
 * **at completion**, not at dispatch — so a barge-in mid-step aborts the
 * activity and the step's effect never lands (partial matter standing,
 * no rollback). This is the first real consumer of the
 * engagement/`EngagedMixin` substrate; it goes through `SchedulerApi`
 * (which owns the slot map + the game-clock timer) rather than a
 * parallel timer.
 *
 * The per-step effect is a closure the controller builds with the
 * resolved live refs (the bottle slot, the shaker, the glass). The sync
 * effects (debit + bank a contribution, record the method) run inline;
 * `strain`'s async mint kicks off inside the completion's `runRoot`
 * frame. (Closures pinned at construction — the HMR caveat is moot for a
 * step that completes in seconds.)
 */

import type { AbortReason } from "@saxonberg/types";
import type { Stuff } from "../stuff/Stuff";
import type { EngagementSlot, Engaged } from "../activity/Engaged";
import type { DurativeActivity } from "../../api/scheduler";
import { SchedulerApi } from "../../api/scheduler";

export const MANUAL_BUILD_STEP_TYPE = "manual-build-step" as const;

/** Construction options for a {@link ManualBuildStep}. */
export interface ManualBuildStepOptions {
  actor: Stuff & Engaged;
  slots: readonly EngagementSlot[];
  durationMs: number;
  /** Applied when the step completes (matter move / buffer bank / mint). */
  onComplete: () => void;
  /** Applied if the step aborts; default no-op (nothing was mutated yet). */
  onAbort?: (reason: AbortReason) => void;
  /** Eager host-destruction hook target; defaults to the actor. */
  host?: Stuff | null;
}

export class ManualBuildStep implements DurativeActivity {
  engagementId = "";
  readonly type = MANUAL_BUILD_STEP_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot>;
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable = true;
  readonly duration: number;
  readonly replaceableBy: readonly string[] = [];

  private readonly _onComplete: () => void;
  private readonly _onAbort: (reason: AbortReason) => void;
  private readonly _host: Stuff | null;

  constructor(opts: ManualBuildStepOptions) {
    this.actor = opts.actor;
    this.slots = new Set(opts.slots);
    this.duration = opts.durationMs;
    this._onComplete = opts.onComplete;
    this._onAbort = opts.onAbort ?? ((): void => {});
    this._host = opts.host ?? (opts.actor as unknown as Stuff);
  }

  onStart(): void {
    this.startedAt = Date.now();
  }

  onComplete(): void {
    this._onComplete();
  }

  onAbort(reason: AbortReason): void {
    this._onAbort(reason);
  }

  getHost(): Stuff | null {
    return this._host;
  }
}

SchedulerApi.registerActivity(MANUAL_BUILD_STEP_TYPE, ManualBuildStep);
