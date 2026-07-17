/**
 * SearchActivity — a scoped, costed `DurativeActivity` for the `search`
 * verb (the `Coup` / `ManualBuildStep` precedent).
 *
 * A search is an **engaged activity**: it occupies the searcher's `hands`
 * slot for a game-time window (`concealment.searchSeconds`) and resolves
 * its effect **at completion**, not at dispatch — so a barge-in mid-search
 * (an ambush, a cancel, the host destroyed) aborts the activity and the
 * search finds nothing (the concealed thing stays undiscovered). The
 * effect is `PerceptionApi.resolveSearch(viewer, scope, { activeBonus })`,
 * a closure the controller builds with the resolved scope + the mode /
 * depth bonus already folded in.
 *
 * **Slot choice: `hands`.** Searching is rummaging — it commits the
 * hands (the `ManualBuildStep` precedent), but leaves the `voice` slot
 * free (you can still speak while you search — the explicit requirement)
 * and is cancelable, so an incoming attack catches you mid-rummage and
 * the search never lands. `body` would over-block (movement / posture);
 * `attention` would block conversation; `voice` would block speech.
 *
 * Closures are pinned at construction (the HMR caveat is moot for a step
 * that completes in seconds — the `ManualBuildStep` rationale).
 */

import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '../stuff/Stuff';
import type { EngagementSlot, Engaged } from '../activity/Engaged';
import type { DurativeActivity } from '../../api/scheduler';
import { SchedulerApi } from '../../api/scheduler';

export const SEARCH_ACTIVITY_TYPE = 'search-activity' as const;

/** The searcher's hands are busy rummaging; speech (`voice`) stays free. */
const SEARCH_SLOTS: readonly EngagementSlot[] = ['hands'];

/** Construction options for a {@link SearchActivity}. */
export interface SearchActivityOptions {
  actor: Stuff & Engaged;
  /** Game-time the search occupies the `hands` slot, in (game) ms. */
  durationMs: number;
  /** Applied at completion — the scoped `resolveSearch` closure. */
  onComplete: () => void;
  /** Applied on any interruption; default no-op (nothing was found). */
  onAbort?: (reason: AbortReason) => void;
  /** Eager host-destruction hook target; defaults to the actor. */
  host?: Stuff | null;
}

export class SearchActivity implements DurativeActivity {
  engagementId = '';
  readonly type = SEARCH_ACTIVITY_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set(SEARCH_SLOTS);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable = true;
  readonly duration: number;
  readonly replaceableBy: readonly string[] = [];

  private readonly _onComplete: () => void;
  private readonly _onAbort: (reason: AbortReason) => void;
  private readonly _host: Stuff | null;

  constructor(opts: SearchActivityOptions) {
    this.actor = opts.actor;
    this.duration = opts.durationMs;
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

// Register at module load (the HMR seam, mirroring ManualBuildStep).
SchedulerApi.registerActivity(SEARCH_ACTIVITY_TYPE, SearchActivity);
