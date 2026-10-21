/**
 * TakesFishMixin — ⭐ **a tool that takes a fish itself, there and then**
 * (underwater review): a fish spear in the lit band. `fish` is the one
 * verb for taking fish; a rod answers it with a cast and a wait (the
 * `FishingEngagement`), and a tool composing this answers it with its own
 * act — the thing decides what fishing with it means (⛔ never a second
 * verb named for the tool).
 *
 * A **protocol mixin** (the `Pullable` rule): no shared state, but a name
 * (`TAKES_FISH_MIXIN`) the controller narrows on and Studio shows. The
 * default comes back empty; each host overrides `takeFishBy`.
 *
 * **IS for:** a tool you fish with by striking — a spear, a gig, a gaff.
 * **IS NOT for:** a rod (the cast-and-wait rig, `Rod`), a pot or a net
 * (laid and pulled — `Trap`), or hunting an animal that is there to see
 * (that is a fight).
 */

import type { MixinConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

/** The mixin's registered name — what `FishController` narrows on. */
export const TAKES_FISH_MIXIN = 'TakesFishMixin';

/** What one try came to, in the tool's own words. */
export type TakeFishOutcome = { ok: true; line: string } | { ok: false; reason: string; line: string };

/** The protocol: a tool you fish with by striking, not by waiting. */
export interface TakesFish {
  takeFishBy(actor: Stuff): Promise<TakeFishOutcome>;
}

export function TakesFishMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class TakesFishMixin extends Base implements TakesFish {
    static _mixinName = TAKES_FISH_MIXIN;

    static _mixinRefusal = "{} isn't something you fish with by striking";

    /** @hook Override on the host: one strike at what the water holds. */
    public async takeFishBy(actor: Stuff): Promise<TakeFishOutcome> {
      void actor;
      return { ok: false, reason: 'nothing-near', line: 'Nothing comes within reach.' };
    }
  };
}
