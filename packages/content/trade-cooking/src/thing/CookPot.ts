/**
 * CookPot — the cooking branch's build vessel + tool: a pot that banks
 * step-by-step contributions ({@link ManualBuildMixin} — the shaker's role
 * at the hearth) and offers the `pot` capability recipes require. Itself
 * craftable (a smithing recipe output), durable, portable capital
 * (camp-stew in the wilds is the point: reachable heat + a pot is a
 * kitchen).
 *
 * ⭐ **It is a `CraftVessel`** — a member of the same vessel pool as the
 * dishes and the bar's glasses, which is what makes *pot-as-last-resort*
 * work at all: with no clean dish in reach, dinner lands in the pot you
 * cooked it in and you eat standing over the fire. A bare `Bulkable`
 * bolt-on would have bought a slot but not the loop. Every strand is one
 * a pot genuinely wants:
 *
 *   - **Bulkable** holds the stew · **Container** holds what you dropped
 *     in · **Thermal** gives the pot a temperature (which is the whole
 *     seam a tending wave needs, and what the spoilage gauge reads) ·
 *     **soiled/wash** because you wash a pot, and serving from it must
 *     soil it or the fallback cannot participate in the loop ·
 *     **category** (`pot`) as the vessel kind.
 *
 * ⚠ This does NOT contradict "a pot is not Bulkable" from the slate: that
 * was about where the MEDIUM is read from (a build banks transient
 * contributions, so the medium comes from slots/contributions), not about
 * whether a pot may hold dinner. Both are true.
 *
 * Ships at `/trade/cooking/thing/CookPot` (the capability rung): a
 * class lives in the pack whose content is the only thing that names it,
 * and a cook pot is a kitchen tool. Nothing in the kernel refers to it —
 * `CraftingLogic` finds a pot because the ROW authors the `pot`
 * capability, never because it knows this class.
 */

import ServingVessel from '@saxonberg/server/mud/platform/thing/ServingVessel';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tooled';
import { ManualBuildMixin } from '@saxonberg/server/mud/lib/craft/ManualBuild';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

// ⭐ `CraftVessel` = `Crafted(Thermal(Bulkable(Container(Detailed(Thing)))))`.
// Every strand of it is one a pot genuinely wants — see the class doc.
const CookPotBase = ManualBuildMixin(ToolMixin(DurableMixin(ServingVessel)));

// ⚠⚠ **Three verbs, and all three are a POT's.** `cure`, `dry`, `smoke`
// and `butcher` lived here for one build, which handed a saucepan the
// power to take a hog apart and stopped this class's name from predicting
// its own surface. That is the `wash`-on-`UnboundedReceptacle` mistake —
// *an urn is not a degraded basin* — and each of those verbs now sits on
// the station that actually performs it: `ButcherBlock`, `SaltingTrough`,
// `DryingRack`, `SmokeChimney`.
const HEARTH = [
  'platform/cmd/crafting/heat.yaml',
  'trade/cooking/cmd/crafting/cook.yaml',
  'trade/cooking/cmd/crafting/plate.yaml',
];

export default class CookPot extends CookPotBase {
  /**
   * ⭐ The verbs the pot performs, named once, here. `pour` and `stir`
   * are NOT among them — a pot is a `ManualBuild` vessel, and the build
   * buffer is what banks and works a step-by-step build, so those two
   * come from `ManualBuildMixin`'s own static. Reachable heat + a pot IS
   * a kitchen.
   */
  static commandContributions: CommandContributions = {
    environment: HEARTH,
    peers: HEARTH,
  };

  /** The defining capability default — authored seeds may extend it. */
  public override capabilities: string[] = ['pot'];
}
