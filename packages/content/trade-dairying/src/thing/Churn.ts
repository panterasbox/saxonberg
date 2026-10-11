/**
 * Churn — a plunger churn: cream goes in, and working it at the right
 * warmth breaks it into butter and buttermilk (dairy D5).
 *
 * ⭐ Butter is an ACT, cheese is a CLOCK: the churn's judgment is the
 * thermometer. Cream churned between about 10 and 18 °C comes; too cold
 * and it slops and will not come; too warm and it comes greasy. The break
 * is a material swap the churn performs on itself — cream becomes
 * churned cream — and the `churning` schedule then separates it: the
 * buttermilk draws off (`pour churn into jug`) and stops, and the butter
 * is the residue, poured out as bulk to a crock.
 *
 * ⚠⚠ Not a build vessel (`ManualBuildMixin`), and the reason is a measured
 * one: a `pour` into a build vessel BANKS the matter as a recipe
 * contribution and drains the source, so cream poured into a build-vessel
 * churn would vanish. The churn answers the kernel's `HandWorked` shape
 * instead, which is what `churn churn` reaches.
 */
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { ContaminableMixin } from '@saxonberg/server/mud/lib/material/Contaminable';
import { FractionatingMixin } from '@saxonberg/server/mud/lib/fractionation/Fractionating';
import type { BuildMethod, HandWorked } from '@saxonberg/server/mud/lib/craft/ManualBuild';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

/** What a worked charge of cream becomes — the churning schedule's input. */
export const CHURNED_CREAM = '/trade/dairying/idea/material/churned-cream';

/** Below this (K) the cream will not come. */
const COMES_ABOVE_K = 283;
/** Above this (K) it comes greasy — butter, but poor. */
const GREASY_ABOVE_K = 291;

const ChurnBase = FractionatingMixin(
  ContaminableMixin(CraftedMixin(ThermalMixin(BulkableMixin(Good)))),
);

export default class Churn extends ChurnBase implements HandWorked {
  /**
   * ⭐ `churn churn` — the kitchen's stir view, which a BUILD vessel
   * confers through `ManualBuildMixin`. The churn is not a build (see the
   * header), so it confers the view itself: an affordance is a static on a
   * class (a row's `commandContributions:` is dead silently). Found by the
   * drive: *"I don't understand 'churn'"* with a churn in the room.
   */
  static commandContributions: CommandContributions = {
    environment: ['platform/cmd/crafting/stir.yaml'],
    peers: ['platform/cmd/crafting/stir.yaml'],
  };

  /**
   * Work the charge. The churn reads ITS OWN temperature — which is the
   * cream's — and the cream either breaks or it does not. Nothing is
   * minted: the matter in the churn becomes something else.
   */
  public workByHand(method: BuildMethod): string | null {
    if (method !== 'churned') return null;
    const amount = this.getBulkAmount('interior').rawValue();
    const material = this.getBulkMaterial('interior');
    if (!(amount > 0) || material === null) return null;
    if (material.getTemplatePath() === CHURNED_CREAM) {
      return 'It has already come — there is butter in there, waiting for the buttermilk to be drawn off.';
    }
    if (!material.hasTag('cream')) {
      return 'It sloshes about, and nothing comes of it. Only cream will churn.';
    }
    const tempK = this.getTemperature().rawValue();
    if (tempK < COMES_ABOVE_K) {
      return 'It slops and thickens and will not come. It is too cold to break.';
    }
    const churned = StuffApi.findByTemplatePath<Material>(CHURNED_CREAM);
    if (!churned) return null;
    this.setBulkMaterial('interior', churned);
    if (tempK > GREASY_ABOVE_K) {
      const self = this as unknown as Stuff;
      if (MixinApi.isGraded(self)) self.setGrade(self.getGrade().min(Grade.of('fair')));
      return 'It comes all at once, soft and greasy — too warm. It is butter, but not good butter.';
    }
    return 'The sound changes: it thumps instead of sloshing. The butter has come.';
  }
}
