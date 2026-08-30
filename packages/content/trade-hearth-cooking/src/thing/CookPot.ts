/**
 * CookPot — the cooking branch's build vessel + tool: a pot that banks
 * step-by-step contributions ({@link ManualBuildMixin} — the shaker's role
 * at the hearth) and offers the `pot` capability recipes require. Itself
 * craftable (a smithing recipe output — `CraftedMixin`), durable, portable
 * capital (camp-stew in the wilds is the point: reachable heat + a pot is
 * a kitchen).
 *
 * Ships at `/trade/hearth-cooking/thing/CookPot` (the capability rung): a
 * class lives in the pack whose content is the only thing that names it,
 * and a cook pot is a kitchen tool. Nothing in the kernel refers to it —
 * `CraftingLogic` finds a pot because the ROW authors the `pot`
 * capability, never because it knows this class.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tooled';
import { ManualBuildMixin } from '@saxonberg/server/mud/lib/craft/ManualBuild';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const CookPotBase = CraftedMixin(
  ManualBuildMixin(ToolMixin(DurableMixin(DetailedMixin(Thing)))),
);

const HEARTH = [
  'platform/cmd/crafting/heat.yaml',
  'trade/hearth-cooking/cmd/crafting/cook.yaml',
  'trade/hearth-cooking/cmd/crafting/plate.yaml',
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
