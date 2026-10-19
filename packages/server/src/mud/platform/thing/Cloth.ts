/**
 * Cloth — a piece of cloth you wipe, rub or dry with: a towel, a rag, a
 * dishcloth (cleanliness B56).
 *
 * ⭐ What a cloth holds is its WEAVE's, not its fibre's: linen yarn takes
 * up a fifth of its weight in water, a linen towel about twice its weight,
 * because the water sits between the threads. So the row authors
 * `absorbency` — kg of water per kg of cloth — and the water a cloth holds
 * is that × its mass (`Wet.waterCapacityKg`).
 *
 * The act is `Wet.soakUp` — any wet thing can be rubbed with any Wet thing
 * (a shirt will do in a pinch); a cloth is simply good at it, and held, it
 * confers `dry` (`dry me with towel`). A sodden towel dries like anything
 * else: hang it on the rack.
 */

import Good from '../../lib/stuff/Good';
import { SoilableMixin } from '../../lib/cleanliness/Soilable';
import type { CommandContributions } from '../../api/command';
import type { FieldMeta } from '../../lib/mixin';

export default class Cloth extends SoilableMixin(Good) {
  static commandContributions: CommandContributions = {
    // `environment` — to whoever HOLDS it.
    environment: ['platform/cmd/crafting/dry.yaml'],
  };

  static fieldMeta: FieldMeta = {
    absorbency: { persistent: true, authorable: true },
  };

  /** kg of water per kg of cloth when soaked — the weave's (a towel ~2). */
  public absorbency: number = 1;

  public getAbsorbency(): number {
    return this.absorbency;
  }

  public setAbsorbency(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`absorbency: must be a non-negative number (got ${value})`);
    }
    this.absorbency = value;
  }

  public override waterCapacityKg(): number {
    return Math.max(0, this.getMass().rawValue()) * this.absorbency;
  }
}
