/**
 * HazardActivity — the small `DurativeActivity` a hazard uses for its two
 * timed effects (the `Coup` / `SearchActivity` precedent): the **pin**
 * traverse-consequence (a snare holding the mover's `body` slot for
 * `hazard.pinSeconds` — "immobilize via the locomotion consequence
 * ladder", the body-slot hold being the substrate's honest representation
 * of being locked in place, exactly as `Coup` holds `body`), and the
 * **disarm** act (the disarmer's `hands` occupied for `hazard.disarmSeconds`
 * before the trap is defused — barge-in-abortable, so an interrupted
 * disarm defuses nothing).
 *
 * One class, two registered types — the semantics differ only in which
 * slot is held and what fires at completion; both are per-instance data,
 * so a single configurable activity avoids two near-identical files. The
 * completion / abort closures are pinned at construction (the seconds-long
 * `SearchActivity` HMR rationale).
 */

import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '../stuff/Stuff';
import type { EngagementSlot, Engaged } from '../activity/Engaged';
import type { DurativeActivity } from '../../api/scheduler';

/** The pin (snare) traverse-consequence — holds the mover's `body`. */
export const HAZARD_PIN_TYPE = 'hazard-pin' as const;
/** The disarm act — holds the disarmer's `hands`. */
export const HAZARD_DISARM_TYPE = 'hazard-disarm' as const;

/** Construction options for a {@link HazardActivity}. */
export interface HazardActivityOptions {
  /** The actor whose slot(s) the activity holds. */
  actor: Stuff & Engaged;
  /** The activity type — {@link HAZARD_PIN_TYPE} or {@link HAZARD_DISARM_TYPE}. */
  type: string;
  /** Game-time the activity runs before completing (ms). */
  durationMs: number;
  /** The engagement slots held for the duration. */
  slots: readonly EngagementSlot[];
  /** Fired at completion (release the pin / defuse the trap). */
  onComplete: () => void;
  /** Fired on any interruption; default no-op. */
  onAbort?: (reason: AbortReason) => void;
  /** Host for the eager destruction hook; defaults to the actor. */
  host?: Stuff | null;
}

export class HazardActivity implements DurativeActivity {
  engagementId = '';
  readonly type: string;
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

  constructor(opts: HazardActivityOptions) {
    this.actor = opts.actor;
    this.type = opts.type;
    this.duration = opts.durationMs;
    this.slots = new Set(opts.slots);
    this._onComplete = opts.onComplete;
    this._onAbort = opts.onAbort ?? ((): void => {});
    this._host = opts.host ?? opts.actor;
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

