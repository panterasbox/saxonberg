/**
 * Weapon — a melee implement (delivery half only).
 *
 * The symmetric dual of {@link Armor}: a `Thing` carrying a `Material` (on
 * `Thing`'s `Tangible`), a `Construction` (its weapon-delivery form), a
 * `Grade`, and a wear-on-use `condition`. It *derives* which channel(s) it
 * delivers from its form via `MaterialApi.deliverableChannels` — a dagger
 * (`bladed`) delivers edge, a mace (`hafted`) blunt — so harm can be driven
 * by real objects.
 *
 * v1 ships the **delivery** half + the ability to be **held**: a weapon is
 * `WieldableMixin` (it claims a body-plan hand slot via `slotClaims`, so you
 * can `wield`/`unwield` it), an inspectable graded implement whose
 * construction says what it *would* do. What's deferred is the combat
 * **loadout + playstyle** — reach / balance→poise / guard→parry / afforded
 * gambits, the whole "weapon carries a playstyle" bundle — which is the
 * combat build, orthogonal to simply holding the thing.
 *
 * A weapon composes {@link DurableMixin} for its wear-on-use `condition`
 * gauge (a blade dulls with use) — a *durable good*, NOT a crafting tool, so
 * it carries no inert capability list. (Durability was split out of
 * `ToolMixin` precisely so weapons and armor can wear out without being
 * "tools".)
 *
 * Seeded as content (e.g. `/domain/eternal/arms/steel-dagger`) with
 * `_materialPath`, `constructionForm: bladed`, a `grade`, and `slotClaims`.
 */

import Thing from '../stuff/Thing';
import { DetailedMixin } from '../description/Detailed';
import { ConstructedMixin } from '../material/Constructed';
import { DurableMixin } from '../material/Durable';
import { GradedMixin } from '../craft/Graded';
import { SlottableMixin } from '../slot/Slottable';
import { WieldableMixin } from '../slot/Wieldable';

const WeaponBase = WieldableMixin(
  SlottableMixin(
    GradedMixin(DurableMixin(ConstructedMixin(DetailedMixin(Thing)))),
  ),
);

export default class Weapon extends WeaponBase {}
