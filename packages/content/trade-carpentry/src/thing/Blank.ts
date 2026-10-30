/**
 * Blank — a riven blank: a billet split down to a straight-grained piece
 * the size of the part it is going to be, and nothing yet.
 *
 * ⭐ **The blank makes `carve` sayable** (and so does the sawn `Board`). A
 * haft, a handle, a peg are carved out of riven wood with an edge, and the
 * verb that does it is this trade's — so the class that affords it must
 * be this trade's too: a kernel class may never name a pack's view
 * (`Timber` affords only the kernel's `fit`). A blank in your hands or at
 * your feet is an invitation to shape it; it is the best stock to carve
 * from, because a part keeps the grain it was carved from.
 *
 * ⚠ A Timber, and only a Timber: riven (the fibres run the whole length
 * unbroken, which is why a haft is riven and not sawn), seasoning at its
 * species' rate, stackable. Nothing about it is new substrate.
 *
 * ⚠⚠ The statics SHADOW down a base-class chain (mixins union, base
 * classes shadow), so `Timber`'s own `peers` — the kernel `fit` — is
 * spread back in here, or a blank would stop offering `fit` beside it.
 */

import Timber from '@saxonberg/server/mud/platform/thing/Timber';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { PatternStockMixin } from '../lib/PatternStock';

export default class Blank extends PatternStockMixin(Timber) {
  static commandContributions: CommandContributions = {
    // ⚠ `environment` is how a HELD thing grants a verb to its holder
    // (`self` is the thing's own verbs) — until the review pass a blank in
    // your hands afforded nothing, and only one at your feet did.
    environment: ['platform/cmd/crafting/carve.yaml'],
    peers: [
      'platform/cmd/crafting/carve.yaml',
      ...(Timber.commandContributions.peers ?? []),
    ],
  };
}
