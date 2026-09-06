/**
 * HandledMixin — the **affordance half** of handling: an animal you can
 * put your hands on offers `handle`.
 *
 * The kernel owns the mechanism (`lib/husbandry/Handling` — the
 * quiet-to-wild band, the risk curve, the decay toward a floor) and it
 * cannot own the verb, because `handle` is `trade-ranching`'s and a
 * kernel mixin must not name a pack's command view. So the affordance
 * attaches on this side of the boundary, and this mixin is that and
 * nothing else.
 *
 * ⭐ **This is what a sheepdog and a milk cow actually share.** Not taps,
 * not a herd record, and not being something you butcher — but both are
 * animals whose temper is a fact you find out by putting your hands on
 * them, which is the whole of the act.
 *
 * ⚠ It does NOT compose `HandlingMixin` itself, deliberately. Nesting a
 * mixin factory inside another factory collapses TypeScript's inference
 * through the chain — this build already lost a day to that once — so
 * the two are composed side by side at the call site and this one stays
 * a pure carrier.
 */

import type { MixinConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

export const HANDLED_MIXIN = 'HandledMixin';

export function HandledMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class HandledMixin extends Base {
    /**
     * ⚠⚠ **Load-bearing, and its absence failed silently.** Affordances
     * are collected off the class's OWN static plus every registered
     * mixin in the chain (`MixinApi.queryMixins`), and a mixin is only
     * registered if it carries this marker. Without it the contribution
     * was still inherited — so `WorkingAnimal`, which declares no static
     * of its own, offered `handle` and looked fine — while `Livestock`,
     * which does declare one, SHADOWED it and silently lost the verb.
     * One of the two hosts working is exactly how this hides.
     */
    static _mixinName = HANDLED_MIXIN;

    static commandContributions: CommandContributions = {
      self: [],
      peers: ['trade/ranching/cmd/ranching/handle.yaml'],
      environment: [],
    };
  };
}
