/**
 * Board — a sawn board, through-sawn or quartered: what the saw makes and
 * the timber yard stacks.
 *
 * ⭐ Its own class to make `carve` sayable, as the riven `Blank` does: a
 * board is the joiner's stock too, and a part carved from it is SAWN —
 * weaker under a jar than one carved from riven wood, because the saw cut
 * the fibres (the grain rides the carve). Until the review pass on
 * carpentry only the blank afforded `carve`, so with a board and an edge
 * in hand the verb did not exist and that lesson was unreachable.
 *
 * A `Timber` in every other respect: it seasons, it stacks, and a
 * through-sawn board cups as it dries (`help the-cut`).
 *
 * ⚠⚠ The statics SHADOW down a base-class chain, so `Timber`'s own `peers`
 * (the kernel `fit`) is spread back in, as `Blank` does.
 */

import Timber from '@saxonberg/server/mud/platform/thing/Timber';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { PatternStockMixin } from '../lib/PatternStock';

export default class Board extends PatternStockMixin(Timber) {
  static commandContributions: CommandContributions = {
    // In your hands (`environment` — to the holder) or at your feet.
    environment: ['platform/cmd/crafting/carve.yaml'],
    peers: [
      'platform/cmd/crafting/carve.yaml',
      ...(Timber.commandContributions.peers ?? []),
    ],
  };
}
