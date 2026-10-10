/**
 * Blank — a riven blank: a billet split down to a straight-grained piece
 * the size of the part it is going to be, and nothing yet.
 *
 * ⭐ **The blank is what makes `carve` sayable.** A haft, a handle, a peg
 * are carved out of riven wood with an edge, and the verb that does it is
 * this trade's — so the class that affords it must be this trade's too:
 * a kernel class may never name a pack's view (`Timber` affords only the
 * kernel's `fit`). A blank in your hands or at your feet is an invitation
 * to shape it.
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

export default class Blank extends Timber {
  static commandContributions: CommandContributions = {
    self: ['trade/carpentry/cmd/carpentry/carve.yaml'],
    peers: [
      'trade/carpentry/cmd/carpentry/carve.yaml',
      ...(Timber.commandContributions.peers ?? []),
    ],
  };
}
