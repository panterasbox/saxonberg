/**
 * DressingStep — getting dressed, and undressed, as an **engaged
 * activity**.
 *
 * ⭐⭐ **Dressing costs time, and that is the point rather than a tax.**
 * Putting a mail hauberk on takes minutes; a linen shirt takes seconds.
 * Making the act durative is what means **you cannot armour up in an
 * ambush** — and the whole consent/poise shape of combat assumes you
 * arrived as you are, so this is what makes arriving-as-you-are a
 * decision instead of an oversight.
 *
 * ⭐ **Half-dressed needs no new state.** An aborted step simply leaves
 * the covering stack with fewer layers on it, which the model already
 * handles: the stack is a stack. That is why interruption here is free,
 * and it is the strongest signal the shape is right — compare
 * `ManualBuildStep`, where an abort must be arranged to land no effect
 * because a partial pour would be matter in the wrong place.
 *
 * ⚠ The effect lands **per layer**, at each layer's completion, NOT at
 * the end of the whole kit. `equip` with six pieces is six steps, and a
 * barge-in after the third leaves three on. Applying the lot at the end
 * would make an interrupted dressing undo work already done, which is
 * both wrong and worse to play.
 *
 * Occupies `hands`, and deliberately not `voice`: you can talk while you
 * pull a hauberk on, the same admission `spin` makes about the wheel.
 *
 * ⚠⚠ NOT `ManualBuildStep` with a different label. That type tags
 * itself `manual-build-step` and lives in `lib/craft/` because a
 * craft step's abort contract is "nothing was mutated yet"; this one's
 * is "what went on stays on". Same substrate, different promise.
 */

import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '../stuff/Stuff';
import type { EngagementSlot, Engaged } from '../activity/Engaged';
import type { DurativeActivity } from '../../api/scheduler';

export const DRESSING_STEP_TYPE = 'dressing-step' as const;

/** Construction options for a {@link DressingStep}. */
export interface DressingStepOptions {
  actor: Stuff & Engaged;
  /** Game-ms this layer takes. Derived from the garment, never authored. */
  durationMs: number;
  /** Put the layer on / take it off. Runs at THIS layer's completion. */
  onComplete: () => void;
  /** Nothing to undo — the stack simply stopped where it stopped. */
  onAbort?: (reason: AbortReason) => void;
}

export class DressingStep implements DurativeActivity {
  engagementId = '';
  readonly type = DRESSING_STEP_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set<EngagementSlot>([
    'hands',
  ]);
  /**
   * ⚠ Empty, like `ManualBuildStep`'s: the scheduler's own barge-in
   * rules decide what interrupts. Dressing does not claim to survive
   * anything a craft step would not.
   */
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable = true;
  readonly duration: number;
  readonly replaceableBy: readonly string[] = [];

  private readonly _onComplete: () => void;
  private readonly _onAbort: (reason: AbortReason) => void;

  constructor(opts: DressingStepOptions) {
    this.actor = opts.actor;
    this.duration = opts.durationMs;
    this._onComplete = opts.onComplete;
    this._onAbort = opts.onAbort ?? ((): void => {});
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
    return this.actor;
  }
}
