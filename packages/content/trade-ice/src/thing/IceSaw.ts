/**
 * IceSaw — the long one-handled saw a block is cut out of the ice with
 * (storage-and-ice D16, D19). ⭐ It affords the KERNEL `cut`: the ice
 * sheet plans the cut (`IceSheet.cutPlan`), the saw is what makes the verb
 * sayable on the ice. Its `ice-sawing` capability is what the sheet asks
 * of the tools in reach.
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const CUT = ['platform/cmd/crafting/cut.yaml'];

export default class IceSaw extends Tool {
  static commandContributions: CommandContributions = {
    environment: CUT,
    peers: CUT,
  };
}
