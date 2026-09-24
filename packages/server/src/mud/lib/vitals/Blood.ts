/**
 * Blood — the stored-unit payload and the dials the draw/transfuse loop
 * runs on (blood build D4/D11).
 *
 * A drawn unit is a perishable Material (`/stuff/idea/material/tissue/
 * blood`) in any bulk holder; what cannot derive from the Material — the
 * donor's species, the true ABO type, whether anyone has labelled it, and
 * whose it was — rides here on `BulkPayload.blood`, the per-module
 * declaration-merge pattern (`Freshness` declares `freshness`,
 * `Contaminable` declares `pathogens`; this declares `blood`).
 *
 * ⚠ **The stored `type` is the TRUE phenotype, always** — an unlabelled
 * unit still reacts if it truly mismatches, so the gamble is honest.
 * `labelled` is the epistemic half: whether anyone has tested it, which is
 * the only thing that lets a competent transfuser SEE a mismatch before
 * they make it (D5). This refines the plan's `type: string | null` sketch
 * (a null type would have thrown away the mechanical truth an unlabelled
 * unit needs to react on).
 *
 * ⚠ **Instance methods only** (`lint:lib-statics` is at ceiling): the
 * pour-blend is a thing a `Blood` unit does with another, so `blend` is
 * an instance method invoked from the bulk transfer.
 */

import type { BloodTypeLabel } from "./BloodType";

/** The per-unit facts a blood bag carries beyond its Material. */
export interface BloodUnit {
  /** The donor's species — cross-species transfusion is the reaction. */
  speciesPath: string;
  /** The TRUE ABO phenotype (or `mixed`). Present whether or not labelled. */
  type: BloodTypeLabel;
  /** Has anyone tested/labelled this unit? Only a labelled unit lets a
   * transfuser read a mismatch before making it. */
  labelled: boolean;
  /** Whose blood it was — a durable person key (the donor may be absent). */
  donorIdentityPath: string;
}

// The declaration-merge: a bulk slot's payload may carry a blood unit.
declare module "../bulk/Bulkable" {
  interface BulkPayload {
    blood?: BloodUnit;
  }
}

/** The tunable dials for the draw/store/transfuse loop. Greppable in one
 * place (the `HARM_DEFAULTS` precedent). */
export const BLOOD_DEFAULTS = {
  /** One drawn unit (litres) — a bag's worth. */
  UNIT_LITRES: 0.45,
  /** Fraction of a transfused volume that is plasma (volume expander) — the
   * part an incompatible unit still delivers before the cells attack. */
  PLASMA_FRACTION: 0.55,
  /** Reaction stage per litre of incompatible blood (D3). */
  REACTION_STAGE_PER_L: 6,
  /** Multiplier on the reaction for a cross-species (mismatch 2) unit. */
  SPECIES_MISMATCH_SCALE: 2,
  /** A donor must sit at or above this fraction of baseline volume to give. */
  DONOR_MIN_FRAC: 0.9,
  /** `bleed` refuses below this marrow reserve (`%`) — a wan body may not
   * give (D11). */
  DONATION_MIN_MARROW: 40,
  /** Marrow reserve (`%`) spent per litre drawn — a 0.45 L unit ≈ 27 %. */
  MARROW_COST_PCT_PER_L: 60,
} as const;

/**
 * A blood unit, wrapped so it can fold another into itself on a pour.
 * Equal type → kept (both must be labelled for the result to be labelled);
 * anything else → `mixed`, unlabelled — a mixed unit is compatible with
 * nobody, which is what stops decant-to-launder tricks.
 */
export class Blood {
  constructor(public readonly unit: BloodUnit) {}

  /** Fold `other` into this unit on a transfer into a non-empty slot. */
  public blend(other: BloodUnit): BloodUnit {
    if (
      this.unit.speciesPath === other.speciesPath &&
      this.unit.type === other.type &&
      this.unit.type !== "mixed"
    ) {
      return {
        speciesPath: this.unit.speciesPath,
        type: this.unit.type,
        labelled: this.unit.labelled && other.labelled,
        donorIdentityPath: this.unit.donorIdentityPath,
      };
    }
    return {
      speciesPath: this.unit.speciesPath,
      type: "mixed",
      labelled: false,
      donorIdentityPath: this.unit.donorIdentityPath,
    };
  }
}
