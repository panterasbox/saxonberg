/**
 * CraftVessel — **the vessel a craft's bulk output lands in**: claimed
 * from a pool, filled, marked used, washed, claimed again. A bar glass is
 * the obvious case, but so are cooking's syrup bottle and the
 * house juice bottles — this is not a drink class, it is the shape every
 * claimable vessel is a row over.
 *
 * (It was `CraftedDrink` until the pool generalized past the bar. The
 * name said drink; the thing is a vessel.)
 *
 * `Crafted(Thermal(Bulkable(Container(Detailed(Thing)))))`:
 *
 *   - **Bulkable** — it holds what was made (`drink`/`sip` route it to
 *     metabolism). It is "empty" when its bulk is empty, which is what
 *     makes it claimable again.
 *   - **Container** — a garnish is a thing *in* the vessel (the olive
 *     leaves with the martini). This is the "ice cube floating in water"
 *     choice `Receptacle` documents as future content: made here.
 *   - **Thermal** — the contents' temperature is real (Newton cooling
 *     toward the room, like any `Receptacle`), and while it holds ice the
 *     temperature sits at the ice's melting point: heat that would have
 *     warmed the contents melts ice into them instead (dilution — a real
 *     bulk credit on the same slot). Reconcile-on-read; nothing scheduled.
 *   - **Crafted** — the per-instance maker/grade/recipe stamp.
 *
 * A vessel is **claimed, not cloned**: `CraftingLogic` fills the first
 * clean, empty one of the output's *kind* in reach and marks it `soiled`;
 * `wash` clears it. `category` (on `BulkableMixin`, the vessel kind) is
 * what the pool matches on and what the stock sheet counts by — the same
 * string that ties an empty vessel to the product that is it filled
 * ([bulk.md](../../../../../docs/subsystems/bulk.md)).
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
import { BulkableApi } from '../../api/bulk';
import { StuffApi } from '../../api/stuff';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';

/** Water's numbers — the fallbacks when the ice material authored none. */
const DEFAULT_MELT_K = 273;
const DEFAULT_LATENT_J_PER_KG = 334000;

/**
 * Who may mark it used: the FILL, which is `CraftingLogic`'s. The wash is
 * `wash()` below — inside the class, so it writes the field directly and
 * needs no gate. (The gate once had to name the wash too, only because
 * the wash lived on an Api.)
 */
const SoiledWriters = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule(
    '/platform/idea/api/CraftingLogic#CraftingLogic',
  ),
  // ⚠⚠ **The clone pipeline, and it is not optional.** `soiled` is a
  // `persistent` field, so a `Hydrator` writes it through the two-phase
  // `set<Field>` dispatch — both for a fresh clone and, critically, for
  // a logged-out player's inventory coming back out of
  // `holder_snapshots`. Without these arms the gate denies the Hydrator
  // and the restore THROWS.
  //
  // ⭐ That is not theoretical. A live drive washed a coupe, logged out,
  // and could not log back in: `handleUserConnect` died with
  // `Policy FromModule(CraftingLogic) denied setSoiled()` from inside
  // `PersistentHydrator.hydrate`. Ordinary play wrote a `soiled` glass
  // into the snapshot and the player was locked out of their character.
  //
  // Two arms because `lib/stuff/Hydrator` is an INTERFACE with no
  // runtime class to gate on: the concrete hydrator's code provenance
  // and its template lineage. This is the `Coin.CoinQuantityMutators`
  // shape, for the same reason and with the same `lint:gates` cover.
  SecurityPolicies.FromModule('/platform/idea/persistence/PersistentHydrator', {
    includeSubclasses: true,
  }),
  SecurityPolicies.FromTemplate('/platform/idea/persistence/*Hydrator'),
);

// ⚠ **`PalatableMixin` is NOT here — it is on `ServingVessel`.** It sat
// on this class for one build, on the argument that this is "a vessel
// somebody made something in". That is true and still too wide: what a
// trade WORKS in and what a portion REACHES A PERSON in are different
// classes, and the rows say so. A wort bucket, a must bucket, a tallow
// crock and a **wash bucket** are all `CraftVessel`s, and so is the
// cutlery — so a table knife and a bucket of dirty wash water both read
// as things you taste.
//
// ⭐ The tell was in `Palatable.ts`'s own doc block, which listed its
// hosts as "dishes, platters, the cook pot, the bar's glasses, the syrup
// and oil bottles" — a list already narrower than where it was composed,
// and still wrong at both ends. Same shape as the spoilage gauge on the
// generic `Thing`: the fix is a class named for the concept, not a wider
// base. See `platform/thing/ServingVessel.ts`.
const CraftVesselBase = CraftedMixin(
  ThermalMixin(BulkableMixin(ContainerMixin(DetailedMixin(Thing)))),
);

export default class CraftVessel extends CraftVesselBase {
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

  /**
   * ⭐ **Mark it used.** The public half of the pair, and deliberately
   * one-way: it can only ever dirty a vessel, and `wash()` below is the
   * only road back. That is why it needs no gate where the raw setter
   * does — anyone who uses a vessel may soil it (the craft that fills it,
   * the diner who eats off it), and nobody at all may quietly un-soil one.
   */
  soil(): void {
    this.soiled = true;
  }

  /**
   * The raw setter, and the reason it is gated: it is the only way to set
   * `soiled` back to `false` other than a real wash. The Hydrator arms are
   * not optional — see the policy above.
   */
  @CallSecurity(SoiledWriters)
  setSoiled(value: boolean): void {
    this.soiled = value;
  }

  /**
   * Wash it: tip the dregs, destroy whatever was garnishing it, drop the
   * ice and the technique stamp, and mark it clean. Claimable again.
   *
   * ⭐ This was `CraftingApi.washGlass(glass)` — an Api function whose
   * every line touched nothing but the vessel: its own slot, its own
   * contents, its own ice/technique/soiled. It opened with a type guard
   * that existed only because it took a bare `Stuff`, and it reached the
   * class's own members through a cast (`typeof pool.clearIce ===
   * 'function'`). Duck-typing a class's own methods from outside is the
   * tell. See docs/antipatterns.md § Thin Api Wrappers over Object
   * Methods.
   *
   * Named for the vessel, not the glass: a syrup bottle and a juice
   * bottle are `CraftVessel`s too.
   */
  wash(): void {
    // ⚠ Serviceware without contents is still washed: a spoon and a table
    // knife are `CraftVessel`s whose interior slot is never filled (see
    // `lib/bulk/Utensil.ts`), and `getBulk` THROWS on a host that has no
    // such slot. Skip straight to the rest of the wash for them.
    if (!this.hasInteriorBulk()) {
      for (const c of [...this.getContents()]) StuffApi.destruct(c);
      this.clearIce();
      this.setTechnique('');
      this.soiled = false;
      return;
    }
    const slot = this.getBulk('interior');
    if (!slot.isEmpty()) {
      BulkableApi.transfer(slot, null, {
        kind: 'measure',
        litres: slot.getAmount().rawValue(),
        mode: 'lenient',
      });
    }
    slot.setAmount(Quantity.of(0, 'L'));
    slot.setMaterial(null);
    slot.setPayload(null);
    for (const c of [...this.getContents()]) StuffApi.destruct(c);
    this.clearIce();
    this.setTechnique('');
    this.soiled = false;
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
      throw new RangeError(`CraftVessel.setIce: bad mass ${String(kg)}`);
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
