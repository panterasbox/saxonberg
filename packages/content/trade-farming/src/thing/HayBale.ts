/**
 * HayBale — ⭐ **the winter feed budget, made of summer, and the thing
 * that burns the barn down.**
 *
 * A `Provision` that also heats itself (`SelfHeatingMixin`, the kernel's
 * since the paint build promoted it). What this class adds is that hay is
 * the one crop whose moisture at the moment it was STACKED matters more
 * than anything that happens to it afterwards: the microbes in wet forage
 * respire, respiration makes heat, and a big stack has almost no surface
 * to lose it through.
 *
 * ⚠ The moisture is stamped at BALING, not read live (`mow` stamps it off
 * the field it came from). Hay dries in the stack from the outside and it
 * makes no difference: what decides whether a rick heats is what went
 * into it, which is exactly why *"it seemed dry enough"* is the sentence
 * that burns barns.
 *
 * ⭐ And the threshold is the real one. Under about 20 % moisture a bale is
 * safe indefinitely; over about 25 % it is dangerous; the band between is
 * where judgement lives. A bale is not combustible here, so it smokes and
 * chars and the fire is left to the barn (the kernel mixin ignites only a
 * combustible heap).
 */

import Provision from '@saxonberg/server/mud/platform/thing/Provision';
import { SelfHeatingMixin } from '@saxonberg/server/mud/lib/thermal/SelfHeating';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/** Moisture fraction below which a stack is safe indefinitely. */
export const SAFE_MOISTURE = 0.2;

/** Moisture above which it is genuinely dangerous. */
export const DANGEROUS_MOISTURE = 0.25;

/** The fastest a rick heats, kelvin per game day, at the dangerous line. */
const PEAK_HEATING_K_PER_DAY = 3;

/** Past this, more water does not make more microbes. */
const MAX_DRIVE = 2.5;

export default class HayBale extends SelfHeatingMixin(Provision) {
  static fieldMeta: FieldMeta = {
    baledMoistureFraction: { persistent: true, authorable: true },
  };

  /** Moisture fraction stamped at baling. */
  public baledMoistureFraction = 0.15;

  public baledMoisture(): number {
    return this.baledMoistureFraction;
  }

  /**
   * ⭐ The microbes' heat: nothing below the safe line, exactly the peak at
   * the dangerous line (normalized against the BAND, so the two authored
   * thresholds mean what they say), capped; past the runaway point the
   * chemistry no longer needs the microbes and runs at the peak.
   */
  public override heatingKPerDay(coreK: number): number {
    if (coreK >= this.runawayK()) return PEAK_HEATING_K_PER_DAY;
    const w = Math.min(1, Math.max(0, this.baledMoistureFraction));
    if (w <= SAFE_MOISTURE) return 0;
    return PEAK_HEATING_K_PER_DAY * Math.min(MAX_DRIVE, (w - SAFE_MOISTURE) / (DANGEROUS_MOISTURE - SAFE_MOISTURE));
  }
}
