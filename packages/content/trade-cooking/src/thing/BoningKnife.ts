/**
 * BoningKnife — the kitchen's own blade, and **the knife that remembers
 * what it cut.**
 *
 * A real `Weapon` (bladed construction, wieldable, keen, durable) because
 * that is what a knife is — you can fight with it, and drive step 13 turns
 * on the SAME knife opening a carcass and then going at the vegetables.
 * What this class adds is `ContaminableMixin`, and the narrowness is the
 * whole point.
 *
 * ⚠⚠ **The mixin was on `Weapon` itself for one build**, which handed a
 * mace, a flail, a warhammer, a whip and a fire poker a pathogen-load
 * surface they will never use. *Most weapons are never used on food.* It
 * came off — and then the knife carried nothing at all, which quietly
 * dropped the **knife** from D3's list of things that move contamination
 * between objects (*"a board, a knife, a hand and a vessel"*). This class
 * is the honest middle: a blade that is food kit, and only that blade.
 *
 * ⭐ The store's `clasp-knife` stays a plain `Weapon`. It still BUTCHERS —
 * the verb gates on an edge, not on a class — it just does not remember,
 * because a pocket knife is a general tool and not a cook's. A venue that
 * wants its own remembering blade ships a row against this class; nothing
 * in the kernel widens.
 */

import Weapon from '@saxonberg/server/mud/platform/thing/equipment/Weapon';
import { ContaminableMixin } from '@saxonberg/server/mud/lib/material/Contaminable';

const BoningKnifeBase = ContaminableMixin(Weapon);

export default class BoningKnife extends BoningKnifeBase {}
