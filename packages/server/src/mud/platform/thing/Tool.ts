/**
 * Tool — a portable tool: the capital side of control.
 *
 * ⭐ **It was `ToolItem` until the base-class narrowing, and the `Item`
 * was doing nothing.** Every class in this directory is a thing; the
 * suffix distinguished it from `ToolMixin`, which is a different kind of
 * artefact that needs no disambiguation from a class. A name that exists
 * to avoid a collision it does not have is a name with a hole in it, and
 * this repo has been here before — `platform/thing/Thing` was `Prop`
 * until somebody noticed nobody would defend a class called *generic
 * object you don't care about*.
 *
 * ⚠ **`Tool` gains nothing here beyond the rename.** No static, no
 * capability→verb table, nothing that assumes the 24 static-only tool
 * classes have collapsed into it. That collapse needs affordance-as-data
 * (filed on docs/slates/builds/base-class-narrowing-slate.md as N3),
 * which is a design and not this build;
 * `Tool` is the class those 24 COULD collapse into later, and it stays
 * empty so the decision is still open.
 *
 * `ToolMixin(DurableMixin(Good))` — a `Tangible` carrying tool
 * capabilities (ToolMixin) + a wear-on-use condition (DurableMixin, the
 * durable-good half). Backs the bar's shaker / mixing-glass (and any future
 * strainer / muddler); capabilities + condition are authored in each seed's
 * `data:`.
 *
 * ⭐⭐ **Parts or one piece, one class** (repair D3, D4). A pick is a head
 * wedged on a haft; a whetstone is one piece; both are tools. The family
 * composes `AssembledMixin` and every method of it is total on a thing
 * with no bill — a row with a `bill:` is made of parts, a row without one
 * is one piece and says so. (Until 2026-10-17 a narrow `AssembledTool`
 * twin carried the rows with bills; two classes for a shovel was the
 * wrong answer to "is this made of parts".)
 *
 * And it has a FORM and an EDGE (`Constructed` + `Keen`, exactly
 * `Weapon`'s claim): a billhook is `bladed` and honed by `sharpen`, a
 * hammer has no edge form and its keenness is inert. An edge is derived
 * from the form word, never a predicate on the host set.
 */

import Good from '../../lib/stuff/Good';
import { ToolMixin } from '../../lib/craft/Tooled';
import { DurableMixin } from '../../lib/material/Durable';
import { CraftedMixin } from '../../lib/craft/Crafted';
import { ConstructedMixin } from '../../lib/material/Constructed';
import { KeenMixin } from '../../lib/material/Keen';
import { AssembledMixin } from '../../lib/craft/Assembled';
import { NamedMixin } from '../../lib/description/Named';

// CraftedMixin closes the tools-make-tools loop: a Tool can be a
// recipe output (smithing makes the hammer smithing needs); the mark
// defaults empty on store-bought kit.
// ⚠⚠ **NOT `ContaminableMixin`, and that is a correction.** It was composed
// here for one build on the argument that *this can carry pathogens between
// things* is true of a billhook and a kitchen sieve — which is true, and
// which was the wrong question. The host set is a felling axe, a sledge, a
// pick, a pick-haft, a pinch bar, a smith's hammer, an assay kit and a
// shovel: **most tools in this game are mining and smithing kit that never
// meets food.** `callable == visible == cared-about` settles it, exactly as
// it did for `Weapon` one class over.
//
// ⭐ Nor did it ever DO anything here. The only producers are the gut spill
// at a butchering and the craft's tangible output, and neither writes to a
// tool — so the mixin was surface area with no consumer, which is its own
// smell.
//
// The attach point stays open and named: a `KitchenTool` the day a sieve or
// a board genuinely needs to carry a load, the same way irrigation
// contamination composes onto `WateringCan` when someone wants it.
//
// ⭐ Named BENEATH Assembled (repair D18): a tool may bear a proper name —
// the grandfather's axe, a sword's blade lying loose — and an assembly's
// name lives in the part that bears it, so `Assembled.getName` reads the
// named part before this field.
const ToolBase = AssembledMixin(
  NamedMixin(
    KeenMixin(CraftedMixin(ToolMixin(DurableMixin(ConstructedMixin(Good))))),
  ),
);

export default class Tool extends ToolBase {}
