/**
 * SewingKit — the soft-goods maintenance kit: a carried `ToolItem` whose
 * `mending` capability backs soft-goods repair (leather, textile — the
 * whetstone's structural cousin, the smith's forge for things that were
 * never metal), and whose presence confers the maintenance verbs (the
 * instrument-conferred model — see `Whetstone`, `Anvil`).
 */

import ToolItem from './ToolItem';
import type { CommandContributions } from '../../api/command';

export default class SewingKit extends ToolItem {
  /** The defining capability default — authored seeds may extend it. */
  public override capabilities: string[] = ['mending'];

  /** The maintenance tier: `repair` the torn, `salvage` the spent. */
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['crafting/repair.yaml', 'crafting/salvage.yaml'],
    inventory: ['crafting/repair.yaml', 'crafting/salvage.yaml'],
    peers: [],
  };
}
