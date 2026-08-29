/**
 * CookPot — the cooking branch's build vessel + tool: a pot that banks
 * step-by-step contributions ({@link ManualBuildMixin} — the shaker's role
 * at the hearth) and offers the `pot` capability recipes require. Itself
 * craftable (a smithing recipe output — `CraftedMixin`), durable, portable
 * capital (camp-stew in the wilds is the point: reachable heat + a pot is
 * a kitchen).
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { DurableMixin } from '../../lib/material/Durable';
import { ToolMixin } from '../../lib/craft/Tooled';
import { ManualBuildMixin } from '../../lib/craft/ManualBuild';
import { CraftedMixin } from '../../lib/craft/Crafted';
import type { CommandContributions } from '../../api/command';

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
