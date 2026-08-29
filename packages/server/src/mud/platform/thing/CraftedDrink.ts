/**
 * CraftedDrink — a glass: the output form of a bar craft, the thing that
 * holds the drink and carries the maker's mark.
 *
 * `Crafted(Thermal(Bulkable(Container(Detailed(Thing)))))`:
 *
 *   - **Bulkable** — it holds the mixed liquid (`drink`/`sip` route it to
 *     metabolism). A glass is "empty" when its bulk is empty.
 *   - **Container** — a garnish is a thing *in* the glass (the olive
 *     leaves with the martini). This is the "ice cube floating in water"
 *     choice `Receptacle` documents as future content: made here, for
 *     the glass only.
 *   - **Thermal** — the drink's temperature is real (Newton cooling toward
 *     the room, like any `Receptacle`), and while the glass holds ice the
 *     temperature sits at the ice's melting point: heat that would have
 *     warmed the drink melts ice into it instead (dilution — a real bulk
 *     credit on the same slot). Reconcile-on-read; nothing is scheduled.
 *   - **Crafted** — the per-instance maker/grade/recipe stamp.
 *
 * A glass is **claimed, not cloned**: `CraftingLogic` fills the first
 * clean, empty instance of the recipe's `outputTemplate` in reach and
 * marks it `soiled`; `wash` clears it. `category` (on `BulkableMixin`,
 * the vessel kind) is the glassware par key
 * (`coupe`, `rocks`, …) the stock sheet counts by.
 *
 * `getLong()` appends the working (shaken / on the rocks / fizzing) and
 * the Dwarf-Fortress quality verdict — never a number.
 */

import Thing from '../../lib/stuff/Thing';
import { BulkableMixin, type BulkAffordance } from '../../lib/bulk/Bulkable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { DetailedMixin } from '../../lib/description/Detailed';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { CraftedMixin, type Crafted } from '../../lib/craft/Crafted';
import type { FieldMeta } from '../../lib/mixin';
import { Quantity } from '../../lib/quantity';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';

/** Water's numbers — the fallbacks when the ice material authored none. */
const DEFAULT_MELT_K = 273;
const DEFAULT_LATENT_J_PER_KG = 334000;

/** Who may soil or clean a glass: the fill and the wash — both `CraftingLogic`. */
const SoiledWriters = SecurityPolicies.FromModule(
  '/platform/idea/api/CraftingLogic#CraftingLogic',
);

const CraftedDrinkBase = CraftedMixin(
  ThermalMixin(BulkableMixin(ContainerMixin(DetailedMixin(Thing)))),
);

export default class CraftedDrink extends CraftedDrinkBase {
  static fieldMeta: FieldMeta = {
    soiled: { persistent: true, runtimeState: true },
    technique: { persistent: true, runtimeState: true },
    iceKg: { persistent: true, runtimeState: true },
    iceForm: { persistent: true, runtimeState: true },
    iceMeltK: { persistent: true, runtimeState: true },
    iceLatentJPerKg: { persistent: true, runtimeState: true },
  };

  /** Used since its last wash — a soiled glass is never claimed. */
  public soiled: boolean = false;

  /** How the drink in it was worked (`''` = not yet filled). */
  public technique: string = '';

  /** Ice in the glass (kg); 0 = none. */
  public iceKg: number = 0;

  /** `cubes` / `crushed` (`''` when no ice). */
  public iceForm: string = '';

  /** The ice's melting point (K) — stamped from the ice material at the fill. */
  public iceMeltK: number = DEFAULT_MELT_K;

  /** The ice's latent heat of fusion (J/kg) — stamped at the fill. */
  public iceLatentJPerKg: number = DEFAULT_LATENT_J_PER_KG;

  /** Reentry guard for the ice plateau (see `reconcileThermal`). */
  private _iceReconciling = false;

  // ---- soiled ----
  // `category` (the glassware par key: `coupe`, `rocks`, …) lives on
  // `BulkableMixin` — it is the VESSEL KIND, shared with cans, kegs and
  // sacks, and it is what ties an empty vessel to the product that is
  // that vessel filled.

  isSoiled(): boolean {
    return this.soiled;
  }
  /** Mark used (the fill) or clean (the wash). */
  @CallSecurity(SoiledWriters)
  setSoiled(value: boolean): void {
    this.soiled = value;
  }

  /** Clean and empty — claimable for a fill. */
  isClaimable(): boolean {
    return !this.soiled && this.isBulkEmpty('interior') && this.iceKg <= 0;
  }

  // ---- technique ----

  getTechnique(): string {
    return this.technique;
  }
  setTechnique(value: string): void {
    this.technique = value;
  }

  // ---- ice ----

