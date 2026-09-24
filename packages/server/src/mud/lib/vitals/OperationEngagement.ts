/**
 * OperationEngagement — the durative surgical act (clinical-medicine D7).
 *
 * `operate` stops being one tick: it runs as an interruptible engaged
 * activity holding the surgeon's `hands` + `attention` + `body`, over a
 * duration the controller computes from severity, competence and the
 * instrument grade. The patient keeps bleeding by reconcile-on-read for
 * the whole duration — that is the race a transfusion can win.
 *
 * The `Coup` shape: a thin scheduling shell with `onComplete` / `onAbort`
 * callbacks the `OperateController` supplies (the biology — debit blood,
 * `applyTreatment` / `severPart`, the calendar entry, the abort-worsen —
 * lives there, W5). `replaceableBy: [COMBAT_PARTICIPANT_TYPE]` so being
 * attacked terminates the operation with `'replaced'`.
 *
 * A companion `OperationPatientHold` occupies the PATIENT's `body` so they
 * cannot act while under the knife — `cancelable` iff they read conscious
 * (the thrash: a conscious patient can end it; an anaesthetised one
 * cannot). The controller wires the hold's abort to end the operation.
 */

import type { DurativeActivity, SustainedEngagement } from '../../api/scheduler';
import type { EngagementSlot } from '../activity/Engaged';
import type { Engaged } from '../activity/Engaged';
import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '../stuff/Stuff';
import { COMBAT_PARTICIPANT_TYPE } from '../combat/CombatSession';

declare module '@saxonberg/types' {
  interface AbortReasonRegistry {
    /** The operation was interrupted — the patient crashed, the surgeon
     * was pulled away, the anaesthesia lapsed. The wound is left open. */
    'operation-interrupted': true;
  }
}

export const OPERATION_TYPE = 'medical-operation' as const;
export const OPERATION_HOLD_TYPE = 'medical-operation-hold' as const;

/** The surgeon gives it hands, attention and their whole footing. */
const OPERATION_SLOTS: readonly EngagementSlot[] = ['hands', 'attention', 'body'];
/** The patient lies still — their body is held. */
const HOLD_SLOTS: readonly EngagementSlot[] = ['body'];

export interface OperationOptions {
  /** The surgeon (holds the operating slots). */
  surgeon: Stuff & Engaged;
  /** Game-time window before the operation completes (ms). */
  durationMs: number;
  /** The biology at completion (debit the rest, apply per resolution, the
   * calendar entry) — supplied by the controller. */
  onComplete: () => void;
  /** The left-open-worse path, on any interruption. */
  onAbort: (reason: AbortReason) => void;
}

export class OperationEngagement implements DurativeActivity {
  engagementId = '';
  readonly type = OPERATION_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set(OPERATION_SLOTS);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable = true;
  readonly duration: number;
  // ⭐ Being attacked replaces the operation (the surgeon's `body` is what
  // combat's participant hold wants), interrupting it with `'replaced'`.
  readonly replaceableBy: readonly string[] = [COMBAT_PARTICIPANT_TYPE];

  private readonly _onComplete: () => void;
  private readonly _onAbort: (reason: AbortReason) => void;

  constructor(opts: OperationOptions) {
    this.actor = opts.surgeon;
    this.duration = opts.durationMs;
    this._onComplete = opts.onComplete;
    this._onAbort = opts.onAbort;
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
    return this.actor as unknown as Stuff;
  }
}

export interface OperationHoldOptions {
  /** The patient whose body is held. */
  patient: Stuff & Engaged;
  /** True iff the patient reads conscious — then they may end it (thrash). */
  cancelable: boolean;
  /** Wired by the controller to end the operation when the patient ends
   * the hold (a conscious patient thrashing free). */
  onAbort: (reason: AbortReason) => void;
}

export class OperationPatientHold implements SustainedEngagement {
  engagementId = '';
  readonly type = OPERATION_HOLD_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set(HOLD_SLOTS);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable: boolean;

  private readonly _onAbort: (reason: AbortReason) => void;
  private ended = false;

  constructor(opts: OperationHoldOptions) {
    this.actor = opts.patient;
    this.cancelable = opts.cancelable;
    this._onAbort = opts.onAbort;
  }

  onStart(): void {
    this.startedAt = Date.now();
  }

  onAbort(reason: AbortReason): void {
    if (this.ended) return;
    this.ended = true;
    this._onAbort(reason);
  }

  getHost(): Stuff | null {
    return this.actor as unknown as Stuff;
  }
}
