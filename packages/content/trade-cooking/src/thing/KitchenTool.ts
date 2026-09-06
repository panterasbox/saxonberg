/**
 * KitchenTool — a tool that works on FOOD, and therefore one that can
 * carry what the food was carrying: the sieve, the press, the churn.
 *
 * A `ToolItem` (capabilities + a wear-on-use condition) plus
 * `ContaminableMixin`, and the split from its parent is the point.
 *
 * ⚠⚠ **The mixin was on `ToolItem` itself for one build**, on the
 * argument that *"this can carry pathogens between things"* is true of a
 * billhook and a kitchen sieve. It is — and it was the wrong question.
 * That class's host set is a felling axe, a sledge, a pick, a pick-haft, a
 * pinch bar, a smith's hammer, an assay kit and a shovel: **most tools in
 * this game are mining and smithing kit that never meets food.**
 *
 * ⭐ Its producer is the craft itself: a working dirties the tools it was
 * done with, so a press that pressed contaminated fruit is a dirty press.
 * That happens in `CraftingLogic` for every craft in the game, and which
 * tools can HOLD it is exactly this class decision — a shovel is offered
 * the same contamination and cannot take it.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import { ContaminableMixin } from '@saxonberg/server/mud/lib/material/Contaminable';

const KitchenToolBase = ContaminableMixin(ToolItem);

export default class KitchenTool extends KitchenToolBase {}
