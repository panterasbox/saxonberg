/**
 * Shield — wielded protection: **armor you hold, not armor you wear**.
 *
 * The cross of {@link Garment} and {@link Weapon}: like a covering it carries an
 * *armor* `Construction` (a resist profile + a layer depth) so it turns blows
 * through the very same materials-response covering stack; like a weapon it is
 * `Wieldable` (it claims a hand slot via `slotClaims`, costing a hand you
 * could otherwise arm). There is no `ShieldMixin` — a shield is an emergent
 * composition, exactly as armor is (Settled 4).
 *
 * What makes it a *shield* rather than worn armor is purely how combat reads
 * it: `ConditionApi.inflict` folds a hand-held Constructed-armor item into the
 * covering stack as a **directional** front cover — strong facing one foe
 * (1v1), bypassed by a flanking blow under focus-fire (the `shieldFacing`
 * hint) — and combat grants its holder a large **guard** bonus (a raised
 * shield parries well). It composes {@link DurableMixin}, so a shield-bash or
 * a sunder wears its `condition` down and it can be broken.
 *
 * Seeded as content (e.g. `/stuff/thing/arms/shield`) with
 * `_materialPath`, an armor `constructionForm` (`plate` / `hide`), a `grade`,
 * and `slotClaims` (the off-hand).
 *
 * ⚠ It composes {@link CraftedMixin} rather than {@link GradedMixin}, and
 * `Crafted` composes `Graded` — so the grade surface is unchanged and the
 * shield gains the maker's mark it always should have had. Found by
 * making one makeable: `CraftingLogic.mintWorkpiece` requires a recipe's
 * output to be Crafted (it stamps a mark on it), so a shield recipe
 * threw. `Weapon` and `Garment` already composed it; the shield was the
 * odd one out among the three things a smith makes, for no reason
 * anybody had recorded.
 */

import Thing from '../../../lib/stuff/Thing';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { ConstructedMixin } from '../../../lib/material/Constructed';
import { DurableMixin } from '../../../lib/material/Durable';
import { CraftedMixin } from '../../../lib/craft/Crafted';
import { SlottableMixin } from '../../../lib/slot/Slottable';
import { WieldableMixin } from '../../../lib/slot/Wieldable';

const ShieldBase = WieldableMixin(
  SlottableMixin(
    CraftedMixin(DurableMixin(ConstructedMixin(DetailedMixin(Thing)))),
  ),
);

export default class Shield extends ShieldBase {}
