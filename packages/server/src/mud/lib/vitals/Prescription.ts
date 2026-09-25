/**
 * PrescriptionMixin — a slip of paper that authorizes a controlled active
 * for one patient (clinical-medicine D9).
 *
 * A prescription is a THING you hold and can lose (composed on
 * `platform/thing/Prescription`, never on `Thing` at large — every rock
 * would be prescribable — and never a body field). A doctor writes one
 * with `prescribe`; a nurse spends it at `administer` (`dose`'s active
 * branch) when the active is prescription-only. `isFor` is the 5-rights
 * check: right patient, right drug, doses left.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

export interface Prescription {
  /** The 5-rights check: this slip is for `patientIdentityPath`, names
   * `active`, and has a dose left. */
  isFor(patientIdentityPath: string, active: string): boolean;
  /** Spend one dose (floored at 0). */
  spendDose(): void;
  getActive(): string;
  getDosesLeft(): number;
  getPatientIdentityPath(): string;
  /** Stamp the slip when it is written (by `prescribe`). */
  stampPrescription(spec: {
    patientIdentityPath: string;
    active: string;
    doses: number;
    prescriberIdentityPath: string;
    writtenAtS: number;
  }): void;
}

export function PrescriptionMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class PrescriptionMixin extends Base implements Prescription {
    static _mixinName = 'PrescriptionMixin';

    static fieldMeta: FieldMeta = {
      patientIdentityPath: { persistent: true },
      active: { persistent: true },
      dosesLeft: { persistent: true },
      prescriberIdentityPath: { persistent: true },
      writtenAtS: { persistent: true },
    };

    public patientIdentityPath: string = '';
    public active: string = '';
    public dosesLeft: number = 0;
    public prescriberIdentityPath: string = '';
    public writtenAtS: number = 0;

    public isFor(patientIdentityPath: string, active: string): boolean {
      return (
        this.patientIdentityPath === patientIdentityPath &&
        this.active === active &&
        this.dosesLeft > 0
      );
    }

    public spendDose(): void {
      if (this.dosesLeft > 0) this.dosesLeft -= 1;
    }

    public getActive(): string {
      return this.active;
    }
    public getDosesLeft(): number {
      return this.dosesLeft;
    }
    public getPatientIdentityPath(): string {
      return this.patientIdentityPath;
    }

    public stampPrescription(spec: {
      patientIdentityPath: string;
      active: string;
      doses: number;
      prescriberIdentityPath: string;
      writtenAtS: number;
    }): void {
      this.patientIdentityPath = spec.patientIdentityPath;
      this.active = spec.active;
      this.dosesLeft = spec.doses;
      this.prescriberIdentityPath = spec.prescriberIdentityPath;
      this.writtenAtS = spec.writtenAtS;
    }
  }
  return PrescriptionMixin;
}
