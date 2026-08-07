/**
 * IncorporealMixin — a body that is present but cannot touch anything.
 *
 * This is **function over form** expressed as a composable capability: the
 * platform half of a participant (chat, forums, voting, watching, being
 * seen and spoken to) is never severed by what happens to their body,
 * while the embodied half (taking, wearing, wielding, striking, crafting)
 * requires a body that can act on matter. A shade has the first and not
 * the second.
 *
 * The revocation is enforced one layer up, by the `requiresEmbodied`
 * command validator — so the surface a shade loses is *exactly* the set of
 * verbs tagged with it, visible in the YAML, greppable, and pinned by a
 * test. Nothing here reaches into containment or slots: a shade still
 * composes `Container` and `Slotted` and could hold something if some
 * future content hands it something a ghost can hold. The capability is
 * intact; only the verb is taken.
 *
 * `revocationReason` exists so the same lever re-skins. The deferred
 * prison work wants precisely this shape — a present participant with
 * embodied verbs revoked and a designed path back — and should reuse the
 * mixin with different prose rather than growing a second one.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';

export interface Incorporeal {
  /** Prose shown when an embodied verb is refused. */
  getRevocationReason(): string;
  setRevocationReason(value: string): void;
}

export function IncorporealMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class IncorporealMixin extends Base implements Incorporeal {
    static _mixinName = 'IncorporealMixin';

    /**
     * The way back is afforded by the state itself, so only something
     * that is actually incorporeal ever sees the verb — and so a player
     * with no body is never left without one available command.
     */
    static commandContributions: CommandContributions = {
      self: ['charactergen/passage.yaml'],
      peers: [],
      environment: [],
    };

    public revocationReason = 'Your hand passes through it.';

    public getRevocationReason(): string {
      return this.revocationReason;
    }

    public setRevocationReason(value: string): void {
      this.revocationReason = value;
    }
  }
  return IncorporealMixin;
}
