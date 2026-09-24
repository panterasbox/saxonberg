/**
 * TendingEngagement — ⭐ **sitting with a patient** (recovery D8), modelled
 * as a `SustainedEngagement` occupying the CARER's `attention` slot.
 *
 * A carer's attention is one thing and exclusive — the `AttendanceEngagement`
 * shape — so a carer tends one patient at a time (a second `tend` replaces
 * the first). The engagement IS the link: `onStart` points the patient at
 * this carer (`_setCarer`), `onAbort` clears it, whatever the reason
 * (cancel, walking away, linkdead, host-destroyed). The patient's
 * `convalescenceFactor` reads the carer's medicine band as a bonus, but
 * only while the carer is present, conscious and still holds THIS
 * engagement — so it stays honest even between the abort firing and the
 * next read.
 */

import type { SustainedEngagement } from '../../api/scheduler';
import type { EngagementSlot } from '../activity/Engaged';
import type { Engaged } from '../activity/Engaged';
import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '../stuff/Stuff';
import type { Vitals } from './Vitals';

declare module '@saxonberg/types' {
  interface AbortReasonRegistry {
    /** The carer walked away or the patient no longer needs tending. */
    'tending-ended': true;
  }
}

/** The activity type key registered with the scheduler. */
export const TENDING_TYPE = 'medical-tending';

const TENDING_SLOTS: readonly EngagementSlot[] = ['attention'];

export class TendingEngagement implements SustainedEngagement {
  engagementId = '';
  readonly type = TENDING_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots = new Set<EngagementSlot>(TENDING_SLOTS);
  readonly interruptibleBy = new Set<AbortReason>();
  readonly cancelable = true;

  /** The patient being tended. */
  private readonly patient: Stuff & Vitals;
  /** The carer's medicine band, captured at tend-time — convalescenceFactor
   * is sync and cannot await `competenceBandFor`, so the link carries it. */
  private readonly band: string;
  private ended = false;

  constructor(
    carer: Stuff & Engaged,
    patient: Stuff & Vitals,
    band: string,
  ) {
    this.actor = carer;
    this.patient = patient;
    this.band = band;
  }

  onStart(): void {
    this.startedAt = Date.now();
    this.patient._setCarer(this.actor as unknown as Stuff, this.band);
  }

  onAbort(_reason: AbortReason): void {
    if (this.ended) return;
    this.ended = true;
    // Clear the link only if it still points at THIS carer (a newer carer
    // may have taken over in the meantime).
    if (this.patient.getCarer() === (this.actor as unknown as Stuff)) {
      this.patient._setCarer(null);
    }
  }

  /** The carer's attention is held here — their destruction tears it down. */
  getHost(): Stuff | null {
    return this.actor as unknown as Stuff;
  }
}
