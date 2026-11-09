/**
 * PerishabilityMixin — *it SPOILS.*
 *
 * The spoilage activation energy and water activity the freshness clock
 * reads. Its own capability: blood and rawhide spoil and are not food.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasPerishability(m)` and never on a material's kind.
 */

import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../../platform/idea/persistence/QuantityMarshaller';
import type { FieldMeta, MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

export interface Perishability {
  getSpoilActivationEnergy(): Quantity<'J/mol'>;
  setSpoilActivationEnergy(value: Quantity<'J/mol'>): void;
  getWaterActivity(): number;
  setWaterActivity(value: number): void;
}

export function PerishabilityMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class PerishabilityMixin extends Base implements Perishability {
    static _mixinName = 'PerishabilityMixin';

    static fieldMeta: FieldMeta = {
      spoilActivationEnergy: { persistent: true, spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('J/mol') },
      waterActivity: { persistent: true, spoiler: 1, spoilerName: 0 },
    };

    /**
     * ⭐ **Spoilage activation energy** (`J/mol`) — the Arrhenius constant in
     * the microbial growth rate `μ = μ_max · f_T · f_aw`: how steeply *this*
     * food's spoilage answers to temperature. Real values sit around
     * 50–130 kJ/mol; a higher one means a food whose shelf life collapses
     * faster when it gets warm.
     *
     * ⚠ **`0` (the default) means the material does not spoil at all** —
     * iron, stone, glass, and every non-food in the library. There is no
     * `perishable: true` flag to forget to set: **the distinction is the
     * material, not a flag.**
     *
     * ⚠ This paragraph used to add "the gauge composes onto every `Thing`",
     * which stopped being true when `FreshnessMixin` was narrowed to
     * `Provision`. The inertness rule survives the narrowing — a value of
     * `0` still means nothing advances — but the *reason* a non-food does
     * not rot is now that it is not a food class at all, and
     * `pnpm lint:perishable` is what stops a perishable material being
     * authored onto a class that cannot rot. See
     * [docs/subsystems/spoilage.md]
     */
    private _spoilActivationEnergy: Quantity<'J/mol'> = Quantity.of(0, 'J/mol');

    protected get spoilActivationEnergy(): Quantity<'J/mol'> {
      return this._spoilActivationEnergy;
    }
    protected set spoilActivationEnergy(value: Quantity<'J/mol'>) {
      if (!(value instanceof Quantity) || value.unit !== 'J/mol') {
        throw new TypeError(
          `Material.spoilActivationEnergy must be a Quantity<'J/mol'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
        );
      }
      this._spoilActivationEnergy = value;
    }

    /**
     * ⭐ **Water activity** (`a_w`, a bare `0–1` ratio) — how much of this
     * material's water is actually *available* to a microbe, as against
     * merely present. Fresh meat ≈ 0.99, bread ≈ 0.95, jam ≈ 0.80, honey ≈
     * 0.60, dried salt ≈ 0.20.
     *
     * This is the number that makes preservation science rather than a flag:
     * salt, sugar, honey and spirits keep because they sit under the growth
     * floor (`freshness.awFloor`), not because anybody authored
     * `shelfStable: true`. `0` ⇒ the perishable default is assumed.
     *
     * ⚠ It is the material's OWN water activity, not the object's wetness.
     * A rain-soaked biscuit spoiling faster is a real effect and a
     * deliberate deferral — see [docs/subsystems/spoilage.md].
     */
    protected waterActivity: number = 0;

    /** Read the spoilage activation energy (`Quantity<'J/mol'>`; `0` = inert). */
    public getSpoilActivationEnergy(): Quantity<'J/mol'> {
      return this._spoilActivationEnergy;
    }
    /** Set the spoilage activation energy. Strict on `Quantity<'J/mol'>`. */
    public setSpoilActivationEnergy(value: Quantity<'J/mol'>): void {
      this.spoilActivationEnergy = value;
    }

    /** Read water activity (`a_w`, `0–1`; `0` = unauthored). */
    public getWaterActivity(): number {
      return this.waterActivity;
    }
    /** Set water activity. Clamped into `[0, 1]`. */
    public setWaterActivity(value: number): void {
      if (!Number.isFinite(value)) {
        throw new TypeError(
          `Material.waterActivity must be a finite number; got ${typeof value}`
        );
      }
      this.waterActivity = value < 0 ? 0 : value > 1 ? 1 : value;
    }
  };
}
