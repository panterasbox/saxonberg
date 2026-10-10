/**
 * Billet — a length of green wood split once or twice along its grain:
 * what a froe makes of a bole before it makes anything else.
 *
 * ⭐ **The billet is what makes `rive` sayable on it.** A billet is split
 * again into staves, blanks and laths, and the verb that does it is this
 * trade's — so the class that affords it is this trade's too: a kernel
 * class may never name a pack's view (`Timber` affords only the kernel's
 * `fit`). The bole affords riving the same way it affords felling.
 *
 * A Timber, and only a Timber: riven, seasoning at its species' rate,
 * stackable — eight billets off one length are one stack.
 *
 * ⚠⚠ The statics SHADOW down a base-class chain (mixins union, base
 * classes shadow), so `Timber`'s own `peers` — the kernel `fit` — is
 * spread back in here, or a billet would stop offering `fit` beside it.
 */

import Timber from '@saxonberg/server/mud/platform/thing/Timber';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

export default class Billet extends Timber {
  static commandContributions: CommandContributions = {
    self: ['trade/forestry/cmd/forestry/rive.yaml'],
    peers: [
      'trade/forestry/cmd/forestry/rive.yaml',
      ...(Timber.commandContributions.peers ?? []),
    ],
  };
}
