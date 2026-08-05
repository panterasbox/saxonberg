/**
 * StudyActivity — studying a spellbook as a durative, interruptible
 * engaged activity. The {@link CastActivity} shape exactly.
 *
 * **Refreshing rides the engagement framework** (requirements D16): it
 * takes game time, it is interruptible, and it competes with everything
 * else you might be doing. That is what makes a personal library worth
 * the shelf space — the commute it saves is real time you are not
 * spending studying.
 *
 * It holds **`hands` + `attention`** rather than the cast's `hands` +
 * `voice`: you are turning pages and concentrating, not gesturing and
 * intoning. The interrupt vector differs accordingly — anything that
 * takes your attention stops a study, and being silenced does not.
 * `attention` is also what makes studying genuinely *compete*: you
 * cannot study while doing anything else that needs thinking about.
 *
 * Duration follows the **savings curve** (`Fade.refreshFraction`): a
 * nearly-sharp spell refreshes quickly, a badly decayed one takes far
 * longer. That shape is what rewards **regular light maintenance over
 * cramming**, which is the behaviour the spacing effect predicts.
 *
 * An aborted study takes nothing on board — the whole result lands at
 * completion, exactly as a cast's does.
 */

import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '../stuff/Stuff';
import type { EngagementSlot, Engaged } from '../activity/Engaged';
import type { DurativeActivity } from '../../api/scheduler';

export const STUDY_ACTIVITY_TYPE = 'study-activity' as const;

/** Pages and concentration: what studying actually occupies. */
const STUDY_SLOTS: readonly EngagementSlot[] = ['hands', 'attention'];

/** Construction options for a {@link StudyActivity}. */
export interface StudyActivityOptions {
  actor: Stuff & Engaged;
  /** The working being taken on board (`study-activity:<spellPath>`). */
  spellPath: string;
  /** Game-time the study occupies its slots, in (game) ms. */
  durationMs: number;
  /** The resolution closure — memorize + render. Runs at completion only. */
  onComplete: () => void;
  /** Applied on any interruption; default no-op (nothing learned). */
  onAbort?: (reason: AbortReason) => void;
  /** Eager host-destruction hook target; defaults to the actor. */
  host?: Stuff | null;
}

export class StudyActivity implements DurativeActivity {
  engagementId = '';
  readonly type: string;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set(STUDY_SLOTS);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable = true;
  readonly duration: number;
  readonly replaceableBy: readonly string[] = [];

  private readonly _onComplete: () => void;
  private readonly _onAbort: (reason: AbortReason) => void;
  private readonly _host: Stuff | null;

  constructor(opts: StudyActivityOptions) {
    this.actor = opts.actor;
    this.type = `${STUDY_ACTIVITY_TYPE}:${opts.spellPath}`;
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
