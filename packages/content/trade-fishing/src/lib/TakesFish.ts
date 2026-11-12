/**
 * TakesFishMixin — ⭐ **a tool you fish with** (underwater review;
 * controller-liquidity W12 made the rod a host): `fish` is the one verb
 * for taking fish, and the tool decides what fishing with it means — a
 * spear strikes there and then, a rod casts and waits (the
 * `FishingEngagement`). ⛔ Never a second verb named for the tool.
 *
 * A **protocol mixin** (the `Pullable` rule): no shared state, but a name
 * (`TAKES_FISH_MIXIN`) the controller narrows on and Studio shows. The
 * default comes back empty; each host overrides `takeFishBy`.
 *
 * **IS for:** a tool you fish with — a spear, a gig, a gaff, a rod.
 * **IS NOT for:** a pot or a net (laid and pulled — `Trap`), or hunting an
 * animal that is there to see (that is a fight).
 */

import type { MixinConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ActOutcome, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { EngagementStartedNote } from '@saxonberg/types';

/** The mixin's registered name — what `FishController` narrows on. */
export const TAKES_FISH_MIXIN = 'TakesFishMixin';

/**
 * What the angler brings to a try: the bait (anything — the fish decide
 * what to make of it) and the reach the verb resolved (a shore's named
 * water, else the Locality's). A tool that finds its own water (a spear,
 * down in it) may ignore the reach.
 */
export interface FishCast {
  bait: Stuff | null;
  reach: string | null;
}

/**
 * ⭐ Every reason a try at the fish refuses — the verb words each
 * (controller-liquidity W12: the tool answers facts, never prose).
 */
export type TakeFishRefusal = ActRefusal<
  | 'not-holding'
  | 'not-under'
  | 'no-water'
  | 'nothing-near'
  | 'missed'
  | 'not-engageable'
  | 'already-fishing'
  | 'no-record'
  | 'engagement-conflict'
  | 'start-rejected'
>;

/**
 * What one try came to: a fish struck and in hand (a spear), or a line
 * out and the wait begun (a rod — its engagement's dispatch note rides
 * along for the envelope).
 */
export type TakeFishDone =
  | { kind: 'struck'; fish: Stuff }
  | { kind: 'cast'; bait: Stuff | null; note: EngagementStartedNote | null };

export type TakeFishOutcome = ActOutcome<TakeFishDone> | TakeFishRefusal;

/** The protocol: a tool you fish with — it decides what fishing with it means. */
export interface TakesFish {
  takeFishBy(actor: Stuff, cast: FishCast): Promise<TakeFishOutcome>;
}

export function TakesFishMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class TakesFishMixin extends Base implements TakesFish {
    static _mixinName = TAKES_FISH_MIXIN;

    static _mixinRefusal = "{} isn't something you fish with";

    /** @hook Override on the host: one try at what the water holds. */
    public async takeFishBy(actor: Stuff, cast: FishCast): Promise<TakeFishOutcome> {
      void actor;
      void cast;
      return { ok: false, reason: 'nothing-near' };
    }
  };
}
