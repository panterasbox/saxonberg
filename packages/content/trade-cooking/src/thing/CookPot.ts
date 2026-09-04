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

// ⭐ The preserving acts ride the same affordance, and that is a claim
// about where the trade is practised rather than a shortcut: curing,
// drying and smoking are kitchen work — the salt, the meat and the fire
// are all here — and the CELLAR is where the result is kept, which is
// exactly the lesson the drying hurdle teaches. A bespoke salting tub or
// drying rack would confer the same three verbs in the same room; when
// somebody wants one, it authors this same list.
const HEARTH = [
  'platform/cmd/crafting/heat.yaml',
  'trade/cooking/cmd/crafting/cook.yaml',
  'trade/cooking/cmd/crafting/plate.yaml',
  'trade/cooking/cmd/crafting/cure.yaml',
  'trade/cooking/cmd/crafting/dry.yaml',
  'trade/cooking/cmd/crafting/smoke.yaml',
  // ⭐⭐ **`butcher` too, and the pot is the right carrier for a reason.**
  // The verb has to appear where the act is possible, and both candidates
  // that felt more natural are kernel classes a pack may not touch: a
  // `Corpse` cannot name a `trade/cooking` view, and neither can `Weapon`
  // (which would also confer butchering on a mace — the controller would
  // refuse, but *seeing a verb in your command set IS the affordance*).
  //
  // A pot is the cooking trade's own defining implement and it is
  // deliberately PORTABLE capital — "reachable heat + a pot is a kitchen"
  // is this class's own doc. So a hunter who carries one can dress a kill
  // in the field, and a hunter who does not carries the carcass home
  // instead, with the clock already running. That is the right pressure.
  //
  // ⚠ The alternative — a `ButcherBlock` fixture in the pack, standing in
  // the cookhouse — is a clean later addition and confers the same verb by
  // authoring the same list.
  'trade/cooking/cmd/crafting/butcher.yaml',
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
