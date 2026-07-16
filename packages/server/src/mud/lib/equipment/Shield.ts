/**
 * Shield — wielded protection: **armor you hold, not armor you wear**.
 *
 * The cross of {@link Armor} and {@link Weapon}: like armor it carries an
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
 * Seeded as content (e.g. `/domain/eternal/arms/steel-shield`) with
 * `_materialPath`, an armor `constructionForm` (`plate` / `hide`), a `grade`,
 * and `slotClaims` (the off-hand).
 */

import Thing from '../stuff/Thing';
import { DetailedMixin } from '../description/Detailed';
import { ConstructedMixin } from '../material/Constructed';
import { DurableMixin } from '../material/Durable';
import { GradedMixin } from '../craft/Graded';
import { SlottableMixin } from '../slot/Slottable';
import { WieldableMixin } from '../slot/Wieldable';

const ShieldBase = WieldableMixin(
  SlottableMixin(
    GradedMixin(DurableMixin(ConstructedMixin(DetailedMixin(Thing)))),
  ),
);

export default class Shield extends ShieldBase {}
