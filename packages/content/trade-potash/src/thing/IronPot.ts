/**
 * IronPot — the ashery's boiling pot: a cast-iron pot a lye is boiled down
 * in, until the water is gone and a cake of BLACK SALTS is left in the
 * bottom (potash D8, D11). Pot ash, by the pot.
 *
 * ⭐ No verb and no profile. The pot stands ON a hearth (`put pot on
 * hearth`, the soap kettle's precedent), lye is poured in, and the boil is
 * the kernel's latent-heat plateau: the lye holds at its boiling point and
 * loses water to steam on every read. The ALKALI does not leave with the
 * steam, so the pot keeps count of it:
 *
 *  - the litres ROSE since the pot last looked — a pour came in: the count
 *    is re-based off the liquor's strength (`dissolvedSolidsKgPerL`, which
 *    the pour blended);
 *  - they FELL — the plateau boiled water off: the count is kept and the
 *    strength rewritten as count ÷ litres, so the egg rides higher as the
 *    pot boils down;
 *  - the slot is EMPTY with alkali counted — the water is gone: the pot
 *    mints the cake by the shipped mould path (`castInto`), of the alkali
 *    over the cake's purity, graded as the lye was.
 *
 * So a strong lye gives a heavy cake and a weak one a thin crust from the
 * same boil, and a weak lye burns more wood per kilo of potash (AC 5).
 *
 * ⚠ Honest limits: the cake appears at the first read after the pot boils
 * dry, not at the instant; a pour and a boil-off between two reads are
 * read as their net (a pot nobody watches is a pot nobody measures).
 *
 * ⭐⭐ **Convergence (`potash-on-sugar`).** The sugar build's plateau keeps
 * dissolved solids as the water leaves and fires a material's
 * `concentratesTo` arrows; when that is on master, lye authors its solids
 * and an arrow to black salts, and `reconcileBoil`, `alkaliKg` and
 * `lastSeenL` are DELETED — this class becomes the mould it composes.
 *
 * Composition: the Hoop minus `Placing` (the pot is placed ON a hearth; it
 * hosts nothing): food-grade vessel, `Durable` (a reusable mould wears per
 * cast), `MouldMixin` (the cake takes the pot's shape).
 */
import CraftVessel from '@saxonberg/server/mud/platform/thing/CraftVessel';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import { MouldMixin } from '@saxonberg/server/mud/lib/mould/Mould';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import { UNMEASURED_LYE_KG_PER_L } from '@saxonberg/server/mud/lib/cleanliness/LyeStrength';

/** What a boiled-dry lye leaves. */
const BLACK_SALTS = '/trade/potash/idea/material/black-salts';
/** The commons potash, the cake's composition key. */
const POTASH = '/stuff/idea/material/mineral/potash';
/** The share of a cake of black salts that is potash (the rest char, iron, damp). */
const PURITY = 0.65;

const IronPotBase = MouldMixin(DurableMixin(CraftVessel));

export default class IronPot extends IronPotBase {
  static fieldMeta: FieldMeta = {
    alkaliKg: { persistent: true, runtimeState: true },
    lastSeenL: { persistent: true, runtimeState: true },
  };

  /** The alkali in the pot's liquor, kg — conserved across the boil. */
  public alkaliKg = 0;
  /** The litres the pot held when it last looked. */
  public lastSeenL = 0;

  private boiling = false;

  /** The alkali the pot is holding, kg (its own count). */
  public getAlkaliKg(): number {
    this.reconcileSetting();
    return this.alkaliKg;
  }

  /** Every read of the pot runs the boil's bookkeeping after the plateau's. */
  public override reconcileSetting(): void {
    super.reconcileSetting();
    this.reconcileBoil();
  }

  private reconcileBoil(): void {
    if (this.boiling) return;
    this.boiling = true;
    try {
      const litres = this.getBulkAmount('interior').rawValue();
      const liquor = this.getBulkMaterial('interior');
      if (litres > 0 && liquor !== null && liquor.hasTag('lye')) {
        const payload = this.getBulkPayload('interior');
        if (litres > this.lastSeenL + 1e-9 || this.alkaliKg <= 0) {
          // A pour came in (it blended the strength): re-base the count.
          this.alkaliKg = (payload?.dissolvedSolidsKgPerL ?? UNMEASURED_LYE_KG_PER_L) * litres;
        } else if (litres < this.lastSeenL - 1e-9) {
          // The plateau boiled water off: the alkali stays behind.
          this.setBulkPayload('interior', { ...(payload ?? {}), dissolvedSolidsKgPerL: this.alkaliKg / litres });
        }
        this.lastSeenL = litres;
        return;
      }
      if (litres <= 0 && this.alkaliKg > 0) {
        // ⭐ Boiled dry: the water is gone and the salts are left.
        const kg = this.alkaliKg;
        this.alkaliKg = 0;
        this.lastSeenL = 0;
        void this.setCake(kg);
        return;
      }
      if (litres <= 0) this.lastSeenL = 0;
    } finally {
      this.boiling = false;
    }
  }

  private async setCake(alkaliKg: number): Promise<void> {
    const material = StuffApi.findByTemplatePath<Material>(BLACK_SALTS);
    if (!material) {
      console.warn(`IronPot: no material at '${BLACK_SALTS}' — the salts are lost`);
      return;
    }
    const self = this as unknown as Stuff;
    const grade: Grade | null = MixinApi.isGraded(self) ? self.getGrade() : null;
    const cake = await this.castInto({ material, massKg: alkaliKg / PURITY, payload: null, stampMaterial: true });
    if (cake === null) return;
    if (MixinApi.isComposition(cake)) cake.setAlloying([{ materialPath: POTASH, fraction: PURITY }]);
    // ⭐ The cake is graded as the lye was (AC 3): the pour carried the
    // lye's band onto the pot.
    if (grade !== null && MixinApi.isGraded(cake)) cake.setGrade(grade);
  }
}