  getIceKg(): number {
    return this.iceKg;
  }
  getIceForm(): string {
    return this.iceForm;
  }
  hasIce(): boolean {
    return this.iceKg > 0;
  }

  /**
   * Put ice in the glass. `meltK` / `latentJPerKg` come from the ice
   * material (water's numbers when unauthored). The drink drops onto the
   * plateau at once: heat above the melting point melts ice immediately
   * (a warm pour over ice is a smaller, colder, wetter drink).
   */
  setIce(kg: number, form: string, meltK?: number, latentJPerKg?: number): void {
    if (!Number.isFinite(kg) || kg < 0) {
      throw new RangeError(`CraftedDrink.setIce: bad mass ${String(kg)}`);
    }
    this.iceKg = kg;
    this.iceForm = kg > 0 ? form : '';
    if (meltK && meltK > 0) this.iceMeltK = meltK;
    if (latentJPerKg && latentJPerKg > 0) this.iceLatentJPerKg = latentJPerKg;
    this.absorbIntoIce();
  }

  /** Remove the ice (the wash tips it out). */
  clearIce(): void {
    this.iceKg = 0;
    this.iceForm = '';
  }

  // ---- the latent plateau ----

  /**
   * Newton cooling as any vessel, then the ice plateau: whatever heat
   * would have carried the contents above the melting point melts
   * `ΔJ / latentHeatOfFusion` kg of ice into the slot as liquid instead,
   * and the temperature is clamped back to the melting point. When the
   * ice is gone, ordinary cooling resumes from wherever it stood.
   */
  override reconcileThermal(): void {
    super.reconcileThermal();
    this.absorbIntoIce();
  }

  /** Reading the amount reconciles first — the melt is a real credit. */
  override getBulkAmount(affordance: BulkAffordance): Quantity<'L'> {
    if (affordance === 'interior' && this.iceKg > 0 && !this._iceReconciling) {
      this.reconcileThermal();
    }
    return super.getBulkAmount(affordance);
  }

  /** The plateau arithmetic on the current stamped temperature. */
  private absorbIntoIce(): void {
    if (this.iceKg <= 0 || this._iceReconciling) return;
    const meltK = this.iceMeltK;
    const t = this.stampedTemperatureK;
    if (t <= meltK) return;
    this._iceReconciling = true;
    try {
      const capacity = this.thermalCapacity(); // J/K, from the contents
      if (capacity <= 0) {
        this.stampedTemperatureK = meltK;
        return;
      }
      const excessJ = capacity * (t - meltK);
      const meltKg = Math.min(this.iceKg, excessJ / this.iceLatentJPerKg);
      this.iceKg -= meltKg;
      if (this.iceKg < 1e-6) this.iceKg = 0;
      if (meltKg > 0 && this.hasInteriorBulk()) {
        // Melt-water is ~1 kg/L; it joins the drink on the same slot.
        const slot = this.getBulk('interior');
        const room = slot.remaining();
        const credit = Math.min(meltKg, Number.isFinite(room) ? room : meltKg);
        if (credit > 0) {
          slot.setAmount(Quantity.of(slot.getAmount().rawValue() + credit, 'L'));
        }
      }
      if (this.iceKg > 0) {
        this.stampedTemperatureK = meltK;
      } else {
        // The ice ran out part-way: the leftover heat warms the drink.
        const leftoverJ = excessJ - meltKg * this.iceLatentJPerKg;
        this.stampedTemperatureK = meltK + Math.max(0, leftoverJ) / capacity;
        this.iceForm = '';
      }
    } finally {
      this._iceReconciling = false;
    }
  }

  // ---- presentation ----

  /** The working, the ice, the fizz, the garnish — then the verdict. */
  override getLong(): string {
    const base = super.getLong();
    const parts: string[] = [];
    if (!this.isBulkEmpty('interior')) {
      if (this.technique === 'shaken') parts.push('shaken, cloudy with air');
      else if (this.technique === 'stirred') parts.push('stirred bright and clear');
      else if (this.technique === 'muddled') parts.push('muddled');
      if (this.iceKg > 0) {
        parts.push(this.iceForm === 'crushed' ? 'over crushed ice' : 'on the rocks');
      }
      const tags = this.getBulkPayload('interior')?.tags ?? [];
      if (tags.includes('carbonated')) parts.push('fizzing');
    }
    const contents = this.getContents();
    if (contents.length > 0) {
      parts.push(
        `with ${contents.map((c) => c.getPresentation()).join(' and ')}`,
      );
    }
    const working = parts.length > 0 ? ` It is ${parts.join(', ')}.` : '';
    const verdict = (this as unknown as Crafted).renderVerdict();
    return `${base}${working} ${verdict}`;
  }
}
