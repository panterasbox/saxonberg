/**
 * CastActivity — a cast as a durative, interruptible engaged activity
 * (the `SearchActivity` shape; named `CastActivity` because the bare
 * name `Casting` belongs to thermal's cast-metal solid).
 *
 * A cast holds **`hands` + `voice`** for its (strain-slowed) cast time —
 * somatic + verbal, so being silenced or grappled is the legible
 * interrupt vector — and resolves its whole body **at completion**:
 * `MagicApi.resolveCast` (re-gate → spend → effects → provenance →
 * Transcript) runs then and only then. An aborted cast spends nothing
 * and fires nothing (the `magic.abortCostFraction` dial is reserved at 0
 * — the tuning seam if cast-cancel spam ever needs teeth). This IS the
 * active gate: the shipped combat/engagement model interrupts the cast;
 * there is no parallel resolution anywhere.
 */

import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '../stuff/Stuff';
import type { EngagementSlot, Engaged } from '../activity/Engaged';
import type { DurativeActivity } from '../../api/scheduler';

export const CAST_ACTIVITY_TYPE = 'cast-activity' as const;

/** Somatic + verbal: the gestures and the words, both committable. */
const CAST_SLOTS: readonly EngagementSlot[] = ['hands', 'voice'];

/** Construction options for a {@link CastActivity}. */
export interface CastActivityOptions {
  actor: Stuff & Engaged;
  /** The spell being shaped (display/type key: `cast-activity:<spellId>`). */
  spellId: string;
  /** Game-time the cast occupies its slots, in (game) ms. */
  durationMs: number;
  /** The resolution closure — `MagicApi.resolveCast` + render. */
  onComplete: () => void;
  /** Applied on any interruption; default no-op (nothing fired, nothing spent). */
  onAbort?: (reason: AbortReason) => void;
  /** Eager host-destruction hook target; defaults to the actor. */
  host?: Stuff | null;
}

export class CastActivity implements DurativeActivity {
  engagementId = '';
  readonly type: string;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set(CAST_SLOTS);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable = true;
  readonly duration: number;
  readonly replaceableBy: readonly string[] = [];

  private readonly _onComplete: () => void;
  private readonly _onAbort: (reason: AbortReason) => void;
  private readonly _host: Stuff | null;

  constructor(opts: CastActivityOptions) {
    this.actor = opts.actor;
    this.type = `${CAST_ACTIVITY_TYPE}:${opts.spellId}`;
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
