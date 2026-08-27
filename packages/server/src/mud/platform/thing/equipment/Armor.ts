/**
 * Armor — worn protective equipment.
 *
 * There is **no `ArmorMixin`** (Settled 4): a piece of armor is an
 * *emergent composition* — a `Wearable` `Thing` that also carries a
 * `Material` (via `Tangible`, on `Thing`), a `Construction` (its resist
 * form), a `Grade` (as-made quality), and a `condition` (wear-on-use). Its
 * "armor-ness" is purely that composition; nothing narrows on an `isArmor`.
 * The materials-response `ConditionApi.inflict` resolves a landed blow
 * outside-in through whatever `Constructed`+`Wearable` occupants cover the
 * struck part — armor is just the things that happen to be there.
 *
 * The compose-and-name precedent (`ToolItem` / `Bandage`): a thin concrete
 * class = the stack, no new behavior, so seeds author a breastplate / mail
 * hauberk / gambeson as `data:` (material + `constructionForm` + `grade` +
 * `slotClaims` + the body plan's coverage slots). Armor composes
 * {@link DurableMixin} for its wear-on-use `condition` (armor degrades) — a
 * *durable good*, NOT a crafting tool (no capabilities).
 *
 * Seeded as content (e.g. `/stuff/thing/armor/steel-breastplate`) with
 * `data.slotClaims: { /stuff/idea/species/BodyPlan/biped: [torso] }`, `_materialPath`,
 * and `constructionForm: plate`.
 */

import Thing from '../../../lib/stuff/Thing';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { ConstructedMixin } from '../../../lib/material/Constructed';
import { DurableMixin } from '../../../lib/material/Durable';
import { CraftedMixin } from '../../../lib/craft/Crafted';
import { SlottableMixin } from '../../../lib/slot/Slottable';
import { WearableMixin } from '../../../lib/slot/Wearable';

// CraftedMixin (which composes GradedMixin) replaces the bare GradedMixin:
// armor can be a recipe output — the grade surface + persisted `gradeBand`
// are unchanged; the maker's mark defaults empty on store-bought pieces.
const ArmorBase = WearableMixin(
  SlottableMixin(
    CraftedMixin(DurableMixin(ConstructedMixin(DetailedMixin(Thing)))),
  ),
);

export default class Armor extends ArmorBase {}
