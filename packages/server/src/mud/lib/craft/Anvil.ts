/**
 * Anvil — the smithing working surface: a `ToolItem` whose `anvil`
 * capability backs recipe `toolCapabilities`, and whose presence confers
 * the smithing verb surface (the Whetstone precedent: instruments carry
 * their working verbs; menus carry only commerce). A fixture by
 * encumbrance, not by flag — the seed's 60 kg sits past a normal biped's
 * strain ceiling — so the environment bucket is the one that matters in
 * practice; the inventory bucket rides along for whatever can heft it.
 */

import ToolItem from './ToolItem';
import type { CommandContributions } from '../../api/command';

export default class Anvil extends ToolItem {
  /** The defining capability default — authored seeds may extend it. */
  public override capabilities: string[] = ['anvil'];

  /**
   * The smithing surface: the by-hand steps (`hammer`/`quench` — `heat`
   * rides the furnace), the earned one-shot (`forge`), and the
   * maintenance tier (`repair`/`salvage`).
   */
  static commandContributions: CommandContributions = {
    self: [],
    environment: [
      'crafting/hammer.yaml',
      'crafting/quench.yaml',
      'crafting/forge.yaml',
      'crafting/repair.yaml',
      'crafting/salvage.yaml',
    ],
    inventory: [
      'crafting/hammer.yaml',
      'crafting/quench.yaml',
      'crafting/forge.yaml',
      'crafting/repair.yaml',
      'crafting/salvage.yaml',
    ],
    peers: [],
  };
}
