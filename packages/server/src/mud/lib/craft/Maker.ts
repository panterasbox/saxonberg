/**
 * MakerMixin — a minimal role marker: "this agent can fulfill an order."
 *
 * The served path's `order` verb routes to a *present maker able to fulfill*
 * (the bartender). With crafting location-agnostic and no venue/staff roster,
 * the fulfilling maker is identified by an **agent property** — this marker —
 * not a place flag: `CraftingLogic` resolves the present `isMaker()` agent in
 * the patron's location. The maker is thus always an agent property, never a
 * value off the wire.
 *
 * Deliberately tiny — no behavior, no state. It is **not** used to gate
 * `serve`/`mix` (those are general agent verbs; maker = the giver); it is
 * only the order-fulfiller signal. Composed onto a maker NPC — see
 * `lib/character/Crafter.ts`.
 */

import type { MixinConstructor } from '../mixin';

export interface Maker {
  /** Whether this agent can fulfill orders. */
  isMaker(): boolean;
}

export function MakerMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class MakerMixin extends Base implements Maker {
    static _mixinName = 'MakerMixin';

    isMaker(): boolean {
      return true;
    }
  };
}
