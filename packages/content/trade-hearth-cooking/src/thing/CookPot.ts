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

export default class CookPot extends CookPotBase {
  /**
   * The defining capability default — authored seeds extend it with
   * the verbs the pot confers (the cook-pot row names them: the
   * kitchen's `cook`/`plate`, the platform's `pour`/`stir`/`heat`).
   * Reachable heat + a pot IS a kitchen.
   */
  public override capabilities: string[] = ['pot'];
}
