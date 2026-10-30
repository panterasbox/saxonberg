/**
 * IronPot — the ashery's boiling pot: a cast-iron pot a lye is boiled down
 * in, until the water is gone and a cake of BLACK SALTS is left in the
 * bottom (potash D8, D11). Pot ash, by the pot.
 *
 * ⭐ No verb and no profile. The pot stands ON a hearth (`put pot on
 * hearth`, the soap kettle's precedent), lye is poured in, and the boil is
 * the kernel's latent-heat plateau: the lye holds at its boiling point and
 * loses water to steam on every read, and the plateau KEEPS the alkali —
 * the dissolved solids stay as the water leaves, so the liquor's strength
 * climbs and the egg rides higher as the pot boils down. Boiled down to
 * saturation, what is left SETS as the cake, by the shipped mould path
 * (`castInto`): the alkali over the cake's purity, graded as the lye was.
 *
 * So a strong lye gives a heavy cake and a weak one a thin crust from the
 * same boil, and a weak lye burns more wood per kilo of potash (AC 5).
 *
 * ⭐⭐ **Converged (`potash-on-sugar`, the sugar build).** The pot kept its
 * own count of the alkali (`alkaliKg`, `lastSeenL`, a re-base on every
 * pour) because the plateau boiled the solids away with the water. The
 * plateau keeps them now, so the count is gone: the pot reads the strength
 * the plateau wrote, and casts at saturation. Lye states its own strength
 * (`solidsKgPerL`) — the `UNMEASURED_LYE_KG_PER_L` constant retired.
 *
 * ⚠ Honest limit: the cake appears at the first read after the pot
 * reaches saturation, not at the instant.
 *
 * Composition: the Hoop minus `Placing` (the pot is placed ON a hearth; it
 * hosts nothing): food-grade vessel, `Durable` (a reusable mould wears per
 * cast), `MouldMixin` (the cake takes the pot's shape).
 */
import CraftVessel from '@saxonberg/server/mud/platform/thing/CraftVessel';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import { MouldMixin } from '@saxonberg/server/mud/lib/mould/Mould';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import type { ChattelOwner } from '@saxonberg/server/mud/lib/chattel/ChattelRecord';

/** What a boiled-dry lye leaves. */
const BLACK_SALTS = '/trade/potash/idea/material/black-salts';
/** The commons potash, the cake's composition key. */
const POTASH = '/stuff/idea/material/mineral/potash';
/** The share of a cake of black salts that is potash (the rest char, iron, damp). */
const PURITY = 0.65;
/**
 * ⭐ Saturation, kg of potash per litre (potassium carbonate dissolves about
 * 1.1 kg in a litre of hot water). A lye boiled down to this is salts with
 * a little water in them: what is left SETS as the cake. (Found by the
 * drive: the plateau boils the last of a liquor ever more slowly and never
 * quite to nothing, so a cake waiting for "dry" never came.)
 */
const SATURATED_KG_PER_L = 1.1;

const IronPotBase = MouldMixin(DurableMixin(CraftVessel));

export default class IronPot extends IronPotBase {
  private boiling = false;

  /**
   * The alkali the pot's liquor holds, kg — read off the strength the
   * plateau keeps (dissolved solids × litres), never counted by the pot.
   */
  public getAlkaliKg(): number {
    this.reconcileSetting();
    const litres = this.getBulkAmount('interior').rawValue();
    return litres > 0 ? this.strength() * litres : 0;
  }

  /** Every read of the pot looks for the salts setting, after the plateau's. */
  public override reconcileSetting(): void {
    super.reconcileSetting();
    this.castIfSaturated();
  }

  /** The liquor's dissolved solids, kg/L — the plateau's figure, else its material's own. */
  private strength(): number {
    return (
      this.getBulkPayload('interior')?.dissolvedSolidsKgPerL ??
      this.getBulkMaterial('interior')?.getSolidsKgPerL() ??
      0
    );
  }

  /**
   * ⭐ Boiled down to saturation, the salts set out of what is left. Any
   * liquor carrying alkali counts — a hopper drawn before its leach has
   * re-keyed gives WATER carrying it (the live walk's finding), and that
   * boils down to the same salts.
   */
  private castIfSaturated(): void {
    if (this.boiling) return;
    this.boiling = true;
    try {
      const litres = this.getBulkAmount('interior').rawValue();
      if (!(litres > 0)) return;
      const kgPerL = this.strength();
      if (kgPerL < SATURATED_KG_PER_L) return;
      const payload = this.getBulkPayload('interior');
      const owner = payload?.contentsOwner ?? null;
      const kg = kgPerL * litres;
      this.setBulkAmount('interior', Quantity.of(0, 'L'));
      this.setBulkMaterial('interior', null);
      this.setBulkPayload('interior', null);
      void this.setCake(kg, owner);
    } finally {
      this.boiling = false;
    }
  }

  /**
   * ⭐ The cake is whose the lye was (the communal-oven rule) — yours in
   * the ashery's pot — and nobody's when the lye was nobody's: it sets when
   * somebody READS the pot, and that onlooker is never its owner.
   */
  private async setCake(alkaliKg: number, owner: ChattelOwner | null): Promise<void> {
    const material = StuffApi.findByTemplatePath<Material>(BLACK_SALTS);
    if (!material) {
      console.warn(`IronPot: no material at '${BLACK_SALTS}' — the salts are lost`);
      return;
    }
    const self = this as unknown as Stuff;
    const grade: Grade | null = MixinApi.isGraded(self) ? self.getGrade() : null;
    const cake = await this.castInto({ material, massKg: alkaliKg / PURITY, payload: null, stampMaterial: true, madeBy: owner });
    if (cake === null) return;
    if (MixinApi.isComposition(cake)) cake.setMakeup([{ materialPath: POTASH, fraction: PURITY }]);
    // ⭐ The cake is graded as the lye was (AC 3): the pour carried the
    // lye's band onto the pot.
    if (grade !== null && MixinApi.isGraded(cake)) cake.setGrade(grade);
  }
}
