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
 * cannot). ⭐ The operation OWNS its hold (controller-liquidity C38): it
 * starts the hold when it starts, ends the operation when the patient ends
 * the hold, and frees the patient when it finishes either way. The
 * controller used to start the hold itself with a no-op abort, so a patient
 * who thrashed free left the surgeon operating on air.
 */

import type { DurativeActivity, SustainedEngagement } from '../../api/scheduler';
import type { EngagementSlot } from '../activity/Engaged';
import type { Engaged } from '../activity/Engaged';
import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '../stuff/Stuff';
import { COMBAT_PARTICIPANT_TYPE } from '../combat/CombatSession';
import { SchedulerApi } from '../../api/scheduler';

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
  /** The patient, held still for the duration (absent: operating on yourself). */
  patient?: (Stuff & Engaged) | null;
  /** True iff the patient reads conscious — they may thrash free, ending the operation. */
  patientCancelable?: boolean;
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
  private readonly patient: (Stuff & Engaged) | null;
  private readonly patientCancelable: boolean;
  private hold: OperationPatientHold | null = null;
  private finished = false;

  constructor(opts: OperationOptions) {
    this.actor = opts.surgeon;
    this.duration = opts.durationMs;
    this._onComplete = opts.onComplete;
    this._onAbort = opts.onAbort;
    this.patient =
      opts.patient && (opts.patient as unknown) !== (opts.surgeon as unknown) ? opts.patient : null;
    this.patientCancelable = opts.patientCancelable ?? false;
  }

  onStart(): void {
    this.startedAt = Date.now();
    if (!this.patient) return;
    const hold = new OperationPatientHold({
      patient: this.patient,
      cancelable: this.patientCancelable,
      // The patient ending the hold (a thrash) ends the operation.
      onAbort: () => {
        if (this.finished) return;
        SchedulerApi.cancel(this, 'operation-interrupted');
      },
    });
    const started = SchedulerApi.start(hold);
    if (started.ok && (started.status === 'started' || started.status === 'replaced')) {
      this.hold = hold;
    }
  }

  onComplete(): void {
    this.finished = true;
    this.releasePatient();
    this._onComplete();
  }

  onAbort(reason: AbortReason): void {
    this.finished = true;
    this.releasePatient();
    this._onAbort(reason);
  }

  /** End the patient's hold — the operation is over either way. */
  private releasePatient(): void {
    const hold = this.hold;
    this.hold = null;
    if (hold) hold.release();
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
  /** Wired by the operation to end itself when the patient ends the hold
   * (a conscious patient thrashing free). */
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

  /** The operation is over: free the patient's body without reporting a thrash. */
  release(): void {
    if (this.ended) return;
    this.ended = true;
    SchedulerApi.complete(this);
  }

  getHost(): Stuff | null {
    return this.actor as unknown as Stuff;
  }
}
